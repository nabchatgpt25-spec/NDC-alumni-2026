import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Lock,
  Phone,
  Mail,
  User,
  GraduationCap,
  Briefcase,
  Building2,
  MapPin,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Check,
  Globe,
  Sparkles,
  Camera,
  Award,
  Heart,
  HelpCircle,
  KeyRound,
  UserPlus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BATCH_LIST } from '../data/mockData';
import { WhatsAppIcon } from './SocialIcons';
import { NDCLogo } from './NDCLogo';
import { compressImageFileToDataUrl } from '../utils/mediaStorage';
import { formatToE164Phone } from '../utils/phone';
import { normalizeAcademicStreamAndGroup } from '../utils/academicGroupMapping';
import { uploadVerificationDocumentToStorage, submitAdminDocSubmissionInDb } from '../services/supabaseService';
import { supabase } from '../lib/supabase';

interface AuthModalProps {
  initialMode: 'login' | 'register' | 'forgot';
  onClose: () => void;
  onSuccess?: (mode?: 'login' | 'register') => void;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80',
];

const SPECIALTY_OPTIONS = [
  'Computer Science & Software',
  'Artificial Intelligence & Data',
  'Electrical & Electronic Engineering',
  'Civil & Structural Engineering',
  'Mechanical & Robotics',
  'Biotechnology & Genetic Engineering',
  'Supply Chain & Operations',
  'Business Administration & Management',
  'Finance, Banking & Investment',
  'Chartered Accountancy & Audit',
  'Entrepreneurship & Startups',
  'Physics & Physical Sciences',
  'Mathematics & Statistics',
  'Civil Service & Administration (BCS)',
  'Foreign Affairs & Diplomacy',
  'Law & Jurisprudence',
  'Architecture & Design',
  'Higher Education & Research',
];

const COMMON_DEGREES = [
  'HSC',
  'BSc Engineering',
  'BSc',
  'BBA',
  'MBA',
  'MSc',
  'PhD',
  'B.Arch',
  'LLB',
  'LLM',
  'BA',
  'MA',
  'CA / ACA',
  'CFA',
  'BCS',
];

const SCIENCE_GROUPS = Array.from({ length: 17 }, (_, i) =>
  i + 1 < 10 ? `0${i + 1}` : `${i + 1}`
);
const HUMANITIES_GROUPS = ['G', 'H', 'L', 'W'];
const BUSINESS_GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

const REGISTRATION_DRAFT_STORAGE_KEY = 'ndc_registration_form_draft_v1';

interface RegistrationFormDraft {
  fullName?: string;
  batchYear?: string;
  academicGroup?: string;
  bmdcNumber?: string;
  position?: string;
  institution?: string;
  specialtyInput?: string;
  degreeInput?: string;
  city?: string;
  country?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
}

const loadRegistrationDraft = (): RegistrationFormDraft => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(REGISTRATION_DRAFT_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as RegistrationFormDraft;
    }
  } catch (e) {
    console.warn('Failed to load registration draft from localStorage', e);
  }
  return {};
};

export const AuthModal: React.FC<AuthModalProps> = ({
  initialMode,
  onClose,
  onSuccess,
}) => {
  const {
    login,
    loginWithPhoneOtp,
    verifyPhoneOtp,
    loginWithGoogle,
    register,
    requestOtp,
    resetPasswordWithOtp,
  } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);

  // Login State
  const [loginTab, setLoginTab] = useState<'email' | 'phone'>('email');
  const [phoneLoginMode, setPhoneLoginMode] = useState<'otp' | 'password'>('otp');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPhoneOtp, setLoginPhoneOtp] = useState('');
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneCountdown, setPhoneCountdown] = useState(0);
  const [providerNotice, setProviderNotice] = useState<string | null>(null);
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Countdown timer for phone OTP resend
  React.useEffect(() => {
    if (phoneCountdown > 0) {
      const timer = setTimeout(() => setPhoneCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [phoneCountdown]);

  // Register Form State (14 fields) initialized from localStorage draft
  const [initialDraft] = useState<RegistrationFormDraft>(() => loadRegistrationDraft());
  const [fullName, setFullName] = useState(initialDraft.fullName || '');
  const [batchYear, setBatchYear] = useState<string>(initialDraft.batchYear || '');
  const [academicGroup, setAcademicGroup] = useState<string>(initialDraft.academicGroup || '');
  const [bmdcNumber, setBmdcNumber] = useState(initialDraft.bmdcNumber || '');
  const [selectedAvatar] = useState(AVATAR_PRESETS[0]);
  const [position, setPosition] = useState(initialDraft.position || '');
  const [institution, setInstitution] = useState(initialDraft.institution || '');
  const [specialtyInput, setSpecialtyInput] = useState(initialDraft.specialtyInput || '');
  const [degreeInput, setDegreeInput] = useState(initialDraft.degreeInput || '');
  const [city, setCity] = useState(initialDraft.city || '');
  const [country, setCountry] = useState(initialDraft.country || '');
  const [phone, setPhone] = useState(initialDraft.phone || '');
  const [whatsapp, setWhatsapp] = useState(initialDraft.whatsapp || '');
  const [email, setEmail] = useState(initialDraft.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState<'two_vouches' | 'id_card_upload'>('two_vouches');
  const [idProofFile, setIdProofFile] = useState<File | null>(null);
  const [idProofPreview, setIdProofPreview] = useState<string>('');

  const handleIdProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setErrorMessage('Please upload a valid image file (JPG, PNG, or WEBP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Document file size must be less than 5MB.');
      return;
    }
    setIdProofFile(file);
    const blobUrl = URL.createObjectURL(file);
    setIdProofPreview(blobUrl);
  };

  // Auto-save registration form progress to localStorage
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const draft: RegistrationFormDraft = {
        fullName,
        batchYear,
        academicGroup,
        bmdcNumber,
        position,
        institution,
        specialtyInput,
        degreeInput,
        city,
        country,
        phone,
        whatsapp,
        email,
      };
      localStorage.setItem(REGISTRATION_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch (e) {
      console.warn('Failed to auto-save registration draft to localStorage', e);
    }
  }, [
    fullName,
    batchYear,
    academicGroup,
    bmdcNumber,
    position,
    institution,
    specialtyInput,
    degreeInput,
    city,
    country,
    phone,
    whatsapp,
    email,
  ]);

  // Password Strength Calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) {
      return {
        score: 0,
        percent: 0,
        label: 'Enter password',
        barColor: 'bg-slate-300 dark:bg-slate-700',
        textColor: 'text-slate-500 dark:text-slate-400',
        hint: 'Use 6+ chars with letters, numbers & symbols',
      };
    }
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score += 1;
    if (/\d/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (pass.length < 6 || score <= 1) {
      return {
        score: 1,
        percent: 25,
        label: 'Weak',
        barColor: 'bg-rose-500',
        textColor: 'text-rose-600 dark:text-rose-400',
        hint: pass.length < 6 ? 'At least 6 characters required' : 'Add numbers, uppercase or symbols',
      };
    }
    if (score === 2) {
      return {
        score: 2,
        percent: 50,
        label: 'Fair',
        barColor: 'bg-amber-500',
        textColor: 'text-amber-600 dark:text-amber-400',
        hint: 'Add uppercase letters or special symbols',
      };
    }
    if (score === 3) {
      return {
        score: 3,
        percent: 75,
        label: 'Good',
        barColor: 'bg-blue-500',
        textColor: 'text-blue-600 dark:text-blue-400',
        hint: 'Strong password — add a symbol for max security',
      };
    }
    return {
      score: 4,
      percent: 100,
      label: 'Strong',
      barColor: 'bg-emerald-500',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      hint: 'Excellent password security',
    };
  };

  const passwordStrength = getPasswordStrength(password);

  // Forgot Password State
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);

  // General States
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Handle Login Submit (Email or Mobile with password)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setProviderNotice(null);

    const input = loginIdentifier.trim();
    if (!input || !loginPassword.trim()) {
      setErrorMessage('Please enter your email or phone number and password.');
      return;
    }

    setLoading(true);
    try {
      await login(input, loginPassword);
      onClose();
      if (onSuccess) onSuccess('login');
    } catch (err: unknown) {
      const error = err as Error;
      const msg = error.message || '';
      setErrorMessage(msg || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Phone OTP Request (Send SMS code via Supabase Auth)
  const handleRequestPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setProviderNotice(null);

    if (!loginPhone.trim()) {
      setErrorMessage('Please enter your mobile number.');
      return;
    }

    setLoading(true);
    try {
      await loginWithPhoneOtp(loginPhone.trim());
      setPhoneOtpSent(true);
      setPhoneCountdown(60);
      setSuccessMessage('A 6-digit SMS verification code has been sent to your mobile number.');
    } catch (err: unknown) {
      const error = err as Error;
      const msg = error.message || '';
      if (
        msg.toLowerCase().includes('phone provider is disabled') ||
        msg.toLowerCase().includes('unsupported phone provider')
      ) {
        setProviderNotice(
          'Supabase Phone Provider is not enabled on this project. In the Supabase Dashboard, navigate to Authentication > Providers > Phone, toggle it ON, and configure an SMS provider (Twilio, MessageBird, Vonage, or AWS SNS). In the meantime, you can sign in directly using your registered Email & Password.'
        );
      } else {
        setErrorMessage(msg || 'Unable to send SMS verification code.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Phone OTP Verification (Verify SMS code via Supabase Auth)
  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!loginPhone.trim() || !loginPhoneOtp.trim()) {
      setErrorMessage('Please enter both your mobile number and the 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      await verifyPhoneOtp(loginPhone.trim(), loginPhoneOtp.trim());
      onClose();
      if (onSuccess) onSuccess('login');
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || 'Invalid or expired SMS code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Register Submit
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!fullName.trim()) {
      setErrorMessage('Please provide your Full Name.');
      return;
    }
    if (!batchYear.trim() || !/^\d{4}$/.test(batchYear.trim())) {
      setErrorMessage('Please enter a valid 4-digit Notre Dame HSC Year (e.g., 2016).');
      return;
    }
    const parsedYear = Number(batchYear.trim());
    const maxAllowedYear = new Date().getFullYear() + 2;
    if (parsedYear < 1949 || parsedYear > maxAllowedYear) {
      setErrorMessage(`Please enter a valid 4-digit Notre Dame HSC Year between 1949 and ${maxAllowedYear} (e.g., 2016).`);
      return;
    }
    if (!phone.trim()) {
      setErrorMessage('Please provide your Mobile Number.');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Please provide your Email Address.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please recheck.');
      return;
    }

    setLoading(true);
    try {
      const formattedPhone = formatToE164Phone(phone);

      const degreeArray = degreeInput
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean);

      const specialtyArray = specialtyInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const cleanWhatsapp = whatsapp.trim() ? formatToE164Phone(whatsapp) : '';
      const streamGroup = normalizeAcademicStreamAndGroup(academicGroup);

      await register({
        fullName: fullName.trim(),
        avatarUrl: selectedAvatar,
        batchYear: parsedYear,
        academicStream: streamGroup.academicStream,
        academicGroup: streamGroup.academicGroup,
        group: streamGroup.academicStream,
        section: streamGroup.academicGroup ? `Group ${streamGroup.academicGroup}` : 'Section A',
        collegeRoll: bmdcNumber.trim(),
        verificationMethod,
        verificationStatus: 'unverified',
        vouchesCount: 0,
        vouchTargetCount: 2,
        badges: [],
        profession: '',
        position: position.trim(),
        institution: institution.trim(),
        specialty: specialtyArray,
        degree: degreeArray,
        city: city.trim(),
        country: country.trim(),
        phone: formattedPhone,
        whatsapp: cleanWhatsapp,
        email: email.trim(),
        bio: '',
        password,
      });

      // Securely upload ID document to private storage and record in admin_doc_submissions
      if (verificationMethod === 'id_card_upload' && idProofFile) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.id) {
            const uploadRes = await uploadVerificationDocumentToStorage(idProofFile, session.user.id);
            if (uploadRes?.storagePath) {
              const { data: profileRow } = await supabase
                .from('alumni_profiles')
                .select('id')
                .eq('auth_user_id', session.user.id)
                .maybeSingle();

              if (profileRow?.id) {
                await submitAdminDocSubmissionInDb({
                  userId: profileRow.id,
                  batchYear: parsedYear,
                  collegeRoll: bmdcNumber.trim(),
                  academicStream: streamGroup.academicStream,
                  academicGroup: streamGroup.academicGroup,
                  docType: 'id_card',
                  docTypeLabel: 'Notre Dame College ID Card',
                  storageObjectPath: uploadRes.storagePath,
                });
              }
            }
          }
        } catch (uploadErr) {
          console.warn('Post-registration document submission warning:', uploadErr);
        }
      }

      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem(REGISTRATION_DRAFT_STORAGE_KEY);
        } catch (e) {
          console.warn('Failed to clear registration draft', e);
        }
      }

      setSuccessMessage('Registration successful! Welcome to the Notre Dame Alumni Network.');
      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess('register');
      }, 600);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || 'Registration failed. Please check your details and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Request Password Reset Link via Supabase Auth
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const input = forgotPhone.trim();
    if (!input) {
      setErrorMessage('Please enter your registered mobile number or email address.');
      return;
    }
    setLoading(true);
    try {
      const res = await requestOtp(input);
      if (res.emailSent) {
        setSuccessMessage('Password reset link sent! Please check your registered email inbox or spam folder.');
      } else {
        setForgotStep(2);
        setSuccessMessage('Password reset instructions processed.');
      }
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || 'Unable to initiate password reset. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Reset Password with OTP
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!forgotOtp.trim() || !forgotNewPass.trim()) {
      setErrorMessage('Please enter both the OTP code and your new password.');
      return;
    }
    if (forgotNewPass.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    setLoading(true);
    try {
      await resetPasswordWithOtp(forgotPhone, forgotOtp, forgotNewPass);
      setSuccessMessage('Password reset successfully! You can now sign in with your new password.');
      setTimeout(() => {
        setMode('login');
        setForgotStep(1);
        setForgotOtp('');
        setForgotNewPass('');
      }, 1200);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-2xl my-auto bg-white/40 dark:bg-slate-900/50 backdrop-blur-2xl backdrop-saturate-180 rounded-2xl sm:rounded-3xl shadow-[0_24px_64px_-12px_rgba(15,23,42,0.35),inset_0_1px_1px_rgba(255,255,255,0.75)] dark:shadow-[0_24px_64px_-12px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.2)] border border-white/60 dark:border-white/15 ring-1 ring-white/35 dark:ring-white/10 overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Liquid Glass Refractive Highlights */}
        <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-blue-400/20 dark:bg-blue-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-indigo-400/20 dark:bg-amber-500/10 blur-3xl" />

        {/* Modal Header */}
        <div className="relative px-4 sm:px-6 py-3.5 sm:py-5 border-b border-white/40 dark:border-white/10 bg-white/25 dark:bg-white/[0.04] backdrop-blur-xl flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/70 dark:bg-slate-800/60 backdrop-blur-md p-1 border border-white/70 dark:border-white/15 flex items-center justify-center shadow-md shadow-blue-600/10 overflow-hidden shrink-0">
              <NDCLogo className="w-full h-full" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 className="text-sm sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none truncate">
                  {mode === 'login' && 'Sign In to Portal'}
                  {mode === 'register' && 'Alumni Registration'}
                  {mode === 'forgot' && 'Reset Password'}
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 dark:bg-blue-400/15 border border-blue-400/30 text-blue-700 dark:text-blue-300 backdrop-blur-sm">
                  <ShieldCheck className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  <span>Verified Notredamian</span>
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 mt-1 truncate">
                {mode === 'login' && 'Notre Dame College (NDC Dhaka) Alumni Network'}
                {mode === 'register' && 'Join 75+ batches worldwide'}
                {mode === 'forgot' && 'Verify mobile number to restore access'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/50 hover:bg-white/80 dark:bg-white/10 dark:hover:bg-white/20 border border-white/50 dark:border-white/15 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer backdrop-blur-md shrink-0 ml-2"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher (Login vs Sign Up) */}
        {mode !== 'forgot' && (
          <div className="relative px-4 sm:px-6 pt-3 sm:pt-4 pb-2 bg-white/15 dark:bg-white/[0.02] border-b border-white/35 dark:border-white/10 flex-shrink-0">
            <div className="flex p-1 rounded-2xl bg-white/35 dark:bg-slate-950/35 border border-white/50 dark:border-white/10 backdrop-blur-md max-w-md mx-auto">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className={`flex-1 py-1.5 sm:py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white/80 dark:bg-white/15 text-blue-600 dark:text-blue-300 shadow-xs border border-white/60 dark:border-white/15 backdrop-blur-md'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className={`flex-1 py-1.5 sm:py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
                  mode === 'register'
                    ? 'bg-white/80 dark:bg-white/15 text-blue-600 dark:text-blue-300 shadow-xs border border-white/60 dark:border-white/15 backdrop-blur-md'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Sign Up / Register</span>
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Form Body */}
        <div className="relative p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Status Alerts */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-semibold animate-in fade-in">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold animate-in fade-in">
              {successMessage}
            </div>
          )}

          {/* =========================================================================
              VIEW 1: SIGN IN (UNIFIED LOGIN - EMAIL OR PHONE)
             ========================================================================= */}
          {mode === 'login' && (
            <div className="space-y-4 max-w-md mx-auto py-1">
              {/* Exact Supabase Provider Setup Notice (Shown if Phone provider is not yet enabled) */}
              {providerNotice && (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs space-y-2 animate-in fade-in">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-extrabold text-slate-900 dark:text-white">
                        Provider Notice
                      </div>
                      <p className="mt-1 leading-relaxed text-[11px] text-slate-700 dark:text-slate-300">
                        {providerNotice}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-3.5">
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Email or Phone
                  </label>
                  <div className="relative flex items-center rounded-2xl bg-white/45 dark:bg-white/[0.07] backdrop-blur-md border border-white/60 dark:border-white/15 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)] dark:shadow-[inset_0_1px_2px_rgba(255,255,255,0.06)] focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                    <div className="pl-3.5 text-slate-500 dark:text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. name@example.com or 017xxxxxxxx"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      className="w-full px-3 py-3 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 bg-transparent focus:outline-none"
                      autoFocus
                    />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.05 }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setErrorMessage('');
                      }}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative flex items-center rounded-2xl bg-white/45 dark:bg-white/[0.07] backdrop-blur-md border border-white/60 dark:border-white/15 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)] dark:shadow-[inset_0_1px_2px_rgba(255,255,255,0.06)] focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                    <div className="pl-3.5 text-slate-500 dark:text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full px-3 py-3 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 bg-transparent focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="pr-3.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                      aria-label="Toggle password visibility"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </motion.div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
                    />
                    <span>Remember me on this browser</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-6 rounded-2xl bg-blue-600/90 hover:bg-blue-600 text-white font-extrabold text-sm shadow-lg shadow-blue-600/25 border border-white/25 backdrop-blur-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 min-h-[44px]"
                >
                  <span>{loading ? 'Signing in...' : 'Sign In to Portal'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Helper for new users */}
              <div className="pt-3 border-t border-white/35 dark:border-white/10 text-center">
                <p className="text-xs text-slate-700 dark:text-slate-300 mb-2">
                  Don't have a registered alumni account yet?
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMessage('');
                  }}
                  className="px-4 py-2 rounded-xl bg-white/45 dark:bg-white/10 hover:bg-white/70 dark:hover:bg-white/20 text-blue-700 dark:text-blue-300 text-xs font-bold border border-white/60 dark:border-white/15 backdrop-blur-md cursor-pointer transition-all inline-flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register Verified Alumni Profile</span>
                </button>
              </div>
            </div>
          )}

          {/* =========================================================================
              VIEW 2: RESTORED FULL SIGN UP / REGISTRATION
             ========================================================================= */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              {/* SECTION 1: Identity, Batch & Contact */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.04 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3.5"
              >
                {/* 1. Full Name * */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.06 }}
                  className="sm:col-span-2"
                >
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center rounded-2xl bg-white/45 dark:bg-white/[0.07] backdrop-blur-md border border-white/60 dark:border-white/15 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                    <div className="pl-3.5 text-slate-500 dark:text-slate-400">
                      <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. Md. Tanvir Ahmed Chowdhury"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 bg-transparent focus:outline-none"
                      required
                    />
                  </div>
                </motion.div>

                {/* 2. Notre Dame HSC Year * */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Notre Dame HSC Year <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center rounded-2xl bg-white/45 dark:bg-white/[0.07] backdrop-blur-md border border-white/60 dark:border-white/15 focus-within:border-blue-500 transition-all">
                    <div className="pl-3 text-slate-500 dark:text-slate-400">
                      <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1949}
                      max={new Date().getFullYear() + 2}
                      step={1}
                      placeholder="e.g. 2016"
                      value={batchYear}
                      onChange={(e) => {
                        const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setBatchYear(digitsOnly);
                      }}
                      required
                      className="w-full px-2.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </motion.div>

                {/* 3. College Roll / Registration ID */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.14 }}
                >
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    College Roll / Registration ID
                  </label>
                  <div className="relative flex items-center rounded-2xl bg-white/45 dark:bg-white/[0.07] backdrop-blur-md border border-white/60 dark:border-white/15 focus-within:border-blue-500 transition-all">
                    <div className="pl-3 text-slate-500 dark:text-slate-400">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. 118042 or 214015"
                      value={bmdcNumber}
                      onChange={(e) => setBmdcNumber(e.target.value)}
                      className="w-full px-2.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 bg-transparent focus:outline-none"
                    />
                  </div>
                </motion.div>

                {/* Your Group — shown only after a batch is selected */}
                {batchYear.trim().length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="sm:col-span-2 rounded-2xl bg-white/45 dark:bg-white/[0.06] backdrop-blur-md border border-white/60 dark:border-white/15 p-3.5 space-y-3"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          Your Group
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Select the group you belonged to at Notre Dame.
                        </p>
                      </div>
                      {academicGroup && (
                        <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 shrink-0">
                          {academicGroup}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      {/* Science (Groups 01–17) */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                          <span>Science (Groups 01–17)</span>
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">17 Official Groups</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {SCIENCE_GROUPS.map((code) => {
                            const value = `Science ${code}`;
                            const isSelected = academicGroup === value;
                            return (
                              <button
                                key={value}
                                type="button"
                                onClick={() =>
                                  setAcademicGroup(isSelected ? '' : value)
                                }
                                className={`min-w-[2.25rem] h-7 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'bg-white/75 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/10 hover:border-blue-400 dark:hover:border-blue-400'
                                }`}
                              >
                                {code}
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() =>
                              setAcademicGroup(academicGroup === 'Science' ? '' : 'Science')
                            }
                            className={`px-2.5 h-7 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                              academicGroup === 'Science'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-white/75 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/10 hover:border-blue-400 dark:hover:border-blue-400'
                            }`}
                            title="General Science Stream (if exact group number not specified)"
                          >
                            General Science
                          </button>
                        </div>
                      </div>

                      {/* Humanities (G, H, L, W) & Business Studies (A–H) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-slate-200/50 dark:border-white/10">
                        <div className="space-y-1.5">
                          <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                            Humanities (G, H, L, W)
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {HUMANITIES_GROUPS.map((code) => {
                              const value = `Humanities ${code}`;
                              const isSelected = academicGroup === value;
                              return (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() =>
                                    setAcademicGroup(isSelected ? '' : value)
                                  }
                                  className={`min-w-[2rem] h-7 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-blue-600 text-white shadow-xs'
                                      : 'bg-white/75 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/10 hover:border-blue-400 dark:hover:border-blue-400'
                                  }`}
                                >
                                  {code}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                            Business Studies (A–H)
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {BUSINESS_GROUPS.map((code) => {
                              const value = `Business Studies ${code}`;
                              const isSelected = academicGroup === value;
                              return (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() =>
                                    setAcademicGroup(isSelected ? '' : value)
                                  }
                                  className={`min-w-[2rem] h-7 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-blue-600 text-white shadow-xs'
                                      : 'bg-white/75 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/10 hover:border-blue-400 dark:hover:border-blue-400'
                                  }`}
                                >
                                  {code}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 4. Mobile Number * */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center rounded-2xl bg-white/45 dark:bg-white/[0.07] backdrop-blur-md border border-white/60 dark:border-white/15 focus-within:border-blue-500 transition-all overflow-hidden">
                    <div className="px-3 py-2.5 bg-white/40 dark:bg-white/10 border-r border-white/50 dark:border-white/15 text-slate-700 dark:text-slate-200 text-xs font-bold flex-shrink-0 select-none">
                      +880
                    </div>
                    <input
                      type="text"
                      placeholder="1XX-XXXXXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-2.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 bg-transparent focus:outline-none"
                      required
                    />
                  </div>
                </div>

                {/* 5. Email Address * */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center rounded-2xl bg-white/45 dark:bg-white/[0.07] backdrop-blur-md border border-white/60 dark:border-white/15 focus-within:border-blue-500 transition-all">
                    <div className="pl-3 text-slate-500 dark:text-slate-400">
                      <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <input
                      type="email"
                      placeholder="alumnus@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-2.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 bg-transparent focus:outline-none"
                      required
                    />
                  </div>
                </div>
              </motion.div>

              {/* SECTION 2: Professional, Location & WhatsApp */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.18 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-white/35 dark:border-white/10"
              >
                {/* 6. Current Profession / Role */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Current Profession / Role
                  </label>
                  <div className="relative flex items-center rounded-2xl bg-white/45 dark:bg-white/[0.07] backdrop-blur-md border border-white/60 dark:border-white/15 focus-within:border-blue-500 transition-all">
                    <div className="pl-3 text-slate-500 dark:text-slate-400">
                      <Briefcase className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. Senior Software Engineer / Lead / CEO"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      className="w-full px-2.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>

                {/* 7. Organization / Workplace */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Organization / Workplace
                  </label>
                  <div className="relative flex items-center rounded-2xl bg-white/45 dark:bg-white/[0.07] backdrop-blur-md border border-white/60 dark:border-white/15 focus-within:border-blue-500 transition-all">
                    <div className="pl-3 text-slate-500 dark:text-slate-400">
                      <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. Google / BUET / DMC / Apex"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      className="w-full px-2.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>

                {/* 8. Field / Specialty */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Field / Specialty
                  </label>
                  <div className="relative flex items-center rounded-2xl bg-white/45 dark:bg-white/[0.07] backdrop-blur-md border border-white/60 dark:border-white/15 focus-within:border-blue-500 transition-all">
                    <div className="pl-3 text-slate-500 dark:text-slate-400">
                      <Briefcase className="w-4 h-4 text-blue-500" />
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. Computer Science & Software"
                      value={specialtyInput}
                      onChange={(e) => setSpecialtyInput(e.target.value)}
                      className="w-full px-2.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>

                {/* 9. Degrees & Qualifications */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Degrees & Qualifications
                  </label>
                  <div className="relative flex items-center rounded-2xl bg-white/45 dark:bg-white/[0.07] backdrop-blur-md border border-white/60 dark:border-white/15 focus-within:border-blue-500 transition-all">
                    <div className="pl-3 text-slate-500 dark:text-slate-400">
                      <Award className="w-4 h-4 text-amber-500" />
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. HSC, BSc, MSc, MBA, PhD"
                      value={degreeInput}
                      onChange={(e) => setDegreeInput(e.target.value)}
                      className="w-full px-2.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>

                {/* 10. City */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    City
                  </label>
                  <div className="relative flex items-center rounded-2xl bg-white/45 dark:bg-white/[0.07] backdrop-blur-md border border-white/60 dark:border-white/15 focus-within:border-blue-500 transition-all">
                    <div className="pl-3 text-slate-500 dark:text-slate-400">
                      <MapPin className="w-4 h-4 text-blue-500" />
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. Dhaka"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-2.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>

                {/* 11. Country */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Country
                  </label>
                  <div className="relative flex items-center rounded-2xl bg-white/45 dark:bg-white/[0.07] backdrop-blur-md border border-white/60 dark:border-white/15 focus-within:border-blue-500 transition-all">
                    <div className="pl-3 text-slate-500 dark:text-slate-400">
                      <Globe className="w-4 h-4 text-blue-500" />
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. Bangladesh"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-2.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>

                {/* 12. WhatsApp Number */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    WhatsApp Number
                  </label>
                  <div className="relative flex items-center rounded-2xl bg-white/45 dark:bg-white/[0.07] backdrop-blur-md border border-white/60 dark:border-white/15 focus-within:border-emerald-500 transition-all">
                    <div className="pl-3 text-emerald-600 dark:text-emerald-400">
                      <WhatsAppIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. 01711223344"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      className="w-full px-2.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>
              </motion.div>

              {/* SECTION 3: Security & Password */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.28 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-white/35 dark:border-white/10"
              >
                {/* 13. Password * */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                      Password <span className="text-rose-500">*</span>
                    </label>
                    {password.length > 0 && (
                      <span className={`text-[10px] font-extrabold uppercase tracking-wider ${passwordStrength.textColor}`}>
                        {passwordStrength.label}
                      </span>
                    )}
                  </div>
                  <div className="relative flex items-center rounded-2xl bg-white/45 dark:bg-white/[0.07] backdrop-blur-md border border-white/60 dark:border-white/15 focus-within:border-blue-500 transition-all">
                    <div className="pl-3 text-slate-500 dark:text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-2.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 bg-transparent focus:outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="pr-3 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Visual Password Strength Progress Bar */}
                  <div className="mt-2 space-y-1">
                    <div className="w-full h-1.5 rounded-full bg-slate-200/80 dark:bg-slate-800/80 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ease-out ${passwordStrength.barColor}`}
                        style={{ width: `${passwordStrength.percent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-500 dark:text-slate-400 truncate">
                        {passwordStrength.hint}
                      </span>
                      {password.length > 0 && (
                        <span className={`font-bold shrink-0 ml-2 ${passwordStrength.textColor}`}>
                          {passwordStrength.percent}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 14. Confirm Password * */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Confirm Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center rounded-2xl bg-white/45 dark:bg-white/[0.07] backdrop-blur-md border border-white/60 dark:border-white/15 focus-within:border-blue-500 transition-all">
                    <div className="pl-3 text-slate-500 dark:text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Re-type password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-2.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 bg-transparent focus:outline-none"
                      required
                    />
                  </div>
                </div>
              </motion.div>

              {/* SECTION 4: Notredamian Trust & Verification Protocol */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.32 }}
                className="pt-3 border-t border-white/35 dark:border-white/10 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Verification Protocol (Choose Method)</span>
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                    3-Tier Trust Active
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setVerificationMethod('two_vouches')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      verificationMethod === 'two_vouches'
                        ? 'bg-blue-600/15 dark:bg-blue-500/20 border-blue-500 ring-1 ring-blue-500/30'
                        : 'bg-white/45 dark:bg-white/[0.06] border-white/60 dark:border-white/15 hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                        Method A: 2-Brother Vouch
                      </span>
                      {verificationMethod === 'two_vouches' && (
                        <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 stroke-[3]" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                      Request 2 verified batchmates to vouch for your roll in the Verification Center.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVerificationMethod('id_card_upload')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      verificationMethod === 'id_card_upload'
                        ? 'bg-emerald-600/15 dark:bg-emerald-500/20 border-emerald-500 ring-1 ring-emerald-500/30'
                        : 'bg-white/45 dark:bg-white/[0.06] border-white/60 dark:border-white/15 hover:border-emerald-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                        Method B: NDC ID / Souvenir
                      </span>
                      {verificationMethod === 'id_card_upload' && (
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                      Submit your NDC ID card, HSC slip, or souvenir for verification by network administrators.
                    </p>
                  </button>
                </div>

                {verificationMethod === 'id_card_upload' && (
                  <div className="p-3 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-dashed border-emerald-500/50 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {idProofPreview ? (
                        <img
                          src={idProofPreview}
                          alt="ID Proof"
                          className="w-10 h-10 rounded-xl object-cover border border-emerald-500/40 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <Camera className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {idProofPreview ? 'NDC Document Attached (Pending Review)' : 'Attach NDC ID / HSC Slip / Souvenir Photo'}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          {idProofPreview ? 'Will be submitted for administrator review on sign up' : 'Or upload later from the Verification Center'}
                        </div>
                      </div>
                    </div>
                    <label className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer shrink-0 transition-colors">
                      <span>{idProofPreview ? 'Change' : 'Upload Photo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleIdProofUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </motion.div>

              {/* Submit Button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.35 }}
                className="pt-2"
              >
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-blue-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 group disabled:opacity-60"
                >
                  <span>
                    {loading
                      ? 'Creating your Notredamian profile...'
                      : 'Complete Alumni Registration'}
                  </span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.div>
            </form>
          )}

          {/* =========================================================================
              VIEW 3: FORGOT PASSWORD / OTP FLOW
             ========================================================================= */}
          {mode === 'forgot' && (
            <div className="space-y-4 max-w-md mx-auto py-2">
              <div className="text-center mb-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-2 font-bold">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Restore Your Account Access
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Enter your registered mobile number. We will verify your credentials with a 6-digit OTP.
                </p>
              </div>

              {forgotStep === 1 ? (
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Registered Mobile Number
                    </label>
                    <div className="flex items-center rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus-within:border-blue-500 transition-all overflow-hidden">
                      <div className="px-3.5 py-3 bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold">
                        +880
                      </div>
                      <input
                        type="text"
                        placeholder="1XX-XXXXXXX"
                        value={forgotPhone}
                        onChange={(e) => setForgotPhone(e.target.value)}
                        className="w-full px-3 py-3 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 bg-transparent focus:outline-none"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>{loading ? 'Sending OTP...' : 'Send Verification OTP'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Enter 6-Digit OTP Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 123456"
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono tracking-widest text-center"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      placeholder="Enter at least 6 characters"
                      value={forgotNewPass}
                      onChange={(e) => setForgotNewPass(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
                  >
                    {loading ? 'Resetting password...' : 'Confirm New Password & Log In'}
                  </button>
                </form>
              )}

              <div className="text-center pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setForgotStep(1);
                  }}
                  className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  ← Back to Sign In Screen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
