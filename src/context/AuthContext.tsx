import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  login: (phoneOrEmail: string, pass: string) => Promise<boolean>;
  logout: () => void;
  register: (profileData: Partial<AlumniProfile> & { password?: string }) => Promise<boolean>;
  updateProfile: (updated: Partial<AlumniProfile>) => void;
  requestOtp: (phone: string) => Promise<{ success: boolean; debugOtp?: string }>;
  resetPasswordWithOtp: (phone: string, otp: string, newPass: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'ndc_alumni_auth';
const PROFILE_STORAGE_KEY = 'ndc_alumni_current_user';
const ACCOUNTS_STORAGE_KEY = 'ndc_registered_accounts';
const PASSWORD_SALT = 'ndc_dhaka_1949_salt_v1:';

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
  // Require at least 6 numeric digits in user input so emails without digits never match phone numbers
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

  const login = async (phoneOrEmail: string, pass: string): Promise<boolean> => {
    if (!phoneOrEmail?.trim() || !pass) {
      throw new Error('Please enter your mobile number or email and password.');
    }
    await new Promise((r) => setTimeout(r, 500));

    const accounts = loadAccounts();
    const cleanId = phoneOrEmail.trim().toLowerCase();
    const accountIdx = accounts.findIndex(
      (a) =>
        a.identifier.toLowerCase() === cleanId ||
        isPhoneMatch(a.profile.phone, cleanId) ||
        (a.profile.email && a.profile.email.toLowerCase() === cleanId)
    );

    if (accountIdx > -1) {
      const account = accounts[accountIdx];
      const isValid = await verifyPassword(account.password, pass);
      if (!isValid) {
        throw new Error('Incorrect password. Please try again.');
      }
      // Upgrade legacy plaintext password to SHA-256 hash on login
      if (account.password && !account.password.startsWith('sha256:')) {
        accounts[accountIdx].password = await hashPassword(pass);
        saveAccounts(accounts);
      }
      setCurrentUser(account.profile);
      setIsLoggedIn(true);
      return true;
    }

    // Check existing alumni profiles
    const existingProfile = ALUMNI_PROFILES.find(
      (p) =>
        isPhoneMatch(p.phone, cleanId) ||
        (p.email && p.email.toLowerCase() === cleanId)
    );

    if (existingProfile) {
      setCurrentUser(existingProfile);
      setIsLoggedIn(true);
      return true;
    }

    throw new Error('No registered account found with this phone number or email. Please register your verified profile first.');
  };

  const logout = () => {
    setIsLoggedIn(false);
  };

  const register = async (profileData: Partial<AlumniProfile> & { password?: string }): Promise<boolean> => {
    await new Promise((r) => setTimeout(r, 600));

    const accounts = loadAccounts();
    const cleanEmail = (profileData.email || '').trim().toLowerCase();
    const cleanPhone = (profileData.phone || '').trim();

    const duplicateAccount = accounts.find(
      (a) =>
        (cleanEmail && a.profile.email?.toLowerCase() === cleanEmail) ||
        (cleanPhone && isPhoneMatch(a.profile.phone, cleanPhone))
    );
    if (duplicateAccount) {
      throw new Error('An account with this mobile number or email is already registered. Please sign in instead.');
    }

    const rawBatch = profileData.batchYear || 68;
    const hscYear = rawBatch > 1900 ? rawBatch : 1950 + rawBatch;
    const computedSession = `${hscYear - 2}-${String(hscYear).slice(-2)}`;

    const verificationStatus = profileData.verificationStatus || 'pending_vouch';
    const newProfile: AlumniProfile = {
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
      phone: profileData.phone ?? '',
      email: profileData.email ?? '',
      bio: profileData.bio ?? '',
      careerHistory: profileData.careerHistory ?? [],
      isPublic: true,
      online: true,
      postsCount: 0,
      badges: profileData.badges ?? [],
    };

    // Always register a public vouch request so batchmates and Admin can verify them
    registerUserVouchRequest(newProfile);

    // If they uploaded an ID / NID document during registration, submit it to the Admin Review Queue
    if (newProfile.idProofUrl) {
      submitDocumentForAdminReview(
        newProfile,
        newProfile.idDocType || 'id_card',
        newProfile.idProofUrl
      );
    }

    // Add to current user and active ALUMNI_PROFILES array
    setCurrentUser(newProfile);
    ALUMNI_PROFILES.unshift(newProfile);
    saveStoredAlumniProfiles(ALUMNI_PROFILES);

    // Persist login account with SHA-256 hashed password
    const hashedPassword = profileData.password ? await hashPassword(profileData.password) : undefined;
    accounts.push({
      identifier: profileData.phone || profileData.email || newProfile.fullName,
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
      // Also update in ALUMNI_PROFILES array
      const idx = ALUMNI_PROFILES.findIndex((p) => p.id === next.id);
      if (idx > -1) {
        ALUMNI_PROFILES[idx] = next;
      } else {
        ALUMNI_PROFILES.unshift(next);
      }
      saveStoredAlumniProfiles(ALUMNI_PROFILES);

      // Update in registered accounts
      const accounts = loadAccounts();
      const accIdx = accounts.findIndex((a) => a.profile.id === next.id);
      if (accIdx > -1) {
        accounts[accIdx].profile = next;
        saveAccounts(accounts);
      }

      return next;
    });
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

    otpStoreRef.current.delete(key);
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        currentUser,
        login,
        logout,
        register,
        updateProfile,
        requestOtp,
        resetPasswordWithOtp,
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
