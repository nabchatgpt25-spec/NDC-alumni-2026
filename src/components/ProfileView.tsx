import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  MapPin,
  Briefcase,
  GraduationCap,
  Mail,
  Phone,
  Award,
  Calendar,
  ArrowLeft,
  Share2,
  Edit,
  Camera,
  Save,
  Lock,
  Eye,
  CheckCircle2,
  Upload,
  Image as ImageIcon,
  Sparkles,
  Check
} from 'lucide-react';
import { AlumniProfile, SPECIALTIES_LIST, DEGREES_LIST } from '../types';
import { ALUMNI_PROFILES } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { AchievementBadgeChip, BADGE_CONFIGS } from './AchievementBadge';
import { PhotoChangeModal, PhotoType } from './PhotoChangeModal';
import { WhatsAppIcon, FacebookIcon } from './SocialIcons';
import { calculateProfileCompletion } from '../utils/profileCompletion';

interface ProfileViewProps {
  profileId: number;
  onBack: () => void;
  backLabel?: string;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ profileId, onBack, backLabel }) => {
  const { currentUser, updateProfile } = useAuth();
  const isMine = profileId === currentUser.id || profileId === currentUser.userId;

  const initialProfile: AlumniProfile = isMine
    ? currentUser
    : ALUMNI_PROFILES.find((p) => p.id === profileId) || currentUser;

  const [profile, setProfile] = useState<AlumniProfile>(initialProfile);
  const [activeTab, setActiveTab] = useState<'about' | 'timeline' | 'edit'>('about');

  useEffect(() => {
    if (!isMine && activeTab === 'edit') {
      setActiveTab('about');
    }
  }, [isMine, activeTab]);

  // Photo modal state
  const [photoModal, setPhotoModal] = useState<{
    isOpen: boolean;
    type: PhotoType;
    currentUrl: string;
  }>({
    isOpen: false,
    type: 'avatar',
    currentUrl: '',
  });

  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  const editDraftStorageKey = `ndc_profile_edit_draft_v1_${currentUser.id}`;

  const loadEditDraft = () => {
    if (typeof window === 'undefined' || !isMine) return null;
    try {
      const raw = localStorage.getItem(editDraftStorageKey);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed to load profile edit draft', e);
    }
    return null;
  };

  const [initialEditDraft] = useState<Record<string, any> | null>(() => loadEditDraft());

  // Edit form state (restored from localStorage draft if available)
  const [editName, setEditName] = useState<string>(initialEditDraft?.editName ?? profile.fullName);
  const [editBatch, setEditBatch] = useState<number>(initialEditDraft?.editBatch ?? profile.batchYear);
  const [editCollegeRoll, setEditCollegeRoll] = useState<string>(initialEditDraft?.editCollegeRoll ?? (profile.collegeRoll || ''));
  const [editBio, setEditBio] = useState<string>(initialEditDraft?.editBio ?? (profile.bio || ''));
  const [editPosition, setEditPosition] = useState<string>(initialEditDraft?.editPosition ?? (profile.position || ''));
  const [editInstitution, setEditInstitution] = useState<string>(initialEditDraft?.editInstitution ?? (profile.institution || ''));
  const [editProfession, setEditProfession] = useState<string>(initialEditDraft?.editProfession ?? (profile.profession || ''));
  const [editCadre, setEditCadre] = useState<string>(initialEditDraft?.editCadre ?? (profile.cadre || ''));
  const [editCity, setEditCity] = useState<string>(initialEditDraft?.editCity ?? (profile.city || ''));
  const [editCountry, setEditCountry] = useState<string>(initialEditDraft?.editCountry ?? (profile.country || ''));
  const [editWhatsapp, setEditWhatsapp] = useState<string>(initialEditDraft?.editWhatsapp ?? (profile.whatsapp || ''));
  const [editFb, setEditFb] = useState<string>(initialEditDraft?.editFb ?? (profile.fbLink || ''));
  const [editPhone, setEditPhone] = useState<string>(initialEditDraft?.editPhone ?? (profile.phone || ''));
  const [editEmail, setEditEmail] = useState<string>(initialEditDraft?.editEmail ?? (profile.email || ''));
  const [editCareer, setEditCareer] = useState<string>(initialEditDraft?.editCareer ?? (profile.careerHistory || []).join('\n'));
  const [editDegrees, setEditDegrees] = useState<string[]>(initialEditDraft?.editDegrees ?? (profile.degree || []));
  const [editDegreeOther, setEditDegreeOther] = useState<string>(initialEditDraft?.editDegreeOther ?? '');
  const [editSpecialties, setEditSpecialties] = useState<string[]>(initialEditDraft?.editSpecialties ?? (profile.specialty || []));
  const [editSpecialtyOther, setEditSpecialtyOther] = useState<string>(initialEditDraft?.editSpecialtyOther ?? (profile.specialtyOther || ''));
  const [editProfessionOther, setEditProfessionOther] = useState<string>(initialEditDraft?.editProfessionOther ?? '');
  const [editBadges, setEditBadges] = useState<string[]>(initialEditDraft?.editBadges ?? (profile.badges || []));
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Keep profile synchronized when profileId or currentUser changes, respecting any saved localStorage draft for current user
  useEffect(() => {
    if (isMine) {
      setProfile(currentUser);
      const savedDraft = loadEditDraft();
      if (savedDraft) {
        setEditName(savedDraft.editName ?? currentUser.fullName);
        setEditBatch(savedDraft.editBatch ?? currentUser.batchYear);
        setEditCollegeRoll(savedDraft.editCollegeRoll ?? (currentUser.collegeRoll || ''));
        setEditBio(savedDraft.editBio ?? (currentUser.bio || ''));
        setEditPosition(savedDraft.editPosition ?? (currentUser.position || ''));
        setEditInstitution(savedDraft.editInstitution ?? (currentUser.institution || ''));
        setEditProfession(savedDraft.editProfession ?? (currentUser.profession || ''));
        setEditProfessionOther(savedDraft.editProfessionOther ?? '');
        setEditCadre(savedDraft.editCadre ?? (currentUser.cadre || ''));
        setEditCity(savedDraft.editCity ?? (currentUser.city || ''));
        setEditCountry(savedDraft.editCountry ?? (currentUser.country || ''));
        setEditWhatsapp(savedDraft.editWhatsapp ?? (currentUser.whatsapp || ''));
        setEditFb(savedDraft.editFb ?? (currentUser.fbLink || ''));
        setEditPhone(savedDraft.editPhone ?? (currentUser.phone || ''));
        setEditEmail(savedDraft.editEmail ?? (currentUser.email || ''));
        setEditCareer(savedDraft.editCareer ?? (currentUser.careerHistory || []).join('\n'));
        setEditDegrees(savedDraft.editDegrees ?? (currentUser.degree || []));
        setEditDegreeOther(savedDraft.editDegreeOther ?? '');
        setEditSpecialties(savedDraft.editSpecialties ?? (currentUser.specialty || []));
        setEditSpecialtyOther(savedDraft.editSpecialtyOther ?? (currentUser.specialtyOther || ''));
        setEditBadges(savedDraft.editBadges ?? (currentUser.badges || []));
      } else {
        setEditName(currentUser.fullName);
        setEditBatch(currentUser.batchYear);
        setEditCollegeRoll(currentUser.collegeRoll || '');
        setEditBio(currentUser.bio || '');
        setEditPosition(currentUser.position || '');
        setEditInstitution(currentUser.institution || '');
        setEditProfession(currentUser.profession || '');
        setEditProfessionOther('');
        setEditCadre(currentUser.cadre || '');
        setEditCity(currentUser.city || '');
        setEditCountry(currentUser.country || '');
        setEditWhatsapp(currentUser.whatsapp || '');
        setEditFb(currentUser.fbLink || '');
        setEditPhone(currentUser.phone || '');
        setEditEmail(currentUser.email || '');
        setEditCareer((currentUser.careerHistory || []).join('\n'));
        setEditDegrees(currentUser.degree || []);
        setEditDegreeOther('');
        setEditSpecialties(currentUser.specialty || []);
        setEditSpecialtyOther(currentUser.specialtyOther || '');
        setEditBadges(currentUser.badges || []);
      }
    } else {
      const found = ALUMNI_PROFILES.find((p) => p.id === profileId);
      if (found) {
        setProfile(found);
      }
    }
  }, [profileId, currentUser, isMine]);

  // Auto-save Edit Profile form progress (including 'Others' custom inputs) to localStorage
  useEffect(() => {
    if (typeof window === 'undefined' || !isMine) return;
    try {
      const draftPayload = {
        editName,
        editBatch,
        editCollegeRoll,
        editBio,
        editPosition,
        editInstitution,
        editProfession,
        editProfessionOther,
        editCadre,
        editCity,
        editCountry,
        editWhatsapp,
        editFb,
        editPhone,
        editEmail,
        editCareer,
        editDegrees,
        editDegreeOther,
        editSpecialties,
        editSpecialtyOther,
        editBadges,
      };
      localStorage.setItem(editDraftStorageKey, JSON.stringify(draftPayload));
    } catch (e) {
      console.warn('Failed to auto-save profile edit draft', e);
    }
  }, [
    isMine,
    editDraftStorageKey,
    editName,
    editBatch,
    editCollegeRoll,
    editBio,
    editPosition,
    editInstitution,
    editProfession,
    editProfessionOther,
    editCadre,
    editCity,
    editCountry,
    editWhatsapp,
    editFb,
    editPhone,
    editEmail,
    editCareer,
    editDegrees,
    editDegreeOther,
    editSpecialties,
    editSpecialtyOther,
    editBadges,
  ]);

  const savedCompletion = calculateProfileCompletion(profile);
  const liveEditCompletion = calculateProfileCompletion({
    ...profile,
    fullName: editName,
    batchYear: Number(editBatch),
    collegeRoll: editCollegeRoll,
    bio: editBio,
    position: editPosition,
    institution: editInstitution,
    profession: editProfession,
    cadre: editCadre,
    city: editCity,
    country: editCountry,
    whatsapp: editWhatsapp,
    fbLink: editFb,
    phone: editPhone,
    email: editEmail,
    careerHistory: editCareer
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean),
    degree: [
      ...editDegrees.filter((d) => d !== 'Others'),
      ...editDegreeOther.split(',').map((d) => d.trim()).filter(Boolean),
    ],
    specialty: [
      ...editSpecialties.filter((s) => s !== 'Others'),
      ...editSpecialtyOther.split(',').map((s) => s.trim()).filter(Boolean),
    ],
    badges: editBadges,
  });

  const addCustomDegree = () => {
    const customItems = editDegreeOther
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean);
    if (customItems.length === 0) return;
    setEditDegrees((prev) => {
      const next = [...prev];
      customItems.forEach((item) => {
        if (!next.includes(item)) next.push(item);
      });
      return next;
    });
    setEditDegreeOther('');
  };

  const addCustomSpecialty = () => {
    const customItems = editSpecialtyOther
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (customItems.length === 0) return;
    setEditSpecialties((prev) => {
      const next = [...prev];
      customItems.forEach((item) => {
        if (!next.includes(item)) next.push(item);
      });
      return next;
    });
    setEditSpecialtyOther('');
  };

  const toggleBadge = (badgeName: string) => {
    setEditBadges((prev) =>
      prev.includes(badgeName) ? prev.filter((b) => b !== badgeName) : [...prev, badgeName]
    );
  };

  const toggleDegree = (deg: string) => {
    setEditDegrees((prev) =>
      prev.includes(deg) ? prev.filter((d) => d !== deg) : [...prev, deg]
    );
  };

  const toggleSpecialty = (spec: string) => {
    setEditSpecialties((prev) =>
      prev.includes(spec) ? prev.filter((s) => s !== spec) : [...prev, spec]
    );
  };

  const handleOpenPhotoModal = (type: PhotoType) => {
    setPhotoModal({
      isOpen: true,
      type,
      currentUrl: type === 'avatar' ? profile.avatarUrl : profile.coverUrl,
    });
  };

  const handleSavePhoto = (newUrl: string) => {
    if (photoModal.type === 'avatar') {
      updateProfile({ avatarUrl: newUrl });
      setProfile((prev) => ({ ...prev, avatarUrl: newUrl }));
    } else {
      updateProfile({ coverUrl: newUrl });
      setProfile((prev) => ({ ...prev, coverUrl: newUrl }));
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleDirectFileInput = (e: React.ChangeEvent<HTMLInputElement>, type: PhotoType) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result && typeof event.target.result === 'string') {
          const dataUrl = event.target.result;
          if (type === 'avatar') {
            updateProfile({ avatarUrl: dataUrl });
            setProfile((prev) => ({ ...prev, avatarUrl: dataUrl }));
          } else {
            updateProfile({ coverUrl: dataUrl });
            setProfile((prev) => ({ ...prev, coverUrl: dataUrl }));
          }
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 2000);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedCareerList = editCareer
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const finalDegrees = Array.from(
      new Set([
        ...editDegrees.filter((d) => d !== 'Others'),
        ...editDegreeOther
          .split(',')
          .map((d) => d.trim())
          .filter(Boolean),
      ])
    );

    const finalSpecialties = Array.from(
      new Set([
        ...editSpecialties.filter((s) => s !== 'Others'),
        ...editSpecialtyOther
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      ])
    );

    const finalProfession =
      editProfession === 'Others' && editProfessionOther.trim()
        ? editProfessionOther.trim()
        : editProfession;

    const updatedData: Partial<AlumniProfile> = {
      fullName: editName,
      batchYear: Number(editBatch),
      collegeRoll: editCollegeRoll,
      bio: editBio,
      position: editPosition,
      institution: editInstitution,
      profession: finalProfession,
      cadre: editCadre,
      city: editCity,
      country: editCountry,
      whatsapp: editWhatsapp,
      fbLink: editFb,
      phone: editPhone,
      email: editEmail,
      careerHistory: updatedCareerList,
      degree: finalDegrees,
      specialty: finalSpecialties,
      specialtyOther: editSpecialtyOther,
      badges: editBadges,
    };

    setEditDegrees(finalDegrees);
    setEditSpecialties(finalSpecialties);
    setEditDegreeOther('');
    setEditSpecialtyOther('');
    setEditProfessionOther('');

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(editDraftStorageKey);
      } catch (e) {
        console.warn('Failed to clear profile edit draft', e);
      }
    }

    updateProfile(updatedData);
    setProfile((prev) => ({ ...prev, ...updatedData }));
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setActiveTab('about');
    }, 1200);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{backLabel || 'Back to Directory'}</span>
      </button>

      {/* Profile Card Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
        {/* Cover Photo */}
        <div
          className="h-48 sm:h-64 w-full bg-cover bg-center relative group"
          style={{
            backgroundImage: profile.coverUrl
              ? `url(${profile.coverUrl})`
              : 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {isMine && (
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <input
                ref={coverFileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleDirectFileInput(e, 'cover')}
                className="hidden"
              />
              <button
                type="button"
                id="header-change-cover-btn"
                onClick={() => handleOpenPhotoModal('cover')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-950/75 hover:bg-slate-950/90 text-white text-xs font-bold rounded-xl backdrop-blur-md transition-all shadow-md cursor-pointer border border-white/20 active:scale-95"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Change Cover</span>
              </button>
            </div>
          )}
        </div>

        {/* Head Bar */}
        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-4">
            {/* Avatar & Basic Info */}
            <div className="flex items-end gap-4">
              <div className="relative group">
                <input
                  ref={avatarFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleDirectFileInput(e, 'avatar')}
                  className="hidden"
                />
                <img
                  src={profile.avatarUrl}
                  alt={profile.fullName}
                  className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover ring-4 ring-white dark:ring-slate-900 shadow-lg bg-white"
                />
                <span
                  className={`absolute bottom-2 right-2 w-4 h-4 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                    profile.online ? 'bg-emerald-500' : 'bg-slate-400'
                  }`}
                  title={profile.online ? 'Online' : 'Offline'}
                />

                {isMine && (
                  <>
                    <button
                      type="button"
                      id="change-avatar-overlay-btn"
                      onClick={() => handleOpenPhotoModal('avatar')}
                      className="absolute inset-0 rounded-full bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white cursor-pointer"
                      title="Change Profile Picture"
                    >
                      <Camera className="w-6 h-6 mb-0.5" />
                      <span className="text-[10px] font-bold">Update</span>
                    </button>
                    <button
                      type="button"
                      id="change-avatar-badge-btn"
                      onClick={() => handleOpenPhotoModal('avatar')}
                      className="absolute bottom-0 right-0 p-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white ring-2 ring-white dark:ring-slate-900 shadow-md transition-transform hover:scale-110 active:scale-95 cursor-pointer z-10"
                      title="Change Profile Picture"
                      aria-label="Change Profile Picture"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>

              <div className="mb-2">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
                    {profile.fullName}
                  </h1>
                  <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2 mt-0.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800">
                    Batch {profile.batchYear}
                  </span>
                  <span>{profile.profession}</span>
                  {profile.cadre && <span>· {profile.cadre}</span>}
                </div>

                {/* Achievement Badges in Header */}
                {profile.badges && profile.badges.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {profile.badges.map((badge) => (
                      <AchievementBadgeChip key={badge} badgeName={badge} size="md" />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Social & Contact Actions */}
            <div className="flex items-center gap-2 pt-2 sm:pt-0">
              {profile.whatsapp && (
                <a
                  href={`https://wa.me/${profile.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
                  aria-label="WhatsApp"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                  <span>WhatsApp</span>
                </a>
              )}

              {profile.fbLink && (
                <a
                  href={profile.fbLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
                  aria-label="Facebook"
                >
                  <FacebookIcon className="w-4 h-4" />
                  <span>Facebook</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(window.location.href);
                  alert('Profile link copied to clipboard!');
                }}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                title="Share profile"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Current Position Banner */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
              <Briefcase className="w-4 h-4 text-blue-600" />
              <span>{profile.position || 'Position not set'}</span>
              <span className="text-slate-400">at</span>
              <span className="text-slate-900 dark:text-slate-100">{profile.institution || 'Organization not set'}</span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {profile.city || profile.country
                  ? [profile.city, profile.country].filter(Boolean).join(', ')
                  : 'Location not set'}
              </span>
            </div>
          </div>

          {/* Profile Completion Level Card (Visible on own profile) */}
          {isMine && (
            <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-emerald-50/60 dark:from-slate-800/90 dark:via-slate-800/70 dark:to-slate-800/90 border border-blue-200/70 dark:border-slate-700">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-sm shrink-0">
                    {savedCompletion.percentage}%
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                        Profile Completion Level
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          savedCompletion.percentage === 100
                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                            : 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30'
                        }`}
                      >
                        {savedCompletion.completedCount}/{savedCompletion.totalCount} Total Fields
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                      Registration Form: <strong>{savedCompletion.registrationCompletedCount}/{savedCompletion.registrationTotalCount}</strong> · Edit Profile Full Form: <strong>{savedCompletion.editProfileCompletedCount}/{savedCompletion.editProfileTotalCount}</strong>
                    </p>
                  </div>
                </div>

                {activeTab !== 'edit' && savedCompletion.percentage < 100 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('edit')}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Complete Full Profile</span>
                  </button>
                )}
              </div>

              <div className="w-full h-2.5 rounded-full bg-slate-200/80 dark:bg-slate-950/70 overflow-hidden p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    savedCompletion.percentage === 100
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                      : 'bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500'
                  }`}
                  style={{ width: `${savedCompletion.percentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Tab Selector */}
          <div className="flex gap-4 mt-6 border-b border-slate-100 dark:border-slate-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('about')}
              className={`pb-3 border-b-2 transition-colors ${
                activeTab === 'about'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              About & Credentials
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('timeline')}
              className={`pb-3 border-b-2 transition-colors ${
                activeTab === 'timeline'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Career & Education Timeline
            </button>

            {isMine && (
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'edit'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tab 1: ABOUT */}
      {activeTab === 'about' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {profile.bio && (
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs md:col-span-2">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                Biography
              </h3>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {profile.bio}
              </p>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-sm">
              <GraduationCap className="w-4 h-4 text-blue-600" />
              <span>Degrees & Educational Qualifications</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.degree && profile.degree.map((deg, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900 text-xs font-bold rounded-xl"
                >
                  {deg}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-sm">
              <Award className="w-4 h-4 text-emerald-600" />
              <span>Professional Specialties & Expertise</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.specialty && profile.specialty.map((spec, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900 text-xs font-bold rounded-xl"
                >
                  {spec}
                </span>
              ))}
            </div>
          </div>

          {/* Achievement Badges & Recognition Card */}
          {profile.badges && profile.badges.length > 0 && (
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs md:col-span-2 space-y-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-sm">
                <Award className="w-4 h-4 text-amber-500" />
                <span>Achievement Badges & Community Recognition</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                {profile.badges.map((b) => (
                  <AchievementBadgeChip key={b} badgeName={b} size="lg" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: TIMELINE */}
      {activeTab === 'timeline' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>Career Milestones & Institutional Postings</span>
          </h3>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-blue-200 dark:before:bg-blue-900">
            {profile.careerHistory && profile.careerHistory.length > 0 ? (
              profile.careerHistory.map((line, idx) => (
                <div key={idx} className="relative group">
                  <span className="absolute -left-6 top-1.5 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-2 border-blue-600 ring-4 ring-blue-50 dark:ring-blue-950/60" />
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                    {line}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400">No career history entries available yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: EDIT PROFILE (for current user) */}
      {activeTab === 'edit' && isMine && (
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          {saveSuccess && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Profile updated successfully!</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-6">
            {/* Live Full Profile Completion Level Tracker (Registration Form + Edit Profile Full Form) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                    Live Profile Completion Level (Registration + Full Edit Profile)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    Reg: {liveEditCompletion.registrationCompletedCount}/{liveEditCompletion.registrationTotalCount} · Extended: {liveEditCompletion.editProfileCompletedCount}/{liveEditCompletion.editProfileTotalCount}
                  </span>
                  <span
                    className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
                      liveEditCompletion.percentage === 100
                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
                        : 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
                    }`}
                  >
                    {liveEditCompletion.percentage}% ({liveEditCompletion.completedCount}/{liveEditCompletion.totalCount})
                  </span>
                </div>
              </div>

              <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-900 overflow-hidden p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    liveEditCompletion.percentage === 100
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                      : 'bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500'
                  }`}
                  style={{ width: `${liveEditCompletion.percentage}%` }}
                />
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {liveEditCompletion.fields.map((item) => (
                  <span
                    key={item.key}
                    className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border transition-colors ${
                      item.filled
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                        : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {item.filled && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    <span>{item.label}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Section 0: Profile Photos & Visual Identity */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                <Camera className="w-3.5 h-3.5" />
                <span>Profile Photos & Visual Identity</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Profile Picture Box */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={profile.avatarUrl}
                      alt={profile.fullName}
                      className="w-16 h-16 rounded-full object-cover ring-2 ring-blue-500/20 shadow-xs"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        Profile Picture
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Appears on directory cards, feed updates, and comments.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                    <button
                      type="button"
                      id="edit-tab-change-avatar-btn"
                      onClick={() => handleOpenPhotoModal('avatar')}
                      className="flex-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Change Photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => avatarFileInputRef.current?.click()}
                      className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      title="Upload from device"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload</span>
                    </button>
                  </div>
                </div>

                {/* Cover Banner Box */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                  <div>
                    <div
                      className="w-full h-16 rounded-lg bg-cover bg-center mb-2.5 border border-slate-200 dark:border-slate-700"
                      style={{ backgroundImage: `url(${profile.coverUrl})` }}
                    />
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Cover Banner Photo
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 mb-3">
                      Header banner on your Notre Dame alumni profile.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                    <button
                      type="button"
                      id="edit-tab-change-cover-btn"
                      onClick={() => handleOpenPhotoModal('cover')}
                      className="flex-1 py-1.5 px-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Change Cover</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => coverFileInputRef.current?.click()}
                      className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      title="Upload from device"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 1: Basic Info */}
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3">
                1. Personal Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Notre Dame HSC Year
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1949}
                    max={new Date().getFullYear() + 2}
                    placeholder="e.g. 2016"
                    value={editBatch || ''}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setEditBatch(digits ? Number(digits) : 0);
                    }}
                    required
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    College Roll / Registration ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 118042 or 214015"
                    value={editCollegeRoll}
                    onChange={(e) => setEditCollegeRoll(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Biography / About Me
                  </label>
                  <textarea
                    rows={3}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Career & Organization */}
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3">
                2. Professional & Career Postings
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Current Designation / Position
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Software Architect / Lead Consultant"
                    value={editPosition}
                    onChange={(e) => setEditPosition(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Organization / Company / Institution
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Google, BUET, Grameenphone, Notre Dame College"
                    value={editInstitution}
                    onChange={(e) => setEditInstitution(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Profession Type
                  </label>
                  <select
                    value={editProfession}
                    onChange={(e) => setEditProfession(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Profession Type</option>
                    <option value="Engineer / Tech Executive">Engineer / Tech Executive</option>
                    <option value="Doctor / Medical Specialist">Doctor / Medical Specialist</option>
                    <option value="Academic & Researcher">Academic & Researcher</option>
                    <option value="Corporate Executive & Leader">Corporate Executive & Leader</option>
                    <option value="Entrepreneur & Founder">Entrepreneur & Founder</option>
                    <option value="Civil Servant / Administration">Civil Servant / Administration</option>
                    <option value="Diplomat & Foreign Service">Diplomat & Foreign Service</option>
                    <option value="Defense & Armed Forces Officer">Defense & Armed Forces Officer</option>
                    <option value="Lawyer & Legal Counsel">Lawyer & Legal Counsel</option>
                    <option value="Banker & Financial Analyst">Banker & Financial Analyst</option>
                    <option value="Chartered Accountant & Auditor">Chartered Accountant & Auditor</option>
                    <option value="Architect & Urban Planner">Architect & Urban Planner</option>
                    <option value="Pharmacist & Biotech Specialist">Pharmacist & Biotech Specialist</option>
                    <option value="Journalist & Media Professional">Journalist & Media Professional</option>
                    <option value="Development & NGO Specialist">Development & NGO Specialist</option>
                    <option value="University Student">University Student</option>
                    <option value="Professional Consultant">Professional Consultant</option>
                    <option value="Others">Others</option>
                  </select>
                  {editProfession === 'Others' && (
                    <input
                      type="text"
                      placeholder="Write your custom profession..."
                      value={editProfessionOther}
                      onChange={(e) => setEditProfessionOther(e.target.value)}
                      className="mt-2 w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-800 border border-blue-400 dark:border-blue-500 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Civil Service / BCS Cadre (if applicable)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 41st BCS (Administration / Foreign Affairs)"
                    value={editCadre}
                    onChange={(e) => setEditCadre(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Degrees (Click to toggle)
                  </label>
                  <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                    {Array.from(
                      new Set([
                        ...DEGREES_LIST.filter((d) => d !== 'Others'),
                        ...editDegrees.filter((d) => d !== 'Others' && !DEGREES_LIST.includes(d)),
                        'Others',
                      ])
                    ).map((deg) => (
                      <button
                        key={deg}
                        type="button"
                        onClick={() => toggleDegree(deg)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                          editDegrees.includes(deg)
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                        }`}
                      >
                        {deg}
                      </button>
                    ))}
                  </div>
                  {editDegrees.includes('Others') && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Write your custom degree(s) (e.g. FRCS, DPhil, PGDip)..."
                        value={editDegreeOther}
                        onChange={(e) => setEditDegreeOther(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addCustomDegree();
                          }
                        }}
                        className="flex-1 px-3.5 py-2 text-xs bg-white dark:bg-slate-800 border border-blue-400 dark:border-blue-500 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={addCustomDegree}
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0"
                      >
                        + Add Degree
                      </button>
                    </div>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Specialties
                  </label>
                  <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 max-h-40 overflow-y-auto">
                    {Array.from(
                      new Set([
                        ...SPECIALTIES_LIST.filter((s) => s !== 'Others'),
                        ...editSpecialties.filter((s) => s !== 'Others' && !SPECIALTIES_LIST.includes(s)),
                        'Others',
                      ])
                    ).map((spec) => (
                      <button
                        key={spec}
                        type="button"
                        onClick={() => toggleSpecialty(spec)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                          editSpecialties.includes(spec)
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                        }`}
                      >
                        {spec}
                      </button>
                    ))}
                  </div>
                  {editSpecialties.includes('Others') && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Write your custom specialty/specialties (e.g. Interventional Cardiology, Robotics)..."
                        value={editSpecialtyOther}
                        onChange={(e) => setEditSpecialtyOther(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addCustomSpecialty();
                          }
                        }}
                        className="flex-1 px-3.5 py-2 text-xs bg-white dark:bg-slate-800 border border-emerald-400 dark:border-emerald-500 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={addCustomSpecialty}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0"
                      >
                        + Add Specialty
                      </button>
                    </div>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Career Timeline Entries (One entry per line)
                  </label>
                  <textarea
                    rows={4}
                    value={editCareer}
                    onChange={(e) => setEditCareer(e.target.value)}
                    placeholder="e.g. 2024 - Present: Senior Software Engineer, Google&#10;2020 - 2024: Software Engineer, Grameenphone"
                    className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Location & Contacts */}
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3">
                3. Location & Direct Contacts
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+8801XXXXXXXXX"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="alumnus@gmail.com"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={editCountry}
                    onChange={(e) => setEditCountry(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    <span className="p-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                      <WhatsAppIcon className="w-3.5 h-3.5" />
                    </span>
                    <span>WhatsApp Number</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="+8801XXXXXXXXX"
                    value={editWhatsapp}
                    onChange={(e) => setEditWhatsapp(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    <span className="p-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                      <FacebookIcon className="w-3.5 h-3.5" />
                    </span>
                    <span>Facebook Profile Link</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://facebook.com/username"
                    value={editFb}
                    onChange={(e) => setEditFb(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('about')}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Profile Changes</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Interactive Photo Change Modal (Upload, Presets, or Link) */}
      <PhotoChangeModal
        isOpen={photoModal.isOpen}
        type={photoModal.type}
        currentUrl={photoModal.currentUrl}
        fullName={profile.fullName}
        onClose={() => setPhotoModal((prev) => ({ ...prev, isOpen: false }))}
        onSave={handleSavePhoto}
      />
    </div>
  );
};
