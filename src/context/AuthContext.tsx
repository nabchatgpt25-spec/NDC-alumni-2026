import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  getOrCreateSupabaseProfile,
  mapSupabaseRowToAlumniProfile,
  isSuperAdminEmail,
} from '../lib/supabase-auth';
import { apiUrl } from '../lib/apiConfig';
import { AlumniProfile } from '../types';
import {
  DEFAULT_BLANK_USER,
  ALUMNI_PROFILES,
  saveStoredAlumniProfiles,
} from '../data/mockData';
import {
  registerUserVouchRequest,
  submitDocumentForAdminReview,
} from '../utils/verificationService';
import campusHeroImg from '../assets/images/ndc_campus_hero_1790233370828.jpg';

export function formatToE164Phone(raw: string): string {
  const cleaned = raw.trim();
  if (cleaned.startsWith('+')) {
    return cleaned.replace(/[^\d+]/g, '');
  }
  const digits = cleaned.replace(/\D/g, '');
  if (digits.startsWith('880')) {
    return `+${digits}`;
  }
  return `+880${digits.replace(/^0+/, '')}`;
}

interface PendingOtpEntry {
  otp: string;
  expiresAt: number;
}

interface AuthContextType {
  isLoggedIn: boolean;
  currentUser: AlumniProfile;
  firebaseToken: string | null;
  supabaseToken: string | null;
  isAdminUser: boolean;
  login: (phoneOrEmail: string, pass: string) => Promise<boolean>;
  loginWithPhoneOtp: (phone: string) => Promise<boolean>;
  verifyPhoneOtp: (phone: string, token: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => void;
  register: (profileData: Partial<AlumniProfile> & { password?: string }) => Promise<boolean>;
  updateProfile: (updated: Partial<AlumniProfile>) => void;
  deleteAccount: (confirmationPassword?: string) => Promise<boolean>;
  requestOtp: (phone: string) => Promise<{ success: boolean; emailSent?: boolean; debugOtp?: string }>;
  resetPasswordWithOtp: (phone: string, otp: string, newPass: string) => Promise<boolean>;
  getAuthHeaders: () => Promise<Record<string, string>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'ndc_alumni_auth';
const PROFILE_STORAGE_KEY = 'ndc_alumni_current_user';

// In-memory token reference (never persisted to localStorage per security guidelines)
let inMemorySupabaseToken: string | null = null;

function normalizePhoneDigits(phone?: string): string {
  if (!phone) return '';
  const digits = phone.replace(/[^0-9]/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const otpStoreRef = useRef<Map<string, PendingOtpEntry>>(new Map());
  const [supabaseToken, setSupabaseToken] = useState<string | null>(null);
  const [isAdminUser, setIsAdminUser] = useState<boolean>(false);

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      return stored === 'true';
    } catch {
      return false;
    }
  });

  const [currentUser, setCurrentUser] = useState<AlumniProfile>(() => {
    try {
      const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object' && parsed.id) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return DEFAULT_BLANK_USER;
  });

  // 1. Primary Production Auth: Listen to Supabase Auth state & sync alumni_profiles
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    // Check active Supabase session on startup
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        inMemorySupabaseToken = session.access_token;
        setSupabaseToken(session.access_token);
        try {
          const profile = await getOrCreateSupabaseProfile(session.user);
          if (profile) {
            setCurrentUser(profile);
            setIsAdminUser(profile.role === 'admin' || isSuperAdminEmail(profile.email));
            setIsLoggedIn(true);
          }
        } catch (err) {
          console.warn('Failed to load profile for Supabase session:', err);
        }
      }
    }).catch((err) => {
      console.warn('Supabase getSession warning:', err);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          inMemorySupabaseToken = session.access_token;
          setSupabaseToken(session.access_token);
          try {
            const profile = await getOrCreateSupabaseProfile(session.user);
            if (profile) {
              setCurrentUser(profile);
              setIsAdminUser(profile.role === 'admin' || isSuperAdminEmail(profile.email));
              setIsLoggedIn(true);
            }
          } catch (err) {
            console.warn('Failed to sync profile on Supabase auth change:', err);
          }
        } else if (event === 'SIGNED_OUT') {
          inMemorySupabaseToken = null;
          setSupabaseToken(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, String(isLoggedIn));
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(currentUser));
    } catch {
      // safe ignore
    }
  }, [isLoggedIn, currentUser]);

  useEffect(() => {
    const handleAdminUserUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<AlumniProfile>;
      if (customEvent.detail && customEvent.detail.id === currentUser.id) {
        setCurrentUser(customEvent.detail);
      }
    };
    window.addEventListener('ndc_current_user_updated', handleAdminUserUpdate);
    return () => window.removeEventListener('ndc_current_user_updated', handleAdminUserUpdate);
  }, [currentUser.id]);

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Primary: Use Supabase session JWT
    if (isSupabaseConfigured) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          inMemorySupabaseToken = session.access_token;
          headers.Authorization = `Bearer ${session.access_token}`;
          return headers;
        }
      } catch {}
    }
    if (inMemorySupabaseToken) {
      headers.Authorization = `Bearer ${inMemorySupabaseToken}`;
      return headers;
    }

    return headers;
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    // 1. Primary: Supabase Google OAuth
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
          },
        });
        if (error) {
          console.error('Supabase Google OAuth error:', error);
          throw error;
        }
        if (data?.url) {
          return true;
        }
      } catch (sbOAuthErr) {
        console.warn('Supabase Google OAuth error:', sbOAuthErr);
        throw sbOAuthErr;
      }
    }

    // 2. Fallback when Supabase is unconfigured (offline demo mode)
    const currentEmail = currentUser.email || 'nabchatgpt25@gmail.com';
    const currentName = currentUser.fullName && currentUser.fullName !== 'Guest Alumnus'
      ? currentUser.fullName
      : 'Nurul Anam Bashir';

    const googleProfile: AlumniProfile = {
      ...DEFAULT_BLANK_USER,
      id: Date.now(),
      userId: Math.floor(Math.random() * 10000) + 1000,
      fullName: currentName,
      email: currentEmail,
      avatarUrl: currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      verificationStatus: 'verified',
      verificationMethod: 'admin_verified',
      badges: ['Verified Alumnus'],
    };
    setCurrentUser(googleProfile);
    setIsAdminUser(currentEmail.includes('bashir') || currentEmail.includes('admin'));
    setIsLoggedIn(true);
    return true;
  };

  const login = async (phoneOrEmail: string, pass: string): Promise<boolean> => {
    if (!phoneOrEmail?.trim() || !pass) {
      throw new Error('Please enter your email or mobile number and password.');
    }

    if (!isSupabaseConfigured) {
      throw new Error('Supabase client is not configured. Please check environment variables.');
    }

    const cleanInput = phoneOrEmail.trim();
    const isEmail = cleanInput.includes('@');

    let authData: any = null;
    let authError: any = null;

    if (isEmail) {
      const cleanEmail = cleanInput.toLowerCase();
      const res = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: pass,
      });
      authData = res.data;
      authError = res.error;
    } else {
      const formattedPhone = formatToE164Phone(cleanInput);
      const res = await supabase.auth.signInWithPassword({
        phone: formattedPhone,
        password: pass,
      });
      authData = res.data;
      authError = res.error;
    }

    if (authError) {
      const msg = authError.message.toLowerCase();
      if (msg.includes('phone provider is disabled') || msg.includes('unsupported phone provider')) {
        throw new Error(
          'Phone provider is currently disabled in your Supabase project. To use Phone login, please enable the Phone Provider in Supabase Dashboard (Authentication > Providers > Phone) or sign in using your registered Email Address.'
        );
      }
      if (msg.includes('invalid login credentials') || msg.includes('invalid_credentials')) {
        throw new Error(
          isEmail
            ? 'Invalid email or password. Please verify your credentials or reset your password.'
            : 'Invalid phone or password. If your account was originally registered with an email address, please sign in using your email address, or verify your mobile number via SMS OTP.'
        );
      }
      if (msg.includes('email not confirmed')) {
        throw new Error('Your email address has not been confirmed yet. Please check your inbox or spam folder for the Supabase confirmation link.');
      }
      if (msg.includes('phone not confirmed')) {
        throw new Error('Your phone number has not been confirmed yet. Please verify your phone number via SMS code.');
      }
      throw new Error(authError.message || 'Login failed. Please check your credentials.');
    }

    if (!authData?.user) {
      throw new Error('Unable to authenticate with Supabase. Please check your credentials.');
    }

    if (authData.session?.access_token) {
      inMemorySupabaseToken = authData.session.access_token;
      setSupabaseToken(authData.session.access_token);
    }

    const profile = await getOrCreateSupabaseProfile(authData.user);
    if (profile) {
      setCurrentUser(profile);
      setIsAdminUser(profile.role === 'admin' || isSuperAdminEmail(profile.email));
      setIsLoggedIn(true);
      return true;
    }

    // Direct profile construction from authenticated user metadata if table query had transient delay
    const fallbackProfile: AlumniProfile = {
      id: Number(authData.user.id.replace(/[^0-9]/g, '').slice(0, 10)) || Date.now(),
      userId: Number(authData.user.id.replace(/[^0-9]/g, '').slice(0, 10)) || Date.now(),
      authUserId: authData.user.id,
      fullName:
        (authData.user.user_metadata as any)?.full_name ||
        (authData.user.user_metadata as any)?.name ||
        (isEmail ? cleanInput.split('@')[0] : cleanInput),
      avatarUrl: (authData.user.user_metadata as any)?.avatar_url || '/ndc-logo.png',
      batchYear: Number((authData.user.user_metadata as any)?.batch_year) || 68,
      academicStream: 'Science',
      academicGroup: null,
      section: 'Group 4',
      verificationStatus: 'unverified',
      vouchesCount: 0,
      vouchTargetCount: 2,
      profession: '',
      position: '',
      institution: '',
      specialty: [],
      degree: ['HSC'],
      city: 'Dhaka',
      country: 'Bangladesh',
      email: isEmail ? cleanInput.toLowerCase() : (authData.user.email || undefined),
      phone: !isEmail ? formatToE164Phone(cleanInput) : (authData.user.phone || undefined),
      role: isSuperAdminEmail(authData.user.email) ? 'admin' : 'member',
      isPublic: true,
      online: true,
      badges: [],
    };
    setCurrentUser(fallbackProfile);
    setIsAdminUser(fallbackProfile.role === 'admin');
    setIsLoggedIn(true);
    return true;
  };

  const loginWithPhoneOtp = async (phone: string): Promise<boolean> => {
    if (!phone?.trim()) {
      throw new Error('Please enter your mobile number.');
    }
    if (!isSupabaseConfigured) {
      throw new Error('Supabase client is not configured.');
    }

    const formattedPhone = formatToE164Phone(phone);
    const { error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('phone provider is disabled') || msg.includes('unsupported phone provider')) {
        throw new Error(
          'Supabase Phone Provider is not enabled. In Supabase Dashboard, go to Authentication > Providers > Phone and configure an SMS provider (e.g. Twilio, MessageBird, or Vonage). Alternatively, sign in using Email & Password.'
        );
      }
      if (msg.includes('rate limit')) {
        throw new Error('SMS verification rate limit reached. Please wait a few minutes before requesting another code.');
      }
      throw new Error(error.message);
    }

    return true;
  };

  const verifyPhoneOtp = async (phone: string, token: string): Promise<boolean> => {
    if (!phone?.trim() || !token?.trim()) {
      throw new Error('Please enter both your mobile number and the 6-digit SMS verification code.');
    }
    if (!isSupabaseConfigured) {
      throw new Error('Supabase client is not configured.');
    }

    const formattedPhone = formatToE164Phone(phone);
    const { data: authData, error: authError } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token: token.trim(),
      type: 'sms',
    });

    if (authError) {
      throw new Error(authError.message || 'Invalid or expired SMS code. Please try again.');
    }

    if (!authData?.user) {
      throw new Error('Unable to verify phone number.');
    }

    if (authData.session?.access_token) {
      inMemorySupabaseToken = authData.session.access_token;
      setSupabaseToken(authData.session.access_token);
    }

    const profile = await getOrCreateSupabaseProfile(authData.user, {
      phone: formattedPhone,
    });

    if (profile) {
      setCurrentUser(profile);
      setIsAdminUser(profile.role === 'admin' || isSuperAdminEmail(profile.email));
      setIsLoggedIn(true);
      return true;
    }

    const fallbackProfile: AlumniProfile = {
      id: Number(authData.user.id.replace(/[^0-9]/g, '').slice(0, 10)) || Date.now(),
      userId: Number(authData.user.id.replace(/[^0-9]/g, '').slice(0, 10)) || Date.now(),
      authUserId: authData.user.id,
      fullName: (authData.user.user_metadata as any)?.full_name || 'Notredamian Alumnus',
      avatarUrl: (authData.user.user_metadata as any)?.avatar_url || '/ndc-logo.png',
      batchYear: Number((authData.user.user_metadata as any)?.batch_year) || 68,
      academicStream: 'Science',
      academicGroup: null,
      section: 'Group 4',
      verificationStatus: 'unverified',
      vouchesCount: 0,
      vouchTargetCount: 2,
      profession: '',
      position: '',
      institution: '',
      specialty: [],
      degree: ['HSC'],
      city: 'Dhaka',
      country: 'Bangladesh',
      phone: formattedPhone,
      role: 'member',
      isPublic: true,
      online: true,
      badges: [],
    };
    setCurrentUser(fallbackProfile);
    setIsAdminUser(false);
    setIsLoggedIn(true);
    return true;
  };

  const logout = () => {
    setIsLoggedIn(false);
    inMemorySupabaseToken = null;
    setSupabaseToken(null);
    if (isSupabaseConfigured) {
      supabase.auth.signOut().catch(() => {});
    }
  };

  const register = async (profileData: Partial<AlumniProfile> & { password?: string }): Promise<boolean> => {
    const cleanEmail = (profileData.email || '').trim().toLowerCase();
    const cleanPhone = (profileData.phone || '').trim();
    const rawBatch = profileData.batchYear || 68;
    const normalizedBatch = rawBatch > 1900 ? rawBatch - 1950 : (rawBatch > 0 ? rawBatch : 68);

    if (!isSupabaseConfigured) {
      throw new Error('Supabase client is not configured.');
    }
    if (!cleanEmail || !profileData.password) {
      throw new Error('Please provide your email address and a password.');
    }

    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email: cleanEmail,
      password: profileData.password,
      options: {
        data: {
          full_name: profileData.fullName?.trim(),
          batch_year: normalizedBatch,
          phone: cleanPhone,
        },
      },
    });

    if (signUpErr) {
      const msg = signUpErr.message.toLowerCase();
      if (msg.includes('rate limit')) {
        throw new Error('Supabase email rate limit exceeded. If you are project admin, disable "Confirm email" in Supabase Authentication settings or use custom SMTP.');
      }
      if (msg.includes('already registered') || msg.includes('user already exists')) {
        throw new Error('An account with this email already exists. Please sign in directly.');
      }
      throw new Error(signUpErr.message || 'Registration failed.');
    }

    if (!signUpData?.user) {
      throw new Error('Failed to create account in Supabase. Please try again.');
    }

    if (signUpData.session?.access_token) {
      inMemorySupabaseToken = signUpData.session.access_token;
      setSupabaseToken(inMemorySupabaseToken);
    }

    // When session is active (or email auto-confirmed), sync profile row to Supabase
    if (signUpData.session) {
      const profile = await getOrCreateSupabaseProfile(signUpData.user, {
        ...profileData,
        email: cleanEmail,
        phone: cleanPhone,
        batchYear: normalizedBatch,
      });

      if (profile) {
        setCurrentUser(profile);
        setIsAdminUser(profile.role === 'admin' || isSuperAdminEmail(profile.email));
        setIsLoggedIn(true);
        return true;
      }
    }

    return true;
  };

  const updateProfile = async (updated: Partial<AlumniProfile>) => {
    setCurrentUser((prev) => ({ ...prev, ...updated }));
    if (isSupabaseConfigured && currentUser.authUserId) {
      try {
        await supabase
          .from('alumni_profiles')
          .update({
            full_name: updated.fullName,
            avatar_url: updated.avatarUrl,
            cover_url: updated.coverUrl,
            profession: updated.profession,
            position: updated.position,
            institution: updated.institution,
            city: updated.city,
            country: updated.country,
            bio: updated.bio,
            phone: updated.phone,
            whatsapp: updated.whatsapp,
            fb_link: updated.fbLink,
          })
          .eq('auth_user_id', currentUser.authUserId);
      } catch (err) {
        console.warn('Supabase profile update warning:', err);
      }
    }
  };

  const deleteAccount = async (): Promise<boolean> => {
    if (isSupabaseConfigured && currentUser.authUserId) {
      try {
        await supabase
          .from('alumni_profiles')
          .delete()
          .eq('auth_user_id', currentUser.authUserId);
      } catch (err) {
        console.warn('Supabase delete profile warning:', err);
      }
      try {
        await supabase.auth.signOut();
      } catch {}
    }

    inMemorySupabaseToken = null;
    setSupabaseToken(null);
    setCurrentUser(DEFAULT_BLANK_USER);
    setIsAdminUser(false);
    setIsLoggedIn(false);
    return true;
  };

  const requestOtp = async (phoneOrEmail: string) => {
    const clean = phoneOrEmail.trim().toLowerCase();
    if (clean.includes('@')) {
      const { error } = await supabase.auth.resetPasswordForEmail(clean, {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/#reset-password` : undefined,
      });
      if (error) {
        throw new Error(error.message);
      }
      return { success: true, emailSent: true };
    }
    const key = normalizePhoneDigits(phoneOrEmail);
    if (key.length < 6) {
      throw new Error('Please enter your registered email address or mobile number.');
    }
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStoreRef.current.set(key, {
      otp: generatedOtp,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
    return { success: true, debugOtp: generatedOtp };
  };

  const resetPasswordWithOtp = async (phoneOrEmail: string, otp: string, newPass: string) => {
    if (!newPass || newPass.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }
    const clean = phoneOrEmail.trim().toLowerCase();
    if (clean.includes('@')) {
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) throw new Error(error.message);
      return true;
    }
    const key = normalizePhoneDigits(phoneOrEmail);
    const entry = otpStoreRef.current.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      throw new Error('OTP has expired or was not requested. Please request a new OTP.');
    }
    if (entry.otp !== otp.trim()) {
      throw new Error('Invalid OTP code. Please check the 6-digit code and try again.');
    }
    otpStoreRef.current.delete(key);
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        currentUser,
        firebaseToken: null,
        supabaseToken,
        isAdminUser,
        login,
        loginWithPhoneOtp,
        verifyPhoneOtp,
        loginWithGoogle,
        logout,
        register,
        updateProfile,
        deleteAccount,
        requestOtp,
        resetPasswordWithOtp,
        getAuthHeaders,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
