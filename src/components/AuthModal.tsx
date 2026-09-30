import React, { useState } from 'react';
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
  onSuccess?: () => void;
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

  // Register Form State
  const [fullName, setFullName] = useState('');
  const [batchYear, setBatchYear] = useState<number>(68);
  const [bmdcNumber, setBmdcNumber] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_PRESETS[0]);
  const [position, setPosition] = useState('Software Engineer / Professional');
  const [institution, setInstitution] = useState('Tech & AI Industry / Institution');
  const [specialtyInput, setSpecialtyInput] = useState('Computer Science & Software');
  const [degreeInput, setDegreeInput] = useState('HSC, BSc Engineering');
  const [cadre, setCadre] = useState('');
  const [city, setCity] = useState('Dhaka');
  const [country, setCountry] = useState('Bangladesh');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

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
      if (onSuccess) onSuccess();
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
    if (!phone.trim()) {
      setErrorMessage('Please provide your Mobile Number.');
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
    if (!agreeTerms) {
      setErrorMessage('Please confirm that you are a genuine graduate or student of Notre Dame College.');
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
      if (degreeArray.length === 0) degreeArray.push('HSC');

      const specialtyArray = specialtyInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (specialtyArray.length === 0) specialtyArray.push('Computer Science & Software');

      await register({
        fullName: fullName.trim(),
        avatarUrl: selectedAvatar,
        batchYear: Number(batchYear),
        profession: 'Engineer / Tech',
        position: position.trim() || 'Professional',
        institution: institution.trim() || 'Notre Dame College Alumni Network',
        cadre: cadre.trim() || undefined,
        specialty: specialtyArray,
        degree: degreeArray,
        city: city.trim() || 'Dhaka',
        country: country.trim() || 'Bangladesh',
        phone: formattedPhone,
        whatsapp: whatsapp ? (whatsapp.startsWith('+880') ? whatsapp : `+880${whatsapp.replace(/^0+/, '')}`) : formattedPhone,
        email: email.trim() || undefined,
        bio: `${position} at ${institution}. NDC Batch ${batchYear}. Diligite Lumen Sapientiae.`,
        password,
      });

      setSuccessMessage('Registration successful! Welcome to the Notre Dame Alumni Network.');
      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
      }, 500);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl my-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="relative px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-slate-50 dark:from-slate-900 dark:via-blue-950/20 dark:to-slate-900 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 p-1 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center shadow-md shadow-blue-600/10 overflow-hidden shrink-0">
              <NDCLogo className="w-full h-full" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none">
                  {mode === 'login' && 'Sign In to Notre Dame Portal'}
                  {mode === 'register' && 'Notre Dame Alumni Registration'}
                  {mode === 'forgot' && 'Reset Portal Password'}
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300">
                  <ShieldCheck className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  <span>Verified Notredamian</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {mode === 'login' && 'Notre Dame College (NDC Dhaka) Alumni Network'}
                {mode === 'register' && 'Join your fellow batchmates and seniors across 75+ batches worldwide'}
                {mode === 'forgot' && 'Verify your mobile number to restore access to your account'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher (Login vs Sign Up) */}
        {mode !== 'forgot' && (
          <div className="px-6 pt-4 pb-2 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/80 flex-shrink-0">
            <div className="flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 max-w-md mx-auto">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Sign In (লগইন)</span>
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
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Sign Up / Register (রেজিস্ট্রেশন)</span>
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Form Body */}
        <div className="p-6 overflow-y-auto space-y-4">
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
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Mobile Number or Email
                </label>
                <div className="relative flex items-center rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                  <div className="pl-3.5 text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. 01711223344 or alumnus@ndc.edu.bd"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    className="w-full px-3 py-3 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 bg-transparent focus:outline-none"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Password (পাসওয়ার্ড)
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
                <div className="relative flex items-center rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                  <div className="pl-3.5 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full px-3 py-3 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 bg-transparent focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="pr-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    aria-label="Toggle password visibility"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600 dark:text-slate-400">
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
                className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-md shadow-blue-600/20 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <span>{loading ? 'Signing in...' : 'Sign In to Portal (লগইন করুন)'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Helper for new users */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  Don't have a registered alumni account yet?
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMessage('');
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200/80 dark:border-blue-800 cursor-pointer transition-all inline-flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register Verified Alumni Profile (নতুন একাউন্ট খুলুন)</span>
                </button>
              </div>
            </form>
          )}

          {/* =========================================================================
              VIEW 2: RESTORED FULL SIGN UP / REGISTRATION
             ========================================================================= */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Profile Photo Avatar Selection */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <Camera className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Choose Profile Avatar</span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Click to select photo</span>
                </div>

                <div className="flex items-center gap-3 overflow-x-auto pb-1">
                  {AVATAR_PRESETS.map((avatar, idx) => {
                    const isSelected = selectedAvatar === avatar;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedAvatar(avatar)}
                        className={`relative w-12 h-12 rounded-2xl overflow-hidden border-2 transition-all cursor-pointer flex-shrink-0 ${
                          isSelected
                            ? 'border-blue-600 ring-2 ring-blue-500/30 scale-105 shadow-md'
                            : 'border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={avatar} alt={`Avatar option ${idx + 1}`} className="w-full h-full object-cover" />
                        {isSelected && (
                          <div className="absolute inset-0 bg-blue-600/30 flex items-center justify-center text-white">
                            <Check className="w-4 h-4 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 1: Personal & Batch Credentials */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Full Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name (with title) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                    <div className="pl-3.5 text-slate-400">
                      <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. Dr. Md. Tanvir Ahmed Chowdhury"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 bg-transparent focus:outline-none"
                      required
                    />
                  </div>
                </div>

                {/* NDC Batch */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Notre Dame HSC Batch <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus-within:border-blue-500 transition-all">
                    <div className="pl-3 text-slate-400">
                      <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <select
                      value={batchYear}
                      onChange={(e) => setBatchYear(Number(e.target.value))}
                      className="w-full px-2.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white bg-transparent focus:outline-none cursor-pointer"
                    >
                      {BATCH_LIST.map((b) => (
                        <option key={b.batchYear} value={b.batchYear} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                          Batch {b.batchYear < 10 ? `0${b.batchYear}` : b.batchYear} ({b.session})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* College Roll / Student ID */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    College Roll / Registration ID (Optional)
                  </label>
                  <div className="relative flex items-center rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus-within:border-blue-500 transition-all">
                    <div className="pl-3 text-slate-400">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. 118042 or 214015"
                      value={bmdcNumber}
                      onChange={(e) => setBmdcNumber(e.target.value)}
                      className="w-full px-2.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: Professional & Career Work */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                {/* Current Designation */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Current Designation / Role
                  </label>
                  <div className="relative flex items-center rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus-within:border-blue-500 transition-all">
                    <div className="pl-3 text-slate-400">
                      <Briefcase className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. Senior Software Engineer / Lead / CEO"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      className="w-full px-2.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>

                {/* Institution / Company */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Company / Institution / Workplace
                  </label>
                  <div className="relative flex items-center rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus-within:border-blue-500 transition-all">
                    <div className="pl-3 text-slate-400">
                      <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. Google / BUET / DMC / Apex / Govt"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      className="w-full px-2.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>

                {/* Specialty */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Primary Specialty
                  </label>
                  <div className="relative flex items-center rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus-within:border-blue-500 transition-all">
                    <div className="pl-3 text-slate-400">
                      <Briefcase className="w-4 h-4 text-blue-500" />
                    </div>
                    <input
                      type="text"
                      list="specialty-suggestions"
                      placeholder="e.g. Software Engineering, AI & Robotics"
                      value={specialtyInput}
                      onChange={(e) => setSpecialtyInput(e.target.value)}
                      className="w-full px-2.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 bg-transparent focus:outline-none"
                    />
                    <datalist id="specialty-suggestions">
                      {SPECIALTY_OPTIONS.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* Degrees & Qualifications */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Degrees & Qualifications
                  </label>
                  <div className="relative flex items-center rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus-within:border-blue-500 transition-all">
                    <div className="pl-3 text-slate-400">
                      <Award className="w-4 h-4 text-amber-500" />
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. BSc, MSc, MBA, PhD"
                      value={degreeInput}
                      onChange={(e) => setDegreeInput(e.target.value)}
                      className="w-full px-2.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>

                {/* BCS Cadre (Optional) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    BCS Cadre (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 38th BCS (Administration) or 41st BCS"
                    value={cadre}
                    onChange={(e) => setCadre(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Location: City & Country */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Bogura / Dhaka"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      placeholder="Bangladesh"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: Contact Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                {/* Mobile Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus-within:border-blue-500 transition-all overflow-hidden">
                    <div className="px-3 py-2.5 bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold flex-shrink-0 select-none">
                      +880
                    </div>
                    <input
                      type="text"
                      placeholder="1XX-XXXXXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-2.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 bg-transparent focus:outline-none"
                      required
                    />
                  </div>
                </div>

                {/* WhatsApp */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    WhatsApp (For Batch Groups)
                  </label>
                  <div className="relative flex items-center rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus-within:border-emerald-500 transition-all">
                    <div className="pl-3 text-emerald-600 dark:text-emerald-400">
                      <WhatsAppIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. 01711223344"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      className="w-full px-2.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <div className="relative flex items-center rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus-within:border-blue-500 transition-all">
                    <div className="pl-3 text-slate-400">
                      <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <input
                      type="email"
                      placeholder="alumnus@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-2.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: Security & Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Choose Password (পাসওয়ার্ড) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus-within:border-blue-500 transition-all">
                    <div className="pl-3 text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-2.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 bg-transparent focus:outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Confirm Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus-within:border-blue-500 transition-all">
                    <div className="pl-3 text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Re-type password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-2.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 bg-transparent focus:outline-none"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Terms Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600 dark:text-slate-400 select-none">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                  <span>
                    I confirm that I am an alumnus or student of{' '}
                    <strong className="text-slate-900 dark:text-white">Notre Dame College, Dhaka</strong> and agree to uphold the values of Diligite Lumen Sapientiae.
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-blue-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 group disabled:opacity-60"
                >
                  <span>{loading ? 'Creating your Notredamian profile...' : 'Complete Alumni Registration (রেজিস্ট্রেশন করুন)'}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
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
                    <span>{loading ? 'Sending OTP...' : 'Send Verification OTP (ওটিপি পাঠান)'}</span>
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
