import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  getOrCreateSupabaseProfile,
  mapSupabaseRowToAlumniProfile,
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
import { formatToE164Phone, normalizePhoneNumber } from '../utils/phone';

export { formatToE164Phone, normalizePhoneNumber };

interface PendingOtpEntry {
  otp: string;
  expiresAt: number;
}

interface AuthContextType {
  isAuthInitializing: boolean;
  authInitializationError: string | null;
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
  requestPasswordReset: (email: string) => Promise<{ success: boolean }>;
  completePasswordRecovery: (newPassword: string) => Promise<boolean>;
  getAuthHeaders: () => Promise<Record<string, string>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);


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

  const [isAuthInitializing, setIsAuthInitializing] = useState(true);
  const [authInitializationError, setAuthInitializationError] = useState<string | null>(null);
  const authResolutionIdRef = useRef(0);
  const resolvedAuthUserIdRef = useRef<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [currentUser, setCurrentUser] = useState<AlumniProfile>(DEFAULT_BLANK_USER);

  // Restore only the Supabase session; profile errors remain distinct from signed-out state.
  useEffect(() => {
    let active = true;
    let authEventReceived = false;

    const applySession = async (session: Session | null, requestId: number) => {
      if (!active || requestId !== authResolutionIdRef.current) return;

      if (!session?.user) {
        resolvedAuthUserIdRef.current = null;
        inMemorySupabaseToken = null;
        setSupabaseToken(null);
        setIsAdminUser(false);
        setCurrentUser(DEFAULT_BLANK_USER);
        setIsLoggedIn(false);
        setAuthInitializationError(null);
        setIsAuthInitializing(false);
        return;
      }

      if (resolvedAuthUserIdRef.current !== session.user.id) {
        resolvedAuthUserIdRef.current = null;
        setIsAdminUser(false);
        setCurrentUser(DEFAULT_BLANK_USER);
        setIsLoggedIn(false);
      }

      inMemorySupabaseToken = session.access_token;
      setSupabaseToken(session.access_token);
      setAuthInitializationError(null);

      try {
        const profile = await getOrCreateSupabaseProfile(session.user);
        if (!active || requestId !== authResolutionIdRef.current) return;
        if (!profile) {
          throw new Error('The authenticated alumni profile could not be loaded.');
        }

        resolvedAuthUserIdRef.current = session.user.id;
        setCurrentUser(profile);
        setIsAdminUser(profile.role === 'admin');
        setIsLoggedIn(true);
      } catch (err) {
        if (!active || requestId !== authResolutionIdRef.current) return;
        console.warn('Failed to load profile for Supabase session:', err);
        setAuthInitializationError(
          'Your Supabase session is still active, but your alumni profile could not be loaded. Refresh this page to retry.'
        );
        // Keep an already-resolved session active; an initial profile error is not a logout.
      } finally {
        if (active && requestId === authResolutionIdRef.current) {
          setIsAuthInitializing(false);
        }
      }
    };

    if (!isSupabaseConfigured) {
      setIsLoggedIn(false);
      setIsAdminUser(false);
      setSupabaseToken(null);
      setAuthInitializationError(null);
      setIsAuthInitializing(false);
      return () => {
        active = false;
        authResolutionIdRef.current += 1;
      };
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventReceived = true;
      const requestId = ++authResolutionIdRef.current;
      // Supabase Auth callbacks must return before profile queries run.
      window.setTimeout(() => {
        void applySession(session, requestId);
      }, 0);
    });

    void supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (authEventReceived) return;
        if (error) throw error;
        const requestId = ++authResolutionIdRef.current;
        void applySession(session, requestId);
      })
      .catch((err) => {
        if (!active || authEventReceived) return;
        console.warn('Supabase getSession warning:', err);
        setAuthInitializationError(
          'Your Supabase session could not be restored. Refresh this page to retry.'
        );
        setIsAuthInitializing(false);
      });

    return () => {
      active = false;
      authResolutionIdRef.current += 1;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    try {
    } catch {
      // safe ignore
    }
  }, [currentUser]);

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

    const anonKey = (import.meta.env?.VITE_SUPABASE_ANON_KEY || '').trim();
    if (anonKey) {
      headers.apikey = anonKey;
    }

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

    if (anonKey && !headers.Authorization) {
      headers.Authorization = `Bearer ${anonKey}`;
    }

    return headers;
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase client is not configured.');
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    });
    if (error) {
      throw new Error(error.message || 'Google sign-in could not be started.');
    }
    return Boolean(data?.url);
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
      const norm = normalizePhoneNumber(cleanInput);
      if (!norm.isValid) {
        throw new Error(
          norm.error || 'Please enter a valid mobile number (e.g. 017xxxxxxxx or +8801xxxxxxxx).'
        );
      }
      const formattedPhone = norm.formatted;

      // Invoke Supabase Edge Function 'unified-phone-login' exclusively
      const { data: edgeData, error: edgeErr } = await supabase.functions.invoke('unified-phone-login', {
        body: { identifier: formattedPhone, password: pass },
      });

      if (edgeErr) {
        let parsedErr = '';
        try {
          if (edgeErr.context && typeof edgeErr.context.json === 'function') {
            const j = await edgeErr.context.json();
            if (j?.error) parsedErr = j.error;
            else if (j?.message) parsedErr = j.message;
          }
        } catch {}

        if (!parsedErr) {
          const contextMsg = (edgeErr as any)?.context?.message || edgeErr.message || '';
          parsedErr = contextMsg;
        }

        if (parsedErr.includes('Failed to send a request') || parsedErr.includes('FunctionsFetchError')) {
          throw new Error(
            'Unable to connect to authentication service. Please check your internet connection or sign in using your registered email address.'
          );
        }

        throw new Error(parsedErr || 'Invalid mobile number or incorrect password.');
      }

      if (edgeData?.error) {
        throw new Error(edgeData.error);
      }

      if (!edgeData?.session?.access_token || !edgeData?.session?.refresh_token) {
        throw new Error('Invalid authentication response. Please check your credentials.');
      }

      const { data: sessionData, error: sessionErr } = await supabase.auth.setSession({
        access_token: edgeData.session.access_token,
        refresh_token: edgeData.session.refresh_token,
      });

      if (sessionErr) {
        throw new Error(sessionErr.message || 'Failed to establish authenticated session.');
      }

      if (sessionData?.user) {
        authData = sessionData;
      } else {
        authData = {
          user: edgeData.session.user,
          session: edgeData.session,
        };
      }
    }

    if (authError) {
      const msg = authError.message.toLowerCase();
      if (msg.includes('invalid login credentials') || msg.includes('invalid_credentials')) {
        throw new Error('Invalid email or password. Please verify your credentials or reset your password.');
      }
      if (msg.includes('email not confirmed')) {
        throw new Error('Your email address has not been confirmed yet. Please check your inbox or spam folder for the Supabase confirmation link.');
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
      setIsAdminUser(profile.role === 'admin');
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

  const loginWithPhoneOtp = async (phone: string): Promise<boolean> => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase client is not configured.');
    }
    const norm = normalizePhoneNumber(phone);
    if (!norm.isValid) {
      throw new Error(norm.error || 'Please enter a valid mobile number (e.g. 017xxxxxxxx).');
    }
    const { error } = await supabase.auth.signInWithOtp({
      phone: norm.formatted,
    });
    if (error) {
      throw new Error(error.message || 'Failed to send verification SMS.');
    }
    return true;
  };

  const verifyPhoneOtp = async (phone: string, token: string): Promise<boolean> => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase client is not configured.');
    }
    const norm = normalizePhoneNumber(phone);
    if (!norm.isValid) {
      throw new Error(norm.error || 'Please enter a valid mobile number (e.g. 017xxxxxxxx).');
    }
    const { data, error } = await supabase.auth.verifyOtp({
      phone: norm.formatted,
      token: token.trim(),
      type: 'sms',
    });
    if (error) {
      throw new Error(error.message || 'Invalid or expired SMS verification code.');
    }
    if (data.user) {
      const profile = await getOrCreateSupabaseProfile(data.user);
      if (profile) {
        setCurrentUser(profile);
        setIsAdminUser(profile.role === 'admin');
        setIsLoggedIn(true);
      }
    }
    return true;
  };

  const logout = () => {
    authResolutionIdRef.current += 1;
    resolvedAuthUserIdRef.current = null;
    setAuthInitializationError(null);
    setIsAdminUser(false);
    setCurrentUser(DEFAULT_BLANK_USER);
    setIsLoggedIn(false);
    inMemorySupabaseToken = null;
    setSupabaseToken(null);
    if (isSupabaseConfigured) {
      supabase.auth.signOut().catch(() => {});
    }
  };

  const register = async (profileData: Partial<AlumniProfile> & { password?: string }): Promise<boolean> => {
    const cleanEmail = (profileData.email || '').trim().toLowerCase();
    const rawPhone = (profileData.phone || '').trim();
    const rawBatch = profileData.batchYear || 68;
    const normalizedBatch = rawBatch > 1900 ? rawBatch - 1950 : (rawBatch > 0 ? rawBatch : 68);

    if (!isSupabaseConfigured) {
      throw new Error('Supabase client is not configured.');
    }
    if (!cleanEmail || !profileData.password) {
      throw new Error('Please provide your email address and a password.');
    }

    let cleanPhone = '';
    if (rawPhone) {
      const norm = normalizePhoneNumber(rawPhone);
      if (!norm.isValid) {
        throw new Error(
          norm.error || 'Please enter a valid mobile number (e.g. 017xxxxxxxx or +8801xxxxxxxx).'
        );
      }
      cleanPhone = norm.formatted;

    }

    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email: cleanEmail,
      password: profileData.password,
      options: {
        data: {
          full_name: profileData.fullName?.trim(),
          batch_year: normalizedBatch,
          phone: cleanPhone || undefined,
        },
      },
    });

    if (signUpErr) {
      const msg = signUpErr.message.toLowerCase();
      if (msg.includes('rate limit')) {
        throw new Error('Supabase email rate limit reached. Please wait a moment before trying again.');
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
        phone: cleanPhone || undefined,
        batchYear: normalizedBatch,
      });

      if (profile) {
        setCurrentUser(profile);
        setIsAdminUser(profile.role === 'admin');
        setIsLoggedIn(true);
        return true;
      }
    }

    return true;
  };

  const updateProfile = async (updated: Partial<AlumniProfile>) => {
    let cleanPhone = updated.phone;
    if (cleanPhone) {
      const norm = normalizePhoneNumber(cleanPhone);
      if (norm.isValid) {
        cleanPhone = norm.formatted;
      }
    }

    setCurrentUser((prev) => ({ ...prev, ...updated, phone: cleanPhone ?? prev.phone }));
    if (isSupabaseConfigured && currentUser.authUserId) {
      try {
        const updatePayload: Record<string, any> = {
          full_name: updated.fullName,
          avatar_url: updated.avatarUrl,
          cover_url: updated.coverUrl,
          profession: updated.profession,
          position: updated.position,
          institution: updated.institution,
          city: updated.city,
          country: updated.country,
          bio: updated.bio,
          whatsapp: updated.whatsapp,
          fb_link: updated.fbLink,
        };

        if (cleanPhone !== undefined) {
          updatePayload.phone = cleanPhone;
          // Protect against identifier hijacking: changing phone clears verification
          updatePayload.phone_ownership_verified = false;
        }

        const { error: updateErr } = await supabase
          .from('alumni_profiles')
          .update(updatePayload)
          .eq('auth_user_id', currentUser.authUserId);

        if (updateErr) {
          if (updateErr.message.toLowerCase().includes('unique') || updateErr.message.toLowerCase().includes('phone')) {
            throw new Error('This mobile number is already registered to another alumni account.');
          }
          console.warn('Supabase profile update warning:', updateErr);
        }
      } catch (err) {
        console.warn('Supabase profile update warning:', err);
        throw err;
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

    authResolutionIdRef.current += 1;
    resolvedAuthUserIdRef.current = null;
    inMemorySupabaseToken = null;
    setSupabaseToken(null);
    setCurrentUser(DEFAULT_BLANK_USER);
    setIsAdminUser(false);
    setAuthInitializationError(null);
    setIsLoggedIn(false);
    return true;
  };

  const requestPasswordReset = async (email: string): Promise<{ success: boolean }> => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase client is not configured.');
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Enter the email address associated with your account.');
    }

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/?recovery=1` : undefined,
    });
    if (error) {
      throw new Error(error.message || 'Unable to request a password reset.');
    }
    return { success: true };
  };

  const completePasswordRecovery = async (newPassword: string): Promise<boolean> => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase client is not configured.');
    }
    if (!newPassword || newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      throw new Error('Open the password reset link from your registered email before choosing a new password.');
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      throw new Error(error.message || 'Password reset failed.');
    }
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthInitializing,
        authInitializationError,
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
        requestPasswordReset,
        completePasswordRecovery,
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
