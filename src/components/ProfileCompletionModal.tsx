import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  User,
  GraduationCap,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  Globe,
  Briefcase,
  Building,
  Award,
  Droplet,
  Camera,
  Check,
  ChevronDown,
  Sparkles,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NDCLogo } from './NDCLogo';
import { formatToE164Phone, normalizePhoneNumber } from '../utils/phone';
import { normalizeAcademicStreamAndGroup } from '../utils/academicGroupMapping';
import { compressImageFileToDataUrl } from '../utils/mediaStorage';
import { calculateProfileCompletion } from '../utils/profileCompletion';
import confetti from 'canvas-confetti';

interface ProfileCompletionModalProps {
  isOpen: boolean;
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
  'Biotechnology & Genetic Engineering',
  'Business Administration & Management',
  'Finance, Banking & Investment',
  'Chartered Accountancy & Audit',
  'Entrepreneurship & Startups',
  'Medicine, Surgery & Health',
  'Civil Service & Administration (BCS)',
  'Foreign Affairs & Diplomacy',
  'Law & Jurisprudence',
  'Higher Education & Research',
];

const COMMON_DEGREES = [
  'HSC',
  'BSc Engineering',
  'BSc',
  'MBBS',
  'BBA',
  'MBA',
  'MSc',
  'PhD',
  'LLB',
  'CA / ACA',
  'BCS',
];

const SCIENCE_GROUPS = Array.from({ length: 17 }, (_, i) =>
  i + 1 < 10 ? `0${i + 1}` : `${i + 1}`
);
const HUMANITIES_GROUPS = ['G', 'H', 'L', 'W'];
const BUSINESS_GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const ProfileCompletionModal: React.FC<ProfileCompletionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currentUser, updateProfile, setIsProfileIncomplete } = useAuth();

  const [fullName, setFullName] = useState(currentUser.fullName || '');
  const [batchYear, setBatchYear] = useState<string>(() => {
    if (currentUser.batchYear && currentUser.batchYear >= 1949 && currentUser.batchYear !== 2026) {
      return String(currentUser.batchYear);
    }
    return '';
  });
  const [collegeRoll, setCollegeRoll] = useState(currentUser.collegeRoll || '');
  const [academicGroup, setAcademicGroup] = useState(currentUser.academicGroup ? `${currentUser.academicStream || 'Science'} ${currentUser.academicGroup}` : (currentUser.academicStream || ''));
  const [phone, setPhone] = useState(currentUser.phone ? currentUser.phone.replace(/^\+880/, '') : '');
  const [whatsapp, setWhatsapp] = useState(currentUser.whatsapp ? currentUser.whatsapp.replace(/^\+880/, '') : '');
  const [bloodGroup, setBloodGroup] = useState(currentUser.bloodGroup || '');
  const [position, setPosition] = useState(currentUser.position || '');
  const [institution, setInstitution] = useState(currentUser.institution || '');
  const [specialtyInput, setSpecialtyInput] = useState(
    Array.isArray(currentUser.specialty) ? currentUser.specialty.join(', ') : ''
  );
  const [degreeInput, setDegreeInput] = useState(
    Array.isArray(currentUser.degree) ? currentUser.degree.join(', ') : 'HSC'
  );
  const [city, setCity] = useState(currentUser.city || 'Dhaka');
  const [country, setCountry] = useState(currentUser.country || 'Bangladesh');
  const [selectedAvatar, setSelectedAvatar] = useState(currentUser.avatarUrl || '/ndc-logo.png');

  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const yearDropdownRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successCelebration, setSuccessCelebration] = useState(false);

  const currentYear = new Date().getFullYear();
  const maxAllowedHscYear = currentYear + 1;
  const minAllowedHscYear = 1949;

  const hscYearOptions = useMemo(() => {
    const list: number[] = [];
    for (let y = minAllowedHscYear; y <= maxAllowedHscYear; y++) {
      list.push(y);
    }
    return list;
  }, [minAllowedHscYear, maxAllowedHscYear]);

  const filteredYears = useMemo(() => {
    const q = batchYear.trim();
    const sortedDescending = [...hscYearOptions].reverse();
    if (!q) return sortedDescending;
    return sortedDescending.filter((yr) => String(yr).startsWith(q) || String(yr).includes(q));
  }, [hscYearOptions, batchYear]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(event.target as Node)) {
        setIsYearDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCustomAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFileToDataUrl(file, 400, 0.85);
      setSelectedAvatar(dataUrl);
    } catch {
      setErrorMessage('Could not process avatar image. Please try another image.');
    }
  };

  const toggleSpecialty = (chip: string) => {
    const current = specialtyInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (current.includes(chip)) {
      setSpecialtyInput(current.filter((s) => s !== chip).join(', '));
    } else {
      setSpecialtyInput([...current, chip].join(', '));
    }
  };

  const toggleDegree = (chip: string) => {
    const current = degreeInput
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean);
    if (current.includes(chip)) {
      setDegreeInput(current.filter((d) => d !== chip).join(', '));
    } else {
      setDegreeInput([...current, chip].join(', '));
    }
  };

  const liveCompletion = useMemo(() => {
    return calculateProfileCompletion({
      ...currentUser,
      fullName,
      batchYear: batchYear ? Number(batchYear) : undefined,
      collegeRoll,
      phone,
      email: currentUser.email,
      position,
      institution,
      specialty: specialtyInput.split(',').map((s) => s.trim()).filter(Boolean),
      degree: degreeInput.split(',').map((d) => d.trim()).filter(Boolean),
      city,
      country,
      whatsapp,
    });
  }, [
    currentUser,
    fullName,
    batchYear,
    collegeRoll,
    phone,
    position,
    institution,
    specialtyInput,
    degreeInput,
    city,
    country,
    whatsapp,
  ]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    const effectiveBatch = batchYear.trim();
    if (!effectiveBatch || !/^\d{4}$/.test(effectiveBatch)) {
      setErrorMessage('Please select or enter your 4-digit Notre Dame HSC Year.');
      return;
    }
    const parsedBatch = Math.round(Number(effectiveBatch));
    if (parsedBatch < minAllowedHscYear || parsedBatch > maxAllowedHscYear) {
      setErrorMessage(`Please enter an HSC Year between ${minAllowedHscYear} and ${maxAllowedHscYear}.`);
      return;
    }

    setLoading(true);
    try {
      const cleanPhone = phone.trim() ? formatToE164Phone(phone) : currentUser.phone;
      const cleanWhatsapp = whatsapp.trim() ? formatToE164Phone(whatsapp) : currentUser.whatsapp;
      const streamGroup = normalizeAcademicStreamAndGroup(academicGroup);

      const degreeArray = degreeInput
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean);

      const specialtyArray = specialtyInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await updateProfile({
        fullName: fullName.trim(),
        batchYear: parsedBatch,
        collegeRoll: collegeRoll.trim() || undefined,
        academicStream: streamGroup.academicStream,
        academicGroup: streamGroup.academicGroup,
        group: streamGroup.academicStream,
        section: streamGroup.academicGroup ? `Group ${streamGroup.academicGroup}` : 'Section A',
        phone: cleanPhone,
        whatsapp: cleanWhatsapp,
        bloodGroup: bloodGroup || undefined,
        position: position.trim() || undefined,
        institution: institution.trim() || undefined,
        profession: position.trim() || 'Alumnus',
        specialty: specialtyArray,
        degree: degreeArray.length > 0 ? degreeArray : ['HSC'],
        city: city.trim() || 'Dhaka',
        country: country.trim() || 'Bangladesh',
        avatarUrl: selectedAvatar,
      });

      setIsProfileIncomplete(false);
      setSuccessCelebration(true);

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}

      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
      }, 1400);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || 'Failed to update profile. Please review your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto bg-slate-900/50 dark:bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl my-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/60 dark:border-white/10 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="relative px-5 py-4 border-b border-slate-200/80 dark:border-white/10 bg-gradient-to-r from-blue-600/10 via-amber-500/10 to-transparent flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-white dark:bg-slate-800 p-1 border border-slate-200 dark:border-white/15 shadow-sm flex items-center justify-center shrink-0">
              <NDCLogo className="w-full h-full" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
                  Complete Your Notredamian Profile
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-400/30">
                  <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  <span>Onboarding</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                Connect with batchmates, verify your roll, and unlock full directory features
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-600 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-2"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Profile Completion Tracker */}
        <div className="px-5 py-2.5 bg-blue-50/70 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/30 flex items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-slate-700 dark:text-slate-300 truncate">
              Live Profile Completion:
            </span>
            <span className="font-extrabold text-blue-600 dark:text-blue-400">
              {liveCompletion.percentage}%
            </span>
            <span className="text-slate-400 dark:text-slate-500 text-[11px] hidden sm:inline">
              ({liveCompletion.completedCount}/{liveCompletion.totalCount} attributes)
            </span>
          </div>
          <div className="w-28 sm:w-36 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden shrink-0">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-300"
              style={{ width: `${liveCompletion.percentage}%` }}
            />
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="relative p-5 overflow-y-auto space-y-5">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successCelebration ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Profile Updated Successfully!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Welcome to your Notre Dame College Alumni Network dashboard.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* SECTION 1: Identity & Academic */}
              <div className="rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/10 p-4 space-y-3.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Academic Identity & Batch</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Full Name */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-3 py-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
                      <User className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Md. Tanvir Ahmed Chowdhury"
                        className="w-full text-xs sm:text-sm bg-transparent text-slate-900 dark:text-white focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  {/* HSC Batch Year */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Notre Dame HSC Year <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative" ref={yearDropdownRef}>
                      <div className="flex items-center rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-3 py-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
                        <GraduationCap className="w-4 h-4 text-blue-600 mr-2 shrink-0" />
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={4}
                          placeholder="e.g. 2018"
                          value={batchYear}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                            setBatchYear(val);
                            setIsYearDropdownOpen(true);
                          }}
                          onFocus={() => setIsYearDropdownOpen(true)}
                          className="w-full text-xs sm:text-sm bg-transparent text-slate-900 dark:text-white focus:outline-none pr-6"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setIsYearDropdownOpen((prev) => !prev)}
                          className="absolute right-2 p-1 text-slate-400 hover:text-slate-600"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>

                      {isYearDropdownOpen && (
                        <div className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl p-1">
                          {filteredYears.map((yr) => (
                            <button
                              key={yr}
                              type="button"
                              onClick={() => {
                                setBatchYear(String(yr));
                                setIsYearDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium ${
                                batchYear === String(yr)
                                  ? 'bg-blue-600 text-white font-bold'
                                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              Batch {yr}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* College Roll */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      College Roll / ID
                    </label>
                    <div className="flex items-center rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-3 py-2 focus-within:border-blue-500">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 mr-2 shrink-0" />
                      <input
                        type="text"
                        value={collegeRoll}
                        onChange={(e) => setCollegeRoll(e.target.value)}
                        placeholder="e.g. 118042"
                        className="w-full text-xs sm:text-sm bg-transparent text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Academic Group Selector */}
                  <div className="sm:col-span-2 pt-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Academic Group / Stream
                    </label>
                    <div className="space-y-2">
                      <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        Science (Groups 01–17)
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {SCIENCE_GROUPS.map((code) => {
                          const val = `Science ${code}`;
                          const isSel = academicGroup === val;
                          return (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setAcademicGroup(isSel ? '' : val)}
                              className={`h-6 px-2 rounded text-[11px] font-bold cursor-pointer transition-all ${
                                isSel
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-blue-400'
                              }`}
                            >
                              {code}
                            </button>
                          );
                        })}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <div>
                          <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Humanities (G, H, L, W)
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {HUMANITIES_GROUPS.map((code) => {
                              const val = `Humanities ${code}`;
                              const isSel = academicGroup === val;
                              return (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => setAcademicGroup(isSel ? '' : val)}
                                  className={`h-6 px-2 rounded text-[11px] font-bold cursor-pointer transition-all ${
                                    isSel
                                      ? 'bg-blue-600 text-white shadow-xs'
                                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                  }`}
                                >
                                  {code}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Business Studies (A–H)
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {BUSINESS_GROUPS.map((code) => {
                              const val = `Business Studies ${code}`;
                              const isSel = academicGroup === val;
                              return (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => setAcademicGroup(isSel ? '' : val)}
                                  className={`h-6 px-2 rounded text-[11px] font-bold cursor-pointer transition-all ${
                                    isSel
                                      ? 'bg-blue-600 text-white shadow-xs'
                                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
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
                  </div>
                </div>
              </div>

              {/* SECTION 2: Contact & Blood Group */}
              <div className="rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/10 p-4 space-y-3.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Contact Information & Blood Network</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Mobile Number */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Mobile Number
                    </label>
                    <div className="flex items-center rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 overflow-hidden focus-within:border-blue-500">
                      <span className="px-2.5 py-2 bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 border-r border-slate-300 dark:border-slate-700">
                        +880
                      </span>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="1XXXXXXXXX"
                        className="w-full px-2.5 py-2 text-xs sm:text-sm bg-transparent text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* WhatsApp */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        WhatsApp Number
                      </label>
                      {phone.trim() && (
                        <button
                          type="button"
                          onClick={() => setWhatsapp(phone)}
                          className="text-[10px] text-blue-600 hover:underline font-bold cursor-pointer"
                        >
                          Same as Mobile
                        </button>
                      )}
                    </div>
                    <div className="flex items-center rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 overflow-hidden focus-within:border-blue-500">
                      <span className="px-2.5 py-2 bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 border-r border-slate-300 dark:border-slate-700">
                        +880
                      </span>
                      <input
                        type="text"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        placeholder="1XXXXXXXXX"
                        className="w-full px-2.5 py-2 text-xs sm:text-sm bg-transparent text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Blood Group */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Droplet className="w-3.5 h-3.5 text-rose-500" />
                      <span>Blood Group (For Emergency Blood Network)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {BLOOD_GROUPS.map((bg) => (
                        <button
                          key={bg}
                          type="button"
                          onClick={() => setBloodGroup(bloodGroup === bg ? '' : bg)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer transition-all ${
                            bloodGroup === bg
                              ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-500/30'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:border-rose-400'
                          }`}
                        >
                          {bg}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Professional & Career */}
              <div className="rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/10 p-4 space-y-3.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Briefcase className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Professional Background</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Current Role / Profession
                    </label>
                    <div className="flex items-center rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-3 py-2 focus-within:border-blue-500">
                      <Briefcase className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                      <input
                        type="text"
                        value={position}
                        onChange={(e) => setPosition(e.target.value)}
                        placeholder="e.g. Software Engineer, Doctor, Professor"
                        className="w-full text-xs sm:text-sm bg-transparent text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Organization / Workplace
                    </label>
                    <div className="flex items-center rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-3 py-2 focus-within:border-blue-500">
                      <Building className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                      <input
                        type="text"
                        value={institution}
                        onChange={(e) => setInstitution(e.target.value)}
                        placeholder="e.g. Google, BUET, Dhaka Medical"
                        className="w-full text-xs sm:text-sm bg-transparent text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Specialty Chips */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Field / Specialty
                    </label>
                    <input
                      type="text"
                      value={specialtyInput}
                      onChange={(e) => setSpecialtyInput(e.target.value)}
                      placeholder="e.g. Artificial Intelligence, Cardiology, Corporate Law"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none mb-1.5"
                    />
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {SPECIALTY_OPTIONS.map((opt) => {
                        const isSelected = specialtyInput.includes(opt);
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => toggleSpecialty(opt)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-semibold cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-blue-600 text-white'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-blue-400'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Degree Chips */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Degrees & Qualifications
                    </label>
                    <input
                      type="text"
                      value={degreeInput}
                      onChange={(e) => setDegreeInput(e.target.value)}
                      placeholder="e.g. HSC, BSc, MBA, PhD"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none mb-1.5"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {COMMON_DEGREES.map((deg) => {
                        const isSelected = degreeInput.includes(deg);
                        return (
                          <button
                            key={deg}
                            type="button"
                            onClick={() => toggleDegree(deg)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-semibold cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-emerald-600 text-white'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                            }`}
                          >
                            {deg}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4: Location & Avatar */}
              <div className="rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/10 p-4 space-y-3.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  <span>Location & Profile Photo</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Dhaka"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="e.g. Bangladesh"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  {/* Avatar Picker */}
                  <div className="sm:col-span-2 pt-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Profile Avatar / Photo
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl border-2 border-blue-500/50 p-0.5 overflow-hidden shrink-0 bg-white dark:bg-slate-800">
                        <img
                          src={selectedAvatar}
                          alt="Avatar preview"
                          className="w-full h-full object-cover rounded-xl"
                        />
                      </div>
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setSelectedAvatar('/ndc-logo.png')}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                              selectedAvatar === '/ndc-logo.png'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            Official Crest
                          </button>
                          {AVATAR_PRESETS.map((preset, idx) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setSelectedAvatar(preset)}
                              className={`w-7 h-7 rounded-lg overflow-hidden border-2 cursor-pointer ${
                                selectedAvatar === preset ? 'border-blue-600 scale-105' : 'border-transparent'
                              }`}
                            >
                              <img src={preset} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                        <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                          <Camera className="w-3.5 h-3.5" />
                          <span>Upload Custom Photo</span>
                          <input type="file" accept="image/*" onChange={handleCustomAvatarUpload} className="hidden" />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  Remind Me Later
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-blue-600/30 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-60"
                >
                  <span>{loading ? 'Saving Profile...' : 'Save & Complete Profile'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
