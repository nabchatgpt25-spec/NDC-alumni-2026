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

interface RegisteredAccount {
  identifier: string;
  password?: string;
  profile: AlumniProfile;
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
  loginWithGoogle: () => Promise<boolean>;
  logout: () => void;
  register: (profileData: Partial<AlumniProfile> & { password?: string }) => Promise<boolean>;
  updateProfile: (updated: Partial<AlumniProfile>) => void;
  deleteAccount: (confirmationPassword?: string) => Promise<boolean>;
  requestOtp: (phone: string) => Promise<{ success: boolean; debugOtp?: string }>;
  resetPasswordWithOtp: (phone: string, otp: string, newPass: string) => Promise<boolean>;
  getAuthHeaders: () => Promise<Record<string, string>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'ndc_alumni_auth';
const PROFILE_STORAGE_KEY = 'ndc_alumni_current_user';
const ACCOUNTS_STORAGE_KEY = 'ndc_registered_accounts';
const PASSWORD_SALT = 'ndc_dhaka_1949_salt_v1:';

// In-memory token reference (never persisted to localStorage per security guidelines)
let inMemorySupabaseToken: string | null = null;

async function hashPassword(rawPassword: string): Promise<string> {
  if (!rawPassword) return '';
  if (rawPassword.startsWith('sha256:')) return rawPassword;
  try {
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(PASSWORD_SALT + rawPassword);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      return `sha256:${hashHex}`;
    }
  } catch {
    // Fallback deterministic hash if Web Crypto is unavailable
  }
  let h = 2166136261;
  const salted = PASSWORD_SALT + rawPassword;
  for (let i = 0; i < salted.length; i++) {
    h ^= salted.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `sha256:fnv_${(h >>> 0).toString(16)}`;
}

async function verifyPassword(storedPassword: string | undefined, inputPassword: string): Promise<boolean> {
  if (!storedPassword) return true;
  if (storedPassword.startsWith('sha256:')) {
    const hashedInput = await hashPassword(inputPassword);
    return storedPassword === hashedInput;
  }
  return storedPassword === inputPassword;
}

function normalizePhoneDigits(phone?: string): string {
  if (!phone) return '';
  const digits = phone.replace(/[^0-9]/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

function isPhoneMatch(phoneA?: string, inputId?: string): boolean {
  if (!phoneA || !inputId) return false;
  const digitsA = normalizePhoneDigits(phoneA);
  const digitsB = normalizePhoneDigits(inputId);
  if (digitsA.length < 6 || digitsB.length < 6) return false;
  return digitsA === digitsB || phoneA.replace(/[^0-9]/g, '').endsWith(digitsB);
}

const loadAccounts = (): RegisteredAccount[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
};

const saveAccounts = (accounts: RegisteredAccount[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  } catch {}
};

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
      throw new Error('Please enter your email and password.');
    }

    const cleanId = phoneOrEmail.trim().toLowerCase();

    if (!cleanId.includes('@')) {
      throw new Error('Please sign in using your registered email address (e.g. name@example.com).');
    }

    if (!isSupabaseConfigured) {
      throw new Error('Supabase client is not configured. Please check environment variables.');
    }

    // Direct Supabase Auth login from the browser (works across all hosting platforms, including static cPanel)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: cleanId,
      password: pass,
    });

    if (authError) {
      const msg = authError.message.toLowerCase();
      if (msg.includes('invalid login credentials')) {
        throw new Error('Invalid email or password. Please verify your credentials and try again.');
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
        cleanId.split('@')[0],
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
      email: cleanId,
      role: isSuperAdminEmail(cleanId) ? 'admin' : 'member',
      badges: [],
    };
    setCurrentUser(fallbackProfile);
    setIsAdminUser(fallbackProfile.role === 'admin');
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
    const hscYear = rawBatch > 1900 ? rawBatch : 1950 + rawBatch;
    const computedSession = `${hscYear - 2}-${String(hscYear).slice(-2)}`;
    const verificationStatus = profileData.verificationStatus || 'pending_vouch';

    let registeredProfile: AlumniProfile | null = null;
    let authUserUid: string | null = null;

    // 1. Primary: Register in Supabase Auth & create alumni_profiles record
    if (isSupabaseConfigured && cleanEmail && profileData.password) {
      try {
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: cleanEmail,
          password: profileData.password,
          options: {
            data: {
              full_name: profileData.fullName?.trim(),
              batch_year: rawBatch,
              phone: cleanPhone,
            },
          },
        });

        if (!signUpErr && signUpData.user) {
          authUserUid = signUpData.user.id;
          if (signUpData.session?.access_token) {
            inMemorySupabaseToken = signUpData.session.access_token;
            setSupabaseToken(inMemorySupabaseToken);
          }
          const profile = await getOrCreateSupabaseProfile(signUpData.user, profileData);
          if (profile) {
            registeredProfile = profile;
          }
        }
      } catch (sbRegisterErr) {
        console.warn('Supabase registration attempt failed, continuing with backend sync:', sbRegisterErr);
      }
    }

    // 2. Register account and credentials on backend (persists into alumni_profiles with service_role and auto-confirms email)
    try {
      const registerRes = await fetch(apiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userUid: authUserUid,
          fullName: profileData.fullName?.trim(),
          avatarUrl: profileData.avatarUrl,
          coverUrl: campusHeroImg,
          batchYear: rawBatch,
          session: profileData.session || computedSession,
          collegeRoll: profileData.collegeRoll ?? '',
          academicStream:
            profileData.group === 'Humanities' || profileData.group === 'Business Studies'
              ? profileData.group
              : 'Science',
          academicGroup: profileData.group === 'Science' ? null : (profileData.academicGroup || null),
          section: profileData.section || 'Group 4',
          profession: profileData.profession ?? '',
          position: profileData.position ?? '',
          institution: profileData.institution ?? '',
          specialty: profileData.specialty ?? [],
          degree: profileData.degree ?? ['HSC'],
          city: profileData.city ?? 'Dhaka',
          country: profileData.country ?? 'Bangladesh',
          phone: cleanPhone,
          whatsapp: profileData.whatsapp ?? '',
          email: cleanEmail,
          password: profileData.password,
          bloodGroup: profileData.bloodGroup,
          isRegisteredDonor: Boolean((profileData as any).isRegisteredDonor || profileData.bloodDonorProfile?.isRegisteredDonor),
        }),
      });

      const registerData = await registerRes.json();
      if (!registerRes.ok && !registeredProfile) {
        throw new Error(registerData.error || 'Registration failed. Please check your information and try again.');
      }

      if (registerData.session?.access_token) {
        inMemorySupabaseToken = registerData.session.access_token;
        setSupabaseToken(registerData.session.access_token);
      }

      if (registerData.profile) {
        registeredProfile = registerData.profile;
      }
    } catch (err: any) {
      if (err.message && (err.message.includes('already registered') || err.message.includes('Password') || err.message.includes('Please'))) {
        throw err;
      }
      console.warn('Backend registration failed, proceeding with local fallback:', err);
    }

    // 2. Build profile object if server didn't return one
    const newProfile: AlumniProfile = registeredProfile || {
      id: Date.now(),
      userId: Math.floor(Math.random() * 10000) + 1000,
      fullName: (profileData.fullName || 'Notredamian Alumnus').trim(),
      avatarUrl: profileData.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
      coverUrl: campusHeroImg,
      batchYear: rawBatch,
      session: profileData.session || computedSession,
      collegeRoll: profileData.collegeRoll ?? '',
      group: profileData.group || 'Science',
      section: profileData.section || 'Group 4',
      verificationStatus: verificationStatus,
      verificationMethod: profileData.verificationMethod || 'two_vouches',
      verifiedBy: profileData.verifiedBy || [],
      vouchesCount: profileData.vouchesCount ?? 0,
      vouchTargetCount: 2,
      idProofUrl: profileData.idProofUrl,
      idDocType: profileData.idDocType || (profileData.idProofUrl ? 'id_card' : undefined),
      idSubmissionStatus: profileData.idProofUrl ? 'pending' : undefined,
      verificationDate: verificationStatus === 'verified' ? 'Today' : undefined,
      profession: profileData.profession ?? '',
      position: profileData.position ?? '',
      institution: profileData.institution ?? '',
      cadre: profileData.cadre ?? '',
      specialty: profileData.specialty ?? [],
      degree: profileData.degree ?? [],
      city: profileData.city ?? '',
      country: profileData.country ?? '',
      whatsapp: profileData.whatsapp ?? '',
      fbLink: profileData.fbLink ?? '',
      phone: cleanPhone,
      email: cleanEmail,
      bio: profileData.bio ?? '',
      careerHistory: profileData.careerHistory ?? [],
      isPublic: true,
      online: true,
      postsCount: 0,
      badges: profileData.badges ?? [],
    };

    registerUserVouchRequest(newProfile);

    if (newProfile.idProofUrl) {
      submitDocumentForAdminReview(
        newProfile,
        newProfile.idDocType || 'id_card',
        newProfile.idProofUrl
      );
    }

    setCurrentUser(newProfile);
    ALUMNI_PROFILES.unshift(newProfile);
    saveStoredAlumniProfiles(ALUMNI_PROFILES);

    const accounts = loadAccounts();
    const hashedPassword = profileData.password ? await hashPassword(profileData.password) : undefined;
    accounts.push({
      identifier: cleanPhone || cleanEmail || newProfile.fullName,
      password: hashedPassword,
      profile: newProfile,
    });
    saveAccounts(accounts);

    setIsLoggedIn(true);
    return true;
  };

  const updateProfile = (updated: Partial<AlumniProfile>) => {
    setCurrentUser((prev) => {
      const next = { ...prev, ...updated };
      const idx = ALUMNI_PROFILES.findIndex((p) => p.id === next.id);
      if (idx > -1) {
        ALUMNI_PROFILES[idx] = next;
      } else {
        ALUMNI_PROFILES.unshift(next);
      }
      saveStoredAlumniProfiles(ALUMNI_PROFILES);

      const accounts = loadAccounts();
      const accIdx = accounts.findIndex((a) => a.profile.id === next.id);
      if (accIdx > -1) {
        accounts[accIdx].profile = next;
        saveAccounts(accounts);
      }

      return next;
    });
  };

  const deleteAccount = async (confirmationPassword?: string): Promise<boolean> => {
    const deletingId = currentUser.id;
    const cleanPhone = (currentUser.phone || '').trim();
    const cleanEmail = (currentUser.email || '').trim().toLowerCase();

    // 1. Call server-side deletion endpoint
    try {
      const res = await fetch(apiUrl('/api/auth/delete-account'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: deletingId,
          password: confirmationPassword,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          throw new Error(data.error || 'Incorrect password confirmation.');
        }
      }
    } catch (err: any) {
      if (err.message && err.message.includes('password')) {
        throw err;
      }
      console.warn('Backend delete-account warning:', err);
    }

    // 2. Remove from in-memory ALUMNI_PROFILES and save to localStorage
    const pIdx = ALUMNI_PROFILES.findIndex((p) => p.id === deletingId);
    if (pIdx > -1) {
      ALUMNI_PROFILES.splice(pIdx, 1);
    }
    saveStoredAlumniProfiles(ALUMNI_PROFILES);

    // 3. Remove from registered accounts
    const accounts = loadAccounts();
    const filteredAccounts = accounts.filter(
      (a) =>
        a.profile.id !== deletingId &&
        (!cleanPhone || !isPhoneMatch(a.profile.phone, cleanPhone)) &&
        (!cleanEmail || (a.profile.email && a.profile.email.toLowerCase() !== cleanEmail))
    );
    saveAccounts(filteredAccounts);

    // 4. Remove from blood donors registry if present
    try {
      const rawDonors = localStorage.getItem('ndc_blood_network_donors');
      if (rawDonors) {
        const donors = JSON.parse(rawDonors);
        if (Array.isArray(donors)) {
          const updatedDonors = donors.filter((d) => d.userId !== deletingId);
          localStorage.setItem('ndc_blood_network_donors', JSON.stringify(updatedDonors));
          window.dispatchEvent(new Event('ndc_blood_network_updated'));
        }
      }
    } catch {}

    // 5. Clear stored current user & auth keys
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(PROFILE_STORAGE_KEY);

    // 6. Sign out Supabase Auth
    inMemorySupabaseToken = null;
    setSupabaseToken(null);
    if (isSupabaseConfigured) {
      supabase.auth.signOut().catch(() => {});
    }

    // 7. Reset state to blank logged-out user
    setCurrentUser(DEFAULT_BLANK_USER);
    setIsAdminUser(false);
    setIsLoggedIn(false);

    window.dispatchEvent(new CustomEvent('ndc_profile_deleted', { detail: { profileId: deletingId } }));
    return true;
  };

  const requestOtp = async (phone: string) => {
    await new Promise((r) => setTimeout(r, 500));
    const key = normalizePhoneDigits(phone);
    if (key.length < 6) {
      throw new Error('Please enter a valid registered mobile number.');
    }
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStoreRef.current.set(key, {
      otp: generatedOtp,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
    return { success: true, debugOtp: generatedOtp };
  };

  const resetPasswordWithOtp = async (phone: string, otp: string, newPass: string) => {
    await new Promise((r) => setTimeout(r, 500));
    if (!newPass || newPass.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }
    const key = normalizePhoneDigits(phone);
    const entry = otpStoreRef.current.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      throw new Error('OTP has expired or was not requested. Please request a new OTP.');
    }
    if (entry.otp !== otp.trim()) {
      throw new Error('Invalid OTP code. Please check the 6-digit code and try again.');
    }

    const hashedPassword = await hashPassword(newPass);
    const accounts = loadAccounts();
    const accIdx = accounts.findIndex(
      (a) => isPhoneMatch(a.profile.phone, phone) || isPhoneMatch(a.identifier, phone)
    );

    if (accIdx > -1) {
      accounts[accIdx].password = hashedPassword;
      saveAccounts(accounts);
    } else {
      const existingProfile = ALUMNI_PROFILES.find((p) => isPhoneMatch(p.phone, phone));
      if (existingProfile) {
        accounts.push({
          identifier: existingProfile.phone || phone.trim(),
          password: hashedPassword,
          profile: existingProfile,
        });
        saveAccounts(accounts);
      }
    }

    // Sync updated password to Cloud SQL database so user can log in with new password on any device
    try {
      await fetch(apiUrl('/api/auth/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, newPassword: newPass }),
      });
    } catch {
      // offline fallback
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
