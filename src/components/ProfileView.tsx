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
  Check,
  MessageSquare,
  Heart,
  Trash2,
  Send,
  Video,
  Link2,
  Plus,
  X
} from 'lucide-react';
import { AlumniProfile, PostItem, PostComment, SPECIALTIES_LIST, DEGREES_LIST } from '../types';
import { ALUMNI_PROFILES, loadStoredAlumniProfiles } from '../data/mockData';
import { UNIVERSAL_DIRECTORY_PROFILES } from './DirectoryView';
import { useAuth } from '../context/AuthContext';
import { AchievementBadgeChip, BADGE_CONFIGS } from './AchievementBadge';
import { PhotoChangeModal, PhotoType } from './PhotoChangeModal';
import { WhatsAppIcon, FacebookIcon } from './SocialIcons';
import { calculateProfileCompletion } from '../utils/profileCompletion';
import { INITIAL_OFFLINE_SAVED_POSTS, INITIAL_OFFLINE_DIRECTORY } from '../utils/offlineStorage';
import { PostLightboxModal } from './PostLightboxModal';
import {
  extractUrlsFromText,
  renderTextWithClickableLinks,
  SharedEmbedCard
} from './SmartPostMediaAndEmbeds';
import { VerificationStatusBadge } from './verification/VerificationStatusBadge';
import {
  vouchForAlumniProfile,
  getVouchShareLink,
  simulateDemoVouchForUser,
  loadVouchRequests
} from '../utils/verificationService';
import { saveStoredAlumniProfiles } from '../data/mockData';
import { BloodDonorRegistration } from './BloodDonorRegistration';
import { getDonorProfileByUserId } from '../utils/bloodDonationService';
import { BloodNeededNowSection } from './landing/BloodNeededNowSection';
import campusHeroImg from '../assets/images/ndc_campus_hero_1790233370828.jpg';
import { compressImageFileToDataUrl } from '../utils/mediaStorage';

interface ProfileViewProps {
  profileId: number;
  onBack: () => void;
  backLabel?: string;
  onOpenVerificationCenter?: (tab?: 'status' | 'vouch_classmates' | 'upload_id' | 'policy') => void;
  onNavigate?: (route: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profileId,
  onBack,
  backLabel,
  onOpenVerificationCenter,
  onNavigate,
}) => {
  const { isLoggedIn, currentUser, updateProfile } = useAuth();

  // All feed posts loaded from localStorage so we can display and manage this user's posts in the "Posts" tab
  const [allPosts, setAllPosts] = useState<PostItem[]>(() => {
    if (typeof window === 'undefined') return INITIAL_OFFLINE_SAVED_POSTS;
    try {
      const raw = localStorage.getItem('ndc_alumni_posts');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load posts in ProfileView', e);
    }
    return INITIAL_OFFLINE_SAVED_POSTS;
  });

  const resolveProfileById = (targetId: number): AlumniProfile => {
    if (targetId === currentUser.id || targetId === currentUser.userId) {
      return currentUser;
    }
    const allKnownProfiles = [
      ...loadStoredAlumniProfiles(),
      ...ALUMNI_PROFILES,
      ...UNIVERSAL_DIRECTORY_PROFILES,
      ...INITIAL_OFFLINE_DIRECTORY,
    ];
    const matched = allKnownProfiles.find(
      (p) => p.id === targetId || p.userId === targetId
    );
    if (matched) return matched;

    const matchingPost = allPosts.find((p) => p.userId === targetId);
    if (matchingPost) {
      return {
        id: targetId,
        userId: targetId,
        fullName: matchingPost.fullName,
        avatarUrl: matchingPost.avatarUrl,
        coverUrl: campusHeroImg,
        batchYear: matchingPost.batchYear,
        profession: 'Notredamian Alumnus',
        position: 'Alumni Member',
        institution: 'Notre Dame College Alumni Network',
        specialty: [],
        degree: ['HSC'],
        city: 'Dhaka',
        country: 'Bangladesh',
        isPublic: true,
        online: true,
        postsCount: 1,
        badges: ['Verified Notredamian'],
      };
    }

    return allKnownProfiles[0] || currentUser;
  };

  const [profile, setProfile] = useState<AlumniProfile>(() => resolveProfileById(profileId));
  const isMine =
    isLoggedIn &&
    (profileId === currentUser.id || profileId === currentUser.userId) &&
    (profile.id === currentUser.id || profile.userId === currentUser.userId);

  const [activeTab, setActiveTab] = useState<'about' | 'posts' | 'edit' | 'blood'>('about');
  const [donorRefreshTick, setDonorRefreshTick] = useState(0);
  const [isBloodCardClosed, setIsBloodCardClosed] = useState(false);
  const [isVerificationCardClosed, setIsVerificationCardClosed] = useState(false);
  const donorRecord = getDonorProfileByUserId(profile.id);

  const syncAllPosts = (updated: PostItem[]) => {
    setAllPosts(updated);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('ndc_alumni_posts', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save posts from ProfileView', e);
      }
    }
  };

  // Profile Posts composer & interaction state (strictly for own profile)
  const [newPostText, setNewPostText] = useState('');
  const [newPostImages, setNewPostImages] = useState<string[]>([]);
  const [newPostVideos, setNewPostVideos] = useState<string[]>([]);
  const [editingProfilePostId, setEditingProfilePostId] = useState<number | null>(null);
  const [editingProfilePostText, setEditingProfilePostText] = useState('');
  const [postCommentInputs, setPostCommentInputs] = useState<Record<number, string>>({});
  const postPhotoInputRef = useRef<HTMLInputElement>(null);
  const postVideoInputRef = useRef<HTMLInputElement>(null);
  const [lightboxState, setLightboxState] = useState<{
    isOpen: boolean;
    images: string[];
    initialIndex: number;
    postAuthor?: {
      fullName: string;
      avatarUrl: string;
      batchYear?: number;
      createdAt?: string;
    };
    postCaption?: string;
  }>({
    isOpen: false,
    images: [],
    initialIndex: 0,
  });

  const profilePosts = allPosts.filter(
    (p) =>
      p.userId === profile.userId ||
      p.userId === profile.id ||
      p.fullName.toLowerCase() === profile.fullName.toLowerCase()
  );

  const handleProfilePostPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file: File) => {
      if (!file.type.startsWith('image/')) return;
      compressImageFileToDataUrl(file)
        .then((res) => {
          if (res) setNewPostImages((prev) => [...prev, res]);
        })
        .catch(() => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const res = ev.target?.result as string;
            if (res) setNewPostImages((prev) => [...prev, res]);
          };
          reader.readAsDataURL(file);
        });
    });
    e.target.value = '';
  };

  const handleProfilePostVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file: File) => {
      if (!file.type.startsWith('video/')) return;
      if (file.size <= 15 * 1024 * 1024) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const res = ev.target?.result as string;
          if (res) setNewPostVideos((prev) => [...prev, res]);
        };
        reader.readAsDataURL(file);
      } else {
        setNewPostVideos((prev) => [...prev, URL.createObjectURL(file)]);
      }
    });
    e.target.value = '';
  };

  const handleCreateProfilePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMine) return;
    if (!newPostText.trim() && newPostImages.length === 0 && newPostVideos.length === 0) return;
    const created: PostItem = {
      id: Date.now(),
      userId: currentUser.userId,
      fullName: currentUser.fullName,
      avatarUrl: currentUser.avatarUrl,
      batchYear: currentUser.batchYear,
      content: newPostText.trim(),
      images: [...newPostImages],
      videos: [...newPostVideos],
      category: 'General Update',
      likesCount: 0,
      commentsCount: 0,
      createdAt: 'Just now',
      likedByMe: false,
      comments: [],
    };
    syncAllPosts([created, ...allPosts]);
    setNewPostText('');
    setNewPostImages([]);
    setNewPostVideos([]);
  };

  const handleSaveEditProfilePost = (postId: number) => {
    if (!isMine) return;
    const trimmed = editingProfilePostText.trim();
    if (!trimmed) return;
    const updated = allPosts.map((p) =>
      p.id === postId && (p.userId === currentUser.userId || p.userId === currentUser.id)
        ? { ...p, content: trimmed, isEdited: true }
        : p
    );
    syncAllPosts(updated);
    setEditingProfilePostId(null);
    setEditingProfilePostText('');
  };

  const handleToggleLikeProfilePost = (postId: number) => {
    const updated = allPosts.map((p) => {
      if (p.id === postId) {
        const nextLiked = !p.likedByMe;
        return {
          ...p,
          likedByMe: nextLiked,
          likesCount: nextLiked ? p.likesCount + 1 : Math.max(0, p.likesCount - 1),
        };
      }
      return p;
    });
    syncAllPosts(updated);
  };

  const handleDeleteProfilePost = (postId: number) => {
    if (!isMine) return;
    syncAllPosts(
      allPosts.filter(
        (p) => !(p.id === postId && (p.userId === currentUser.userId || p.userId === currentUser.id))
      )
    );
  };

  const handleAddProfilePostComment = (postId: number) => {
    const text = (postCommentInputs[postId] || '').trim();
    if (!text) return;
    const newComment: PostComment = {
      id: Date.now(),
      postId,
      userId: currentUser.userId,
      fullName: currentUser.fullName,
      avatarUrl: currentUser.avatarUrl,
      content: text,
      likesCount: 0,
      likedByMe: false,
      createdAt: 'Just now',
      replies: [],
    };
    const updated = allPosts.map((p) =>
      p.id === postId
        ? {
            ...p,
            commentsCount: p.commentsCount + 1,
            comments: [...(p.comments || []), newComment],
          }
        : p
    );
    syncAllPosts(updated);
    setPostCommentInputs((prev) => ({ ...prev, [postId]: '' }));
  };

  const [copiedProfilePostId, setCopiedProfilePostId] = useState<number | null>(null);
  const [profileShareCopied, setProfileShareCopied] = useState(false);

  const handleShareProfilePost = async (postId: number) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('post', String(postId));
    url.hash = `post-${postId}`;
    const directUrl = url.toString();

    let copied = false;
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(directUrl);
        copied = true;
      } catch {
        copied = false;
      }
    }
    if (!copied && typeof document !== 'undefined') {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = directUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      } catch {
        // ignore
      }
    }

    setCopiedProfilePostId(postId);
    setTimeout(() => {
      setCopiedProfilePostId((prev) => (prev === postId ? null : prev));
    }, 2500);
  };

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
      const resolved = resolveProfileById(profileId);
      setProfile(resolved);
    }
  }, [profileId, currentUser]);

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
      compressImageFileToDataUrl(file)
        .then((dataUrl) => {
          if (type === 'avatar') {
            updateProfile({ avatarUrl: dataUrl });
            setProfile((prev) => ({ ...prev, avatarUrl: dataUrl }));
          } else {
            updateProfile({ coverUrl: dataUrl });
            setProfile((prev) => ({ ...prev, coverUrl: dataUrl }));
          }
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 2000);
        })
        .catch(() => {
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
        });
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
    <div className="relative max-w-4xl mx-auto space-y-6 rounded-[2rem] p-4 sm:p-6 lg:p-8 liquid-glass-profile-shell overflow-hidden">
      {/* Ambient Liquid Glass Refraction Backdrop (Cover Tint + Prismatic Liquid Orbs + Specular Rim) */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[2rem]">
        {profile.coverUrl && (
          <div
            className="absolute -top-20 left-1/2 -translate-x-1/2 w-[135%] h-[28rem] bg-cover bg-center opacity-35 dark:opacity-30 blur-3xl scale-125 saturate-200"
            style={{ backgroundImage: `url(${profile.coverUrl})` }}
          />
        )}
        <div className="absolute -top-28 -left-24 w-96 h-96 rounded-full bg-gradient-to-br from-blue-400/40 via-cyan-300/30 to-indigo-500/35 dark:from-blue-500/30 dark:via-cyan-400/20 dark:to-indigo-600/30 blur-3xl" />
        <div className="absolute top-1/3 -right-28 w-[26rem] h-[26rem] rounded-full bg-gradient-to-bl from-indigo-400/30 via-sky-300/30 to-amber-300/25 dark:from-indigo-500/25 dark:via-blue-500/20 dark:to-amber-500/20 blur-3xl" />
        <div className="absolute -bottom-32 left-1/4 w-96 h-96 rounded-full bg-gradient-to-tr from-emerald-300/25 via-blue-400/30 to-purple-400/25 dark:from-emerald-500/20 dark:via-blue-600/25 dark:to-purple-600/20 blur-3xl" />
        {/* Top Liquid Specular Sheen */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/95 dark:via-white/40 to-transparent" />
      </div>

      {/* Popup-Style Emergency Blood Notification appearing in user's profile */}
      <BloodNeededNowSection
        variant="profile"
        onNavigateToBloodNetwork={() => (onNavigate ? onNavigate('emergency') : onBack())}
      />

      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 liquid-glass-subcard hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{backLabel || 'Back to Directory'}</span>
      </button>

      {/* Profile Card Header */}
      <div className="liquid-glass-card rounded-3xl overflow-hidden">
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
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
                    {profile.fullName}
                  </h1>
                  <VerificationStatusBadge
                    profile={profile}
                    onClick={() => onOpenVerificationCenter?.(isMine ? 'status' : 'vouch_classmates')}
                    size="md"
                  />
                </div>
                <div className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 flex flex-wrap items-center gap-2 mt-0.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800">
                    Batch {profile.batchYear}
                  </span>
                  <span>{profile.profession}</span>
                  {profile.cadre && <span>· {profile.cadre}</span>}
                  {(donorRecord?.isRegisteredDonor || profile.bloodGroup) && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/50 border border-rose-200/80 dark:border-rose-800/80 text-rose-600 dark:text-rose-400 text-xs font-extrabold">
                      <Heart className="w-3 h-3 fill-current" />
                      <span>Blood {donorRecord?.bloodGroup || profile.bloodGroup}</span>
                      {donorRecord?.isRegisteredDonor && (
                        <span className="text-[10px] font-bold opacity-85">
                          · {donorRecord.availability === 'available' ? 'Donor Ready' : 'On Cooldown'}
                        </span>
                      )}
                    </span>
                  )}
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
                  href={
                    /^https?:\/\//i.test(profile.fbLink.trim())
                      ? profile.fbLink.trim()
                      : `https://${profile.fbLink.trim().replace(/^(javascript|vbscript|data):/i, '')}`
                  }
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
                  setProfileShareCopied(true);
                  setTimeout(() => setProfileShareCopied(false), 2500);
                }}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors cursor-pointer"
                title="Share profile"
              >
                {profileShareCopied ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Current Position Banner */}
          <div className="p-3.5 rounded-2xl liquid-glass-subcard flex flex-wrap items-center justify-between gap-3 text-xs">
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
            <div className="mt-4 p-4 rounded-2xl liquid-glass-subcard bg-gradient-to-r from-blue-50/55 via-indigo-50/40 to-emerald-50/45 dark:from-slate-800/65 dark:via-slate-800/45 dark:to-slate-800/65">
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

          {/* Active Verification & Peer Vouch Card (Dismissible with simple Cross button) */}
          {!isVerificationCardClosed && (
            <div
              className={`relative mt-4 p-4 pr-11 rounded-2xl border ${
                (profile.verificationStatus || 'verified') === 'verified'
                  ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-500/30'
                  : 'bg-amber-50/70 dark:bg-amber-950/25 border-amber-500/40'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <ShieldCheck
                      className={`w-4 h-4 ${
                        (profile.verificationStatus || 'verified') === 'verified'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    />
                    <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                      {(profile.verificationStatus || 'verified') === 'verified'
                        ? 'Tier 3: Verified Notredamian Alumnus'
                        : `Tier 2: Pending Classmate Verification (${
                            profile.vouchesCount ?? (profile.verifiedBy?.length || 0)
                          }/2 Vouches)`}
                    </span>
                    {profile.collegeRoll && (
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                        Roll: {profile.collegeRoll}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    {profile.verifiedBy && profile.verifiedBy.length > 0
                      ? `Verified by: ${profile.verifiedBy.join(' • ')}`
                      : (profile.verificationStatus || 'verified') === 'verified'
                      ? 'Verified via Notre Dame College 2-Brother Vouch & Credential Protocol.'
                      : 'Awaiting 2 classmate vouches or NDC ID card upload to unlock full Verified Notredamian badge.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {isMine ? (
                    <>
                      {(profile.verificationStatus || 'verified') !== 'verified' && (
                        <button
                          type="button"
                          onClick={() => {
                            simulateDemoVouchForUser(currentUser, (updated) => {
                              updateProfile(updated);
                              setProfile(updated);
                            });
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>⚡ Simulate Classmate Vouch</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenVerificationCenter?.('status')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Verification Center</span>
                      </button>
                    </>
                  ) : (
                    <>
                      {!(profile.verifiedBy || []).some((v) =>
                        v.toLowerCase().includes(currentUser.fullName.toLowerCase())
                      ) && (
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              const { updatedProfile } = vouchForAlumniProfile(
                                profile,
                                currentUser
                              );
                              setProfile(updatedProfile);
                              const stored = loadStoredAlumniProfiles();
                              const idx = stored.findIndex((p) => p.id === updatedProfile.id);
                              if (idx > -1) {
                                stored[idx] = updatedProfile;
                                saveStoredAlumniProfiles(stored);
                              }
                            } catch {
                              onOpenVerificationCenter?.('vouch_classmates');
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>✓ Vouch for Brother</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenVerificationCenter?.('vouch_classmates')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                        <span>Trust Queue</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Simple Cross (X) Button to Close Verification Notification */}
              <button
                type="button"
                onClick={() => setIsVerificationCardClosed(true)}
                aria-label="Close verification notification"
                title="Close verification notification"
                className="absolute top-3 right-3 p-1.5 rounded-full bg-white/80 hover:bg-rose-600 dark:bg-slate-800/90 dark:hover:bg-rose-600 text-slate-500 hover:text-white dark:text-slate-300 dark:hover:text-white border border-slate-200/80 dark:border-slate-700 transition-all cursor-pointer shadow-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Tab Selector: About | Posts | Edit Profile */}
          <div className="flex gap-6 mt-6 border-b border-slate-100 dark:border-slate-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('about')}
              className={`pb-3 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'about'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              About
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('posts')}
              className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'posts'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Posts</span>
              <span className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-extrabold text-slate-600 dark:text-slate-300">
                {profilePosts.length}
              </span>
            </button>

            {isMine && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTab('blood')}
                  className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'blood'
                      ? 'border-rose-600 text-rose-600 dark:text-rose-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Heart className="w-3.5 h-3.5 text-rose-500" />
                  <span>Blood Donor Settings</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('edit')}
                  className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'edit'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tab 1: ABOUT (Combined About & Credentials + Career & Education Timeline) */}
      {activeTab === 'about' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {profile.bio && (
              <div className="liquid-glass-card p-5 rounded-3xl md:col-span-2">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Biography
                </h3>
                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                  {profile.bio}
                </p>
              </div>
            )}

            <div className="liquid-glass-card p-5 rounded-3xl space-y-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-sm">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                <span>Degrees & Educational Qualifications</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.degree && profile.degree.length > 0 ? (
                  profile.degree.map((deg, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-blue-50/80 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/80 text-xs font-bold rounded-xl backdrop-blur-xs"
                    >
                      {deg}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">No degrees listed yet.</span>
                )}
              </div>
            </div>

            <div className="liquid-glass-card p-5 rounded-3xl space-y-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-sm">
                <Award className="w-4 h-4 text-emerald-600" />
                <span>Professional Specialties & Expertise</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.specialty && profile.specialty.length > 0 ? (
                  profile.specialty.map((spec, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-emerald-50/80 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/80 text-xs font-bold rounded-xl backdrop-blur-xs"
                    >
                      {spec}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">No specialties listed yet.</span>
                )}
              </div>
            </div>

            {/* Achievement Badges & Recognition Card */}
            {profile.badges && profile.badges.length > 0 && (
              <div className="liquid-glass-card p-5 rounded-3xl md:col-span-2 space-y-3">
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

          {/* Career & Education Timeline (Merged directly into About) */}
          <div className="liquid-glass-card p-6 rounded-3xl">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Career & Education Timeline</span>
            </h3>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-blue-300/70 dark:before:bg-blue-800">
              {profile.careerHistory && profile.careerHistory.length > 0 ? (
                profile.careerHistory.map((line, idx) => (
                  <div key={idx} className="relative group">
                    <span className="absolute -left-6 top-1.5 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-2 border-blue-600 ring-4 ring-blue-50/80 dark:ring-blue-950/60" />
                    <div className="p-3.5 rounded-2xl liquid-glass-subcard text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                      {line}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">No career history entries available yet.</p>
              )}
            </div>
          </div>

          {/* Blood Donation & Emergency Network Card inside About Tab (Dismissible with Cross Button) */}
          {!isBloodCardClosed && (donorRecord?.isRegisteredDonor || isMine) && (
            <div className="relative liquid-glass-card p-5 sm:p-6 rounded-3xl border-rose-200/80 dark:border-rose-800/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-8">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200/70 dark:border-rose-800/70 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                    <Heart className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">
                        NDC Blood Donation Network Status
                      </h3>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/70">
                        <Eye className="w-3 h-3" />
                        Seen
                      </span>
                      {donorRecord?.isRegisteredDonor ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-600 text-white">
                          Group {donorRecord.bloodGroup}
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          Not Registered as Active Donor
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {donorRecord?.isRegisteredDonor
                        ? `Preferred Hospital Corridor: ${donorRecord.preferredArea} · Status: ${
                            donorRecord.availability === 'available'
                              ? 'Available for Coordination'
                              : donorRecord.availability === 'on_cooldown'
                              ? 'On Post-Donation Cooldown'
                              : 'Temporarily Unavailable'
                          }`
                        : 'Optionally register as a Notredamian blood donor to receive matching emergency alerts while keeping your personal phone and address private.'}
                    </p>
                  </div>
                </div>

                {isMine && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('blood')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
                  >
                    <Heart className="w-3.5 h-3.5" />
                    <span>Manage Blood Donor Settings</span>
                  </button>
                )}
              </div>

              {/* Cross (X) Button to close after seen */}
              <button
                type="button"
                onClick={() => setIsBloodCardClosed(true)}
                aria-label="Close blood notification card"
                title="Close"
                className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-rose-600 dark:bg-slate-800 dark:hover:bg-rose-600 text-slate-600 hover:text-white dark:text-slate-300 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab: BLOOD DONOR SETTINGS (Strictly for own profile) */}
      {activeTab === 'blood' && isMine && (
        <div className="space-y-5" key={donorRefreshTick}>
          <BloodDonorRegistration
            onSaved={() => {
              setDonorRefreshTick((t) => t + 1);
              setProfile(resolveProfileById(profileId));
            }}
          />
        </div>
      )}

      {/* Tab 2: POSTS */}
      {activeTab === 'posts' && (
        <div className="space-y-5">
          {/* Quick Post Composer on own profile */}
          {isMine && (
            <form
              onSubmit={handleCreateProfilePost}
              className="liquid-glass-card p-5 rounded-3xl space-y-3.5"
            >
              <div className="flex items-start gap-3">
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.fullName}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500/20 shrink-0"
                />
                <textarea
                  rows={3}
                  value={newPostText}
                  onChange={(e) => setNewPostText(e.target.value)}
                  placeholder="Share an update, photo, video, or link (YouTube, Facebook, Instagram, LinkedIn) on your profile..."
                  className="flex-1 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 resize-none"
                />
              </div>

              {/* Hidden File Inputs */}
              <input
                type="file"
                ref={postPhotoInputRef}
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                onChange={handleProfilePostPhotoUpload}
                className="hidden"
              />
              <input
                type="file"
                ref={postVideoInputRef}
                accept="video/mp4,video/webm,video/ogg,video/quicktime"
                multiple
                onChange={handleProfilePostVideoUpload}
                className="hidden"
              />

              {/* Attached Photos Preview */}
              {newPostImages.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {newPostImages.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700"
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() =>
                          setNewPostImages((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="absolute top-1 right-1 p-1 bg-black/75 hover:bg-rose-600 text-white rounded-full cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Attached Videos or Detected Link Preview */}
              {(() => {
                const previewLinks = Array.from(
                  new Set([...newPostVideos, ...extractUrlsFromText(newPostText)])
                );
                if (previewLinks.length === 0) return null;
                return (
                  <div className="space-y-2.5">
                    {previewLinks.map((url, idx) => (
                      <div key={idx} className="relative">
                        <SharedEmbedCard url={url} autoPlayOnScroll={false} />
                        {newPostVideos.includes(url) && (
                          <button
                            type="button"
                            onClick={() =>
                              setNewPostVideos((prev) => prev.filter((v) => v !== url))
                            }
                            className="absolute top-2.5 right-2.5 p-1.5 bg-black/80 hover:bg-rose-600 text-white rounded-full cursor-pointer z-20"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => postPhotoInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4 text-emerald-500" />
                    <span>Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => postVideoInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-bold hover:bg-purple-100 transition-colors cursor-pointer"
                  >
                    <Video className="w-4 h-4 text-purple-500" />
                    <span>Video</span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={
                    !newPostText.trim() &&
                    newPostImages.length === 0 &&
                    newPostVideos.length === 0
                  }
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Post</span>
                </button>
              </div>
            </form>
          )}

          {/* Profile Posts List */}
          {profilePosts.length === 0 ? (
            <div className="liquid-glass-card rounded-3xl p-10 text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                No Posts Published Yet
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                {isMine
                  ? 'Share your first update, photo, video, or social link above to display it on your profile timeline and alumni feed.'
                  : `${profile.fullName} has not published any posts to the timeline yet.`}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
                  {/* View-only notice when viewing another alumnus's profile */}
                  {!isMine && (
                    <div className="bg-slate-100/80 dark:bg-slate-800/60 px-4 py-2.5 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <Eye className="w-4 h-4 text-blue-500 shrink-0" />
                      <span>
                        Viewing <strong>{profile.fullName}</strong>&apos;s profile in read-only mode. Only the profile owner can create, edit, or delete posts here.
                      </span>
                    </div>
                  )}

                  {profilePosts.map((post) => {
                const isPostMine =
                  isMine &&
                  (post.userId === currentUser.userId || post.userId === currentUser.id);
                const postMediaLinks = Array.from(
                  new Set([
                    ...(post.videos || []),
                    ...extractUrlsFromText(post.content),
                  ])
                );

                return (
                  <article
                    key={post.id}
                    className="liquid-glass-card rounded-3xl p-5 sm:p-6 space-y-3.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={post.avatarUrl}
                          alt={post.fullName}
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                              {post.fullName}
                            </span>
                            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            {post.isEdited && (
                              <span className="text-[10px] text-slate-400 font-medium">
                                (edited)
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                            <span>Batch {post.batchYear}</span>
                            <span>·</span>
                            <span>{post.createdAt}</span>
                            {post.category && (
                              <>
                                <span>·</span>
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-[10px]">
                                  {post.category}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {isPostMine && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProfilePostId(post.id);
                              setEditingProfilePostText(post.content);
                            }}
                            title="Edit post"
                            className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProfilePost(post.id)}
                            title="Delete post"
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {editingProfilePostId === post.id && isPostMine ? (
                      <div className="space-y-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                        <textarea
                          rows={3}
                          value={editingProfilePostText}
                          onChange={(e) => setEditingProfilePostText(e.target.value)}
                          className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProfilePostId(null);
                              setEditingProfilePostText('');
                            }}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEditProfilePost(post.id)}
                            className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>
                    ) : (
                      post.content && (
                        <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line break-words">
                          {renderTextWithClickableLinks(post.content)}
                        </p>
                      )
                    )}

                    {/* Post Images */}
                    {post.images && post.images.length > 0 && (
                      <div
                        className={`grid gap-2 rounded-2xl overflow-hidden ${
                          post.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                        }`}
                      >
                        {post.images.map((imgUrl, idx) => (
                          <div
                            key={idx}
                            onClick={() =>
                              setLightboxState({
                                isOpen: true,
                                images: post.images,
                                initialIndex: idx,
                                postAuthor: {
                                  fullName: post.fullName,
                                  avatarUrl: post.avatarUrl,
                                  batchYear: post.batchYear,
                                  createdAt: post.createdAt,
                                },
                                postCaption: post.content,
                              })
                            }
                            className="cursor-pointer rounded-xl overflow-hidden bg-slate-950"
                          >
                            <img
                              src={imgUrl}
                              alt=""
                              className={`w-full object-cover ${
                                post.images.length === 1 ? 'max-h-[420px]' : 'h-48'
                              }`}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Post Videos & Shared Social/Web Links */}
                    {postMediaLinks.length > 0 && (
                      <div className="space-y-3">
                        {postMediaLinks.map((mediaUrl, idx) => (
                          <SharedEmbedCard
                            key={`${post.id}-profile-media-${idx}`}
                            url={mediaUrl}
                            autoPlayOnScroll={true}
                          />
                        ))}
                      </div>
                    )}

                    {/* Like, Comment & Share Bar */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleLikeProfilePost(post.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                            post.likedByMe
                              ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/30'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <Heart
                            className={`w-4 h-4 ${
                              post.likedByMe ? 'fill-rose-500 text-rose-500' : ''
                            }`}
                          />
                          <span>
                            {post.likesCount} {post.likesCount === 1 ? 'Like' : 'Likes'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleShareProfilePost(post.id)}
                          title="Copy direct link to this post"
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                            copiedProfilePostId === post.id
                              ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {copiedProfilePostId === post.id ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              <span>Link Copied!</span>
                            </>
                          ) : (
                            <>
                              <Share2 className="w-4 h-4" />
                              <span>Share</span>
                            </>
                          )}
                        </button>
                      </div>

                      <span className="font-semibold">
                        {post.comments?.length || post.commentsCount} Comments
                      </span>
                    </div>

                    {/* Comments List & Input */}
                    {post.comments && post.comments.length > 0 && (
                      <div className="space-y-2 pt-1">
                        {post.comments.map((c) => (
                          <div key={c.id} className="flex items-start gap-2 text-xs">
                            <img
                              src={c.avatarUrl}
                              alt={c.fullName}
                              className="w-6 h-6 rounded-full object-cover mt-0.5"
                            />
                            <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-3 py-1.5">
                              <span className="font-bold text-slate-900 dark:text-slate-100 mr-1.5">
                                {c.fullName}
                              </span>
                              <span className="text-slate-700 dark:text-slate-300">
                                {c.content}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {isMine && (
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={postCommentInputs[post.id] || ''}
                          onChange={(e) =>
                            setPostCommentInputs((prev) => ({
                              ...prev,
                              [post.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddProfilePostComment(post.id);
                          }}
                          placeholder="Write a comment..."
                          className="flex-1 px-3.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddProfilePostComment(post.id)}
                          className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full cursor-pointer"
                        >
                          <Send className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: EDIT PROFILE (for current user) */}
      {activeTab === 'edit' && isMine && (
        <div className="liquid-glass-card p-6 sm:p-8 rounded-3xl">
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

          {/* Integrated Blood Donor Profile Settings inside Edit Profile */}
          <div className="pt-2">
            <BloodDonorRegistration
              compact
              onSaved={() => {
                setDonorRefreshTick((t) => t + 1);
                setProfile(resolveProfileById(profileId));
              }}
            />
          </div>
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

      {/* Lightbox Modal for Profile Post Photos */}
      <PostLightboxModal
        isOpen={lightboxState.isOpen}
        images={lightboxState.images}
        initialIndex={lightboxState.initialIndex}
        onClose={() => setLightboxState((prev) => ({ ...prev, isOpen: false }))}
        postAuthor={lightboxState.postAuthor}
        postCaption={lightboxState.postCaption}
      />
    </div>
  );
};
