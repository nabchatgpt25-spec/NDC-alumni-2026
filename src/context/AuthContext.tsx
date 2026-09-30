import React, { createContext, useContext, useState, useEffect } from 'react';
import { AlumniProfile } from '../types';
import {
  CURRENT_USER,
  DEFAULT_BLANK_USER,
  ALUMNI_PROFILES,
  saveStoredAlumniProfiles,
  loadStoredAlumniProfiles
} from '../data/mockData';
import { registerUserVouchRequest } from '../utils/verificationService';

interface RegisteredAccount {
  identifier: string;
  password?: string;
  profile: AlumniProfile;
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

const loadAccounts = (): RegisteredAccount[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
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
        return JSON.parse(stored);
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

  const login = async (phoneOrEmail: string, pass: string): Promise<boolean> => {
    if (!phoneOrEmail || !pass) {
      throw new Error('Please enter your mobile number or email and password.');
    }
    await new Promise((r) => setTimeout(r, 600));

    const accounts = loadAccounts();
    const cleanId = phoneOrEmail.trim().toLowerCase();
    const account = accounts.find(
      (a) =>
        a.identifier.toLowerCase() === cleanId ||
        (a.profile.phone && a.profile.phone.replace(/[^0-9]/g, '').includes(cleanId.replace(/[^0-9]/g, ''))) ||
        (a.profile.email && a.profile.email.toLowerCase() === cleanId)
    );

    if (account) {
      if (account.password && account.password !== pass) {
        throw new Error('Incorrect password. Please try again.');
      }
      setCurrentUser(account.profile);
      setIsLoggedIn(true);
      return true;
    }

    // Check existing alumni profiles
    const existingProfile = ALUMNI_PROFILES.find(
      (p) =>
        (p.phone && p.phone.replace(/[^0-9]/g, '').includes(cleanId.replace(/[^0-9]/g, ''))) ||
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
    await new Promise((r) => setTimeout(r, 800));
    const verificationStatus = profileData.verificationStatus || (profileData.verificationMethod === 'id_card_upload' ? 'verified' : 'pending_vouch');
    const newProfile: AlumniProfile = {
      id: Date.now(),
      userId: Math.floor(Math.random() * 10000) + 1000,
      fullName: profileData.fullName || 'Notredamian Alumnus',
      avatarUrl: profileData.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
      coverUrl: '/src/assets/images/ndc_campus_hero_1790233370828.jpg',
      batchYear: profileData.batchYear || 68,
      session: profileData.session || '2016-18',
      collegeRoll: profileData.collegeRoll ?? '',
      group: profileData.group || 'Science',
      section: profileData.section || 'Group 4',
      verificationStatus: verificationStatus,
      verificationMethod: profileData.verificationMethod || 'two_vouches',
      verifiedBy: profileData.verifiedBy || (verificationStatus === 'verified' ? ['Tanvir Ahmed Chowdhury (Batch 58)'] : []),
      vouchesCount: profileData.vouchesCount ?? (verificationStatus === 'verified' ? 2 : 1),
      vouchTargetCount: 2,
      idProofUrl: profileData.idProofUrl,
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

    // If pending vouch, register a public vouch request so batchmates can verify them
    if (newProfile.verificationStatus === 'pending_vouch') {
      registerUserVouchRequest(newProfile);
    }

    // Add to current user and active ALUMNI_PROFILES array
    setCurrentUser(newProfile);
    ALUMNI_PROFILES.unshift(newProfile);
    saveStoredAlumniProfiles(ALUMNI_PROFILES);

    // Persist login account
    const accounts = loadAccounts();
    accounts.push({
      identifier: profileData.phone || profileData.email || newProfile.fullName,
      password: profileData.password,
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
    await new Promise((r) => setTimeout(r, 600));
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    return { success: true, debugOtp: generatedOtp };
  };

  const resetPasswordWithOtp = async (phone: string, otp: string, newPass: string) => {
    await new Promise((r) => setTimeout(r, 600));
    if (newPass.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }
    setIsLoggedIn(true);
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
