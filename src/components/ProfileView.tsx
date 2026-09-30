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
  Image as ImageIcon
} from 'lucide-react';
import { AlumniProfile, SPECIALTIES_LIST, DEGREES_LIST } from '../types';
import { ALUMNI_PROFILES } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { AchievementBadgeChip, BADGE_CONFIGS } from './AchievementBadge';
import { PhotoChangeModal, PhotoType } from './PhotoChangeModal';
import { WhatsAppIcon, FacebookIcon } from './SocialIcons';

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

  // Edit form state
  const [editName, setEditName] = useState(profile.fullName);
  const [editBatch, setEditBatch] = useState(profile.batchYear);
  const [editBio, setEditBio] = useState(profile.bio || '');
  const [editPosition, setEditPosition] = useState(profile.position || '');
  const [editInstitution, setEditInstitution] = useState(profile.institution || '');
  const [editProfession, setEditProfession] = useState(profile.profession);
  const [editCadre, setEditCadre] = useState(profile.cadre || '');
  const [editCity, setEditCity] = useState(profile.city || '');
  const [editCountry, setEditCountry] = useState(profile.country || '');
  const [editWhatsapp, setEditWhatsapp] = useState(profile.whatsapp || '');
  const [editFb, setEditFb] = useState(profile.fbLink || '');
  const [editPhone, setEditPhone] = useState(profile.phone || '');
  const [editEmail, setEditEmail] = useState(profile.email || '');
  const [editCareer, setEditCareer] = useState((profile.careerHistory || []).join('\n'));
  const [editDegrees, setEditDegrees] = useState<string[]>(profile.degree || []);
  const [editSpecialties, setEditSpecialties] = useState<string[]>(profile.specialty || []);
  const [editSpecialtyOther, setEditSpecialtyOther] = useState(profile.specialtyOther || '');
  const [editBadges, setEditBadges] = useState<string[]>(profile.badges || []);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Keep profile synchronized when profileId or currentUser changes
  useEffect(() => {
    if (isMine) {
      setProfile(currentUser);
      setEditName(currentUser.fullName);
      setEditBatch(currentUser.batchYear);
      setEditBio(currentUser.bio || '');
      setEditPosition(currentUser.position || '');
      setEditInstitution(currentUser.institution || '');
      setEditProfession(currentUser.profession);
      setEditCadre(currentUser.cadre || '');
      setEditCity(currentUser.city || '');
      setEditCountry(currentUser.country || '');
      setEditWhatsapp(currentUser.whatsapp || '');
      setEditFb(currentUser.fbLink || '');
      setEditPhone(currentUser.phone || '');
      setEditEmail(currentUser.email || '');
      setEditCareer((currentUser.careerHistory || []).join('\n'));
      setEditDegrees(currentUser.degree || []);
      setEditSpecialties(currentUser.specialty || []);
      setEditSpecialtyOther(currentUser.specialtyOther || '');
      setEditBadges(currentUser.badges || []);
    } else {
      const found = ALUMNI_PROFILES.find((p) => p.id === profileId);
      if (found) {
        setProfile(found);
      }
    }
  }, [profileId, currentUser, isMine]);

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

    const updatedData: Partial<AlumniProfile> = {
      fullName: editName,
      batchYear: Number(editBatch),
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
      careerHistory: updatedCareerList,
      degree: editDegrees,
      specialty: editSpecialties,
      specialtyOther: editSpecialtyOther,
      badges: editBadges,
    };

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
              <span>{profile.position}</span>
              <span className="text-slate-400">at</span>
              <span className="text-slate-900 dark:text-slate-100">{profile.institution}</span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{profile.city}, {profile.country}</span>
            </div>
          </div>

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
                    Batch Year
                  </label>
                  <input
                    type="number"
                    value={editBatch}
                    onChange={(e) => setEditBatch(Number(e.target.value))}
                    required
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
                    <option value="Engineer / Tech Executive">Engineer / Tech Executive</option>
                    <option value="Academic & Researcher">Academic & Researcher</option>
                    <option value="Corporate Executive & Leader">Corporate Executive & Leader</option>
                    <option value="Entrepreneur & Founder">Entrepreneur & Founder</option>
                    <option value="Civil Servant / Administration">Civil Servant / Administration</option>
                    <option value="Lawyer & Legal Counsel">Lawyer & Legal Counsel</option>
                    <option value="Banker & Financial Analyst">Banker & Financial Analyst</option>
                    <option value="University Student">University Student</option>
                    <option value="Professional Consultant">Professional Consultant</option>
                  </select>
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
                    {DEGREES_LIST.slice(0, 16).map((deg) => (
                      <button
                        key={deg}
                        type="button"
                        onClick={() => toggleDegree(deg)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-colors ${
                          editDegrees.includes(deg)
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                        }`}
                      >
                        {deg}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Specialties
                  </label>
                  <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 max-h-32 overflow-y-auto">
                    {SPECIALTIES_LIST.slice(0, 20).map((spec) => (
                      <button
                        key={spec}
                        type="button"
                        onClick={() => toggleSpecialty(spec)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-colors ${
                          editSpecialties.includes(spec)
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                        }`}
                      >
                        {spec}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Achievement Badges (Select applicable honours)
                  </label>
                  <div className="flex flex-wrap gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                    {Object.keys(BADGE_CONFIGS).map((badgeKey) => {
                      const isSelected = editBadges.includes(badgeKey);
                      return (
                        <button
                          key={badgeKey}
                          type="button"
                          onClick={() => toggleBadge(badgeKey)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                              : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-amber-400'
                          }`}
                        >
                          <span>{isSelected ? '✓' : '+'}</span>
                          <span>{badgeKey}</span>
                        </button>
                      );
                    })}
                  </div>
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
