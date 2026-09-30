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
const ARTS_GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const COMMERCE_GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

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
  const { login, register, requestOtp, resetPasswordWithOtp } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);

  // Login State
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

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
  const [idProofPreview, setIdProofPreview] = useState<string>('');

  const handleIdProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') {
        setIdProofPreview(ev.target.result);
      }
    };
    reader.readAsDataURL(file);
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
  const [debugOtp, setDebugOtp] = useState<string | null>(null);

  // General States
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Handle Login Submit
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!loginIdentifier.trim() || !loginPassword.trim()) {
      setErrorMessage('Please enter your mobile number or email and password.');
      return;
    }

    setLoading(true);
    try {
      await login(loginIdentifier.trim(), loginPassword);
      onClose();
      if (onSuccess) onSuccess('login');
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || 'Invalid credentials. Please try again.');
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
      const formattedPhone = phone.startsWith('+880')
        ? phone
        : `+880${phone.replace(/^0+/, '')}`;

      const degreeArray = degreeInput
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean);

      const specialtyArray = specialtyInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const cleanWhatsapp = whatsapp.trim()
        ? whatsapp.trim().startsWith('+880')
          ? whatsapp.trim()
          : `+880${whatsapp.trim().replace(/^0+/, '')}`
        : '';

      const isIdVerified = verificationMethod === 'id_card_upload' && Boolean(idProofPreview);

      await register({
        fullName: fullName.trim(),
        avatarUrl: selectedAvatar,
        batchYear: parsedYear,
        group: (academicGroup || undefined) as any,
        collegeRoll: bmdcNumber.trim(),
        verificationMethod,
        verificationStatus: isIdVerified ? 'verified' : 'pending_vouch',
        idProofUrl: idProofPreview || undefined,
        vouchesCount: isIdVerified ? 2 : 0,
        vouchTargetCount: 2,
        badges: isIdVerified ? ['Verified Notredamian'] : [],
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

  // Handle Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!forgotPhone.trim()) {
      setErrorMessage('Please enter your registered mobile number.');
      return;
    }
    setLoading(true);
    try {
      const res = await requestOtp(forgotPhone);
      setForgotStep(2);
      if (res.debugOtp) {
        setDebugOtp(res.debugOtp);
      }
      setSuccessMessage('A 6-digit OTP code has been generated for your phone number.');
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || 'Unable to send OTP. Please try again.');
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto bg-slate-900/30 dark:bg-slate-950/45 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-2xl my-auto bg-white/35 dark:bg-slate-900/40 backdrop-blur-2xl backdrop-saturate-180 rounded-3xl shadow-[0_24px_64px_-12px_rgba(15,23,42,0.35),inset_0_1px_1px_rgba(255,255,255,0.75)] dark:shadow-[0_24px_64px_-12px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.2)] border border-white/60 dark:border-white/15 ring-1 ring-white/35 dark:ring-white/10 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Liquid Glass Refractive Highlights */}
        <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-blue-400/20 dark:bg-blue-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-indigo-400/20 dark:bg-amber-500/10 blur-3xl" />

        {/* Modal Header */}
        <div className="relative px-6 py-5 border-b border-white/40 dark:border-white/10 bg-white/25 dark:bg-white/[0.04] backdrop-blur-xl flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/70 dark:bg-slate-800/60 backdrop-blur-md p-1 border border-white/70 dark:border-white/15 flex items-center justify-center shadow-md shadow-blue-600/10 overflow-hidden shrink-0">
              <NDCLogo className="w-full h-full" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none">
                  {mode === 'login' && 'Sign In to Notre Dame Portal'}
                  {mode === 'register' && 'Notre Dame Alumni Registration'}
                  {mode === 'forgot' && 'Reset Portal Password'}
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 dark:bg-blue-400/15 border border-blue-400/30 text-blue-700 dark:text-blue-300 backdrop-blur-sm">
                  <ShieldCheck className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  <span>Verified Notredamian</span>
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                {mode === 'login' && 'Notre Dame College (NDC Dhaka) Alumni Network'}
                {mode === 'register' && 'Join your fellow batchmates and seniors across 75+ batches worldwide'}
                {mode === 'forgot' && 'Verify your mobile number to restore access to your account'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/50 hover:bg-white/80 dark:bg-white/10 dark:hover:bg-white/20 border border-white/50 dark:border-white/15 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer backdrop-blur-md"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher (Login vs Sign Up) */}
        {mode !== 'forgot' && (
          <div className="relative px-6 pt-4 pb-2 bg-white/15 dark:bg-white/[0.02] border-b border-white/35 dark:border-white/10 flex-shrink-0">
            <div className="flex p-1 rounded-2xl bg-white/35 dark:bg-slate-950/35 border border-white/50 dark:border-white/10 backdrop-blur-md max-w-md mx-auto">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
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
                className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
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
        <div className="relative p-6 overflow-y-auto space-y-4">
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
              VIEW 1: SIGN IN (LOGIN)
             ========================================================================= */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4 max-w-md mx-auto py-2">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 }}
              >
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Mobile Number or Email
                </label>
                <div className="relative flex items-center rounded-2xl bg-white/45 dark:bg-white/[0.07] backdrop-blur-md border border-white/60 dark:border-white/15 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)] dark:shadow-[inset_0_1px_2px_rgba(255,255,255,0.06)] focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                  <div className="pl-3.5 text-slate-500 dark:text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. 01711223344 or alumnus@ndc.edu.bd"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    className="w-full px-3 py-3 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 bg-transparent focus:outline-none"
                    autoFocus
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.12 }}
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

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.18 }}
                className="flex items-center justify-between pt-1"
              >
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                  <span>Remember me on this browser</span>
                </label>
              </motion.div>

              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.24 }}
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-2xl bg-blue-600/90 hover:bg-blue-600 text-white font-extrabold text-sm shadow-lg shadow-blue-600/25 border border-white/25 backdrop-blur-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <span>{loading ? 'Signing in...' : 'Sign In to Portal'}</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>

              {/* Helper for new users */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
                className="pt-4 border-t border-white/35 dark:border-white/10 text-center"
              >
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
              </motion.div>
            </form>
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
                      {/* Science: 01–17 */}
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                          Science
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
                                className={`min-w-[2.15rem] h-7 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
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

                      {/* Arts & Commerce side-by-side on desktop, stacked on mobile */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-slate-200/50 dark:border-white/10">
                        {/* Arts: A–H */}
                        <div className="space-y-1.5">
                          <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                            Arts
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {ARTS_GROUPS.map((code) => {
                              const value = `Arts ${code}`;
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

                        {/* Commerce: A–H */}
                        <div className="space-y-1.5">
                          <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                            Commerce
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {COMMERCE_GROUPS.map((code) => {
                              const value = `Commerce ${code}`;
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
                      Fast-track instant verification by uploading your NDC ID card, HSC slip, or souvenir.
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
                          {idProofPreview ? 'NDC Document Attached (Instant Verify)' : 'Attach NDC ID / HSC Slip / Souvenir Photo'}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          {idProofPreview ? 'Ready for instant verification on submit' : 'Or upload later from the Verification Center'}
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
                  {debugOtp && (
                    <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-semibold text-center">
                      Testing Verification OTP: <span className="font-mono font-bold text-sm underline">{debugOtp}</span>
                    </div>
                  )}

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
