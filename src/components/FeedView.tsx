import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart,
  MessageCircle,
  Share2,
  Image as ImageIcon,
  Send,
  ShieldCheck,
  MoreHorizontal,
  Sparkles,
  Edit3,
  Trash2,
  Flag,
  X,
  Plus,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Briefcase,
  Award,
  Users,
  MessageSquare,
  ZoomIn,
  Bookmark,
  BookmarkCheck,
  WifiOff,
  Globe,
  Camera,
  Smile,
  MapPin,
  Settings,
  ChevronDown,
  Lock,
  UploadCloud,
  ArrowUpLeft,
  Video,
  Link2,
  Droplet,
  BookOpen,
  HeartHandshake,
  Check,
  Search,
  Flame,
  Activity,
  Rocket,
  Trophy,
  Palette,
  GraduationCap,
  Filter,
} from 'lucide-react';
import { PostItem, PostComment } from '../types';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { playSound } from '../utils/audio';
import { PostLightboxModal } from './PostLightboxModal';
import { compressImageFileToDataUrl } from '../utils/mediaStorage';
import {
  extractUrlsFromText,
  extractFirstValidUrl,
  normalizeUrlInput,
  renderTextWithClickableLinks,
  SharedEmbedCard
} from './SmartPostMediaAndEmbeds';
import { Video as FeedVideoPlayer } from './feed/Video';
import { LinkPreview } from './feed/LinkPreview';
import { fetchLinkPreview, type LinkMetadata } from '../services/linkPreviewService';
import {
  getUserPreferences,
  saveUserPreferences,
  type UserPreferences
} from '../utils/userPreferences';
import {
  isPostSaved,
  toggleSavePost
} from '../utils/offlineStorage';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { VerificationStatusBadge } from './verification/VerificationStatusBadge';
import {
  loadVouchRequests,
  normalizeToBatchNumber
} from '../utils/verificationService';
import { BloodNeededNowSection } from './landing/BloodNeededNowSection';
import {
  fetchFeedPostsFromDb,
  createFeedPostInDb,
  togglePostLikeInDb,
  addPostCommentInDb,
  toggleSavePostInDb,
  editFeedPostInDb,
  deleteFeedPostInDb,
  createNotificationInDb,
} from '../services/supabaseService';
import { isProfilePhotoPost } from '../utils/profilePhotoPostService';
import { formatFacebookTime, getFullFacebookTimestamp } from '../utils/facebookTime';
import {
  notifyPostLike,
  notifyPostComment,
  notifyCommentReply,
} from '../utils/notificationService';
import { DailyQuestion } from './DailyQuestion';
import { recordStreakAnswerInDb } from '../services/streakService';

interface FeedViewProps {
  onViewProfile?: (userId: number) => void;
  onOpenVerificationCenter?: (initialTab?: 'status' | 'vouch_others') => void;
  onNavigate?: (route: string) => void;
}

type PostCategory =
  | 'Blood Donation'
  | 'Emergency & Medical Aid'
  | 'Tech & Innovation'
  | 'Professional Insights'
  | 'Job & Career Opportunities'
  | 'Business & Startups'
  | 'Higher Studies & Research'
  | 'Campus Memories'
  | 'Reunion'
  | 'Sports & Tournaments'
  | 'Achievement'
  | 'Social Welfare & Relief'
  | 'Book Club, Arts & Culture'
  | 'Prayer & Condolence'
  | 'General Update';

export type CategoryGroup =
  | '🚨 Life-Saving & Health'
  | '💼 Careers & Tech'
  | '🎓 Academics & Heritage'
  | '🤝 Community & Brotherhood';

export interface CategoryItem {
  label: PostCategory;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  border: string;
  badge?: string;
  isUrgent?: boolean;
  group: CategoryGroup;
  description: string;
}

const FEED_PAGE_SIZE = 12;

const CATEGORIES: CategoryItem[] = [
  {
    label: 'Blood Donation',
    icon: Droplet,
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    border: 'border-rose-200 dark:border-rose-800',
    badge: 'Urgent / Life-Saving',
    isUrgent: true,
    group: '🚨 Life-Saving & Health',
    description: 'Urgent blood appeals, plasma needs, platelets & verified donor coordination across hospitals',
  },
  {
    label: 'Emergency & Medical Aid',
    icon: Activity,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/40',
    border: 'border-red-200 dark:border-red-800',
    badge: 'Medical Care',
    isUrgent: true,
    group: '🚨 Life-Saving & Health',
    description: 'Critical healthcare aid, emergency medicine, hospital coordination & patient assistance',
  },
  {
    label: 'Tech & Innovation',
    icon: Sparkles,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    border: 'border-blue-200 dark:border-blue-800',
    badge: 'Tech & AI',
    group: '💼 Careers & Tech',
    description: 'Software development, engineering breakthroughs, AI experiments & open-source projects',
  },
  {
    label: 'Professional Insights',
    icon: Briefcase,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-800',
    badge: 'Industry Trends',
    group: '💼 Careers & Tech',
    description: 'Corporate leadership, industry insights, career tips, executive guidance & market views',
  },
  {
    label: 'Job & Career Opportunities',
    icon: GraduationCap,
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    border: 'border-teal-200 dark:border-teal-800',
    badge: 'Hiring & Referrals',
    group: '💼 Careers & Tech',
    description: 'Alumni job openings, hiring notices, internships & internal company referrals',
  },
  {
    label: 'Business & Startups',
    icon: Rocket,
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    border: 'border-violet-200 dark:border-violet-800',
    badge: 'Ventures & Scaling',
    group: '💼 Careers & Tech',
    description: 'Alumni startup launches, venture funding, product demos & entrepreneurial partnerships',
  },
  {
    label: 'Higher Studies & Research',
    icon: BookOpen,
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    border: 'border-indigo-200 dark:border-indigo-800',
    badge: 'Academics & Study Abroad',
    group: '🎓 Academics & Heritage',
    description: 'Foreign university admissions, scholarship alerts, GRE/IELTS & research papers',
  },
  {
    label: 'Campus Memories',
    icon: Camera,
    color: 'text-cyan-600 dark:text-cyan-400',
    bg: 'bg-cyan-50 dark:bg-cyan-950/40',
    border: 'border-cyan-200 dark:border-cyan-800',
    badge: 'Heritage & Nostalgia',
    group: '🎓 Academics & Heritage',
    description: 'Vintage NDC photos, memories of Father Timm & Father Peixotto, and historic college moments',
  },
  {
    label: 'Reunion',
    icon: Users,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    border: 'border-purple-200 dark:border-purple-800',
    badge: 'Get-Together',
    group: '🎓 Academics & Heritage',
    description: 'Batch reunions, regional chapter meetups, annual picnics & offline alumni gatherings',
  },
  {
    label: 'Sports & Tournaments',
    icon: Trophy,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-800',
    badge: 'Athletics & Club',
    group: '🎓 Academics & Heritage',
    description: 'Notre Dame football leagues, cricket cups, badminton tournaments & club activities',
  },
  {
    label: 'Achievement',
    icon: Award,
    color: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-yellow-50 dark:bg-yellow-950/40',
    border: 'border-yellow-200 dark:border-yellow-800',
    badge: 'Honors & Milestones',
    group: '🤝 Community & Brotherhood',
    description: 'National honors, corporate promotions, certifications & proud milestone accomplishments',
  },
  {
    label: 'Social Welfare & Relief',
    icon: HeartHandshake,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-800',
    badge: 'Humanitarian',
    group: '🤝 Community & Brotherhood',
    description: 'Disaster and flood relief, winter clothing drives, student scholarships & charity drives',
  },
  {
    label: 'Book Club, Arts & Culture',
    icon: Palette,
    color: 'text-fuchsia-600 dark:text-fuchsia-400',
    bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/40',
    border: 'border-fuchsia-200 dark:border-fuchsia-800',
    badge: 'Arts & Culture',
    group: '🤝 Community & Brotherhood',
    description: 'Debating, photography, creative writings, theater, poetry & cultural retrospectives',
  },
  {
    label: 'Prayer & Condolence',
    icon: Heart,
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    border: 'border-rose-200 dark:border-rose-800',
    badge: 'Care & Solidarity',
    group: '🤝 Community & Brotherhood',
    description: 'Prayers for ill batchmates and family, condolences & remembrance of departed brothers',
  },
  {
    label: 'General Update',
    icon: MessageSquare,
    color: 'text-slate-600 dark:text-slate-300',
    bg: 'bg-slate-100 dark:bg-slate-800',
    border: 'border-slate-200 dark:border-slate-700',
    badge: 'Community',
    group: '🤝 Community & Brotherhood',
    description: 'Everyday campus memories, reflections, questions & general fraternal discussions',
  },
];

export const FeedView: React.FC<FeedViewProps> = ({
  onViewProfile,
  onOpenVerificationCenter,
  onNavigate,
}) => {
  const isOnline = useOnlineStatus();
  const { currentUser, updateProfile } = useAuth();
  const [pendingVouchesCount, setPendingVouchesCount] = useState<number>(() => {
    try {
      return loadVouchRequests().filter((r) => r.status === 'pending').length;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    const syncVouches = () => {
      try {
        setPendingVouchesCount(loadVouchRequests().filter((r) => r.status === 'pending').length);
      } catch {
        // ignore
      }
    };
    window.addEventListener('storage', syncVouches);
    return () => window.removeEventListener('storage', syncVouches);
  }, [currentUser]);

  const [posts, setPosts] = useState<PostItem[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState<boolean>(true);
  const [isLoadingMorePosts, setIsLoadingMorePosts] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const nextFeedOffsetRef = useRef(0);
  const loadMoreInFlightRef = useRef(false);
  const [isSubmittingPost, setIsSubmittingPost] = useState<boolean>(false);

  // Supabase is the ONLY source of truth: load the first page from Supabase on mount.
  useEffect(() => {
    let isMounted = true;
    nextFeedOffsetRef.current = 0;
    setPosts([]);
    setHasMorePosts(false);
    setFeedError(null);
    setIsLoadingPosts(true);

    fetchFeedPostsFromDb(FEED_PAGE_SIZE, currentUser.id, 0)
      .then((dbPosts) => {
        if (!isMounted) return;
        const loadedPosts = (dbPosts || []).filter((p) => !isProfilePhotoPost(p));
        try {
          const local = localStorage.getItem('ndc_alumni_posts');
          if (local) {
            const parsed: PostItem[] = JSON.parse(local);
            const cleanedLocal = parsed.filter((p) => !isProfilePhotoPost(p));
            if (cleanedLocal.length !== parsed.length) {
              try {
                localStorage.setItem('ndc_alumni_posts', JSON.stringify(cleanedLocal));
              } catch {}
            }
            const merged = [...cleanedLocal.filter((p) => !loadedPosts.some((lp) => lp.id === p.id)), ...loadedPosts];
            nextFeedOffsetRef.current = merged.length;
            setPosts(merged);
            setHasMorePosts(loadedPosts.length === FEED_PAGE_SIZE);
            return;
          }
        } catch {}
        nextFeedOffsetRef.current = loadedPosts.length;
        setPosts(loadedPosts);
        setHasMorePosts(loadedPosts.length === FEED_PAGE_SIZE);
      })
      .catch((err) => {
        console.error('FeedView: failed to fetch Supabase posts:', err);
        if (isMounted) {
          try {
            const local = localStorage.getItem('ndc_alumni_posts');
            if (local) {
              const parsed: PostItem[] = JSON.parse(local);
              const cleanedLocal = parsed.filter((p) => !isProfilePhotoPost(p));
              setPosts(cleanedLocal);
              return;
            }
          } catch {}
          if (!currentUser.id || currentUser.id === 0) {
            setFeedError('Sign in to your alumni account to view Quad posts and connect with batchmates.');
          } else {
            setFeedError('We could not load the feed. Check your connection and try again.');
          }
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingPosts(false);
      });

    // Listen for new posts created anywhere in the app
    const handlePostCreated = (e: Event) => {
      const custom = e as CustomEvent<{ post: PostItem; replaceTempId?: number }>;
      if (!custom.detail?.post) return;
      const newPost = custom.detail.post;
      if (isProfilePhotoPost(newPost)) return;
      setPosts((prev) => {
        if (custom.detail.replaceTempId) {
          return prev.map((p) => (p.id === custom.detail.replaceTempId ? newPost : p));
        }
        if (prev.some((p) => p.id === newPost.id)) return prev;
        return [newPost, ...prev];
      });
    };
    window.addEventListener('ndc_post_created', handlePostCreated);

    return () => {
      isMounted = false;
      window.removeEventListener('ndc_post_created', handlePostCreated);
    };
  }, [currentUser.id]);

  // Handle saving / bookmarking a post to offline cache & Supabase
  const handleToggleSave = (post: PostItem) => {
    const isNowSaved = toggleSavePost(post);
    toggleSavePostInDb(post.id, currentUser.id).catch(() => {});
    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, isSaved: isNowSaved } : p))
    );
    if (isNowSaved) {
      playSound('post');
      showToast('Post saved to offline cache!');
    } else {
      showToast('Post removed from saved offline cache.');
    }
  };

  const [postContent, setPostContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PostCategory>('General Update');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [composerCategoryGroup, setComposerCategoryGroup] = useState<string>('All');
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(e.target as Node)
      ) {
        setIsCategoryDropdownOpen(false);
      }
    };
    if (isCategoryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCategoryDropdownOpen]);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [attachedVideos, setAttachedVideos] = useState<string[]>([]);
  const [showVideoUrlInput, setShowVideoUrlInput] = useState(false);
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const composerTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeFilterCategory, setActiveFilterCategory] = useState<string>('All');

  const [autoPlayOnScroll, setAutoPlayOnScroll] = useState<boolean>(
    () => getUserPreferences().autoplay_videos_on_scroll
  );

  // Link preview detection in Composer
  const [detectedLinkUrl, setDetectedLinkUrl] = useState<string | null>(null);
  const [composerLinkMetadata, setComposerLinkMetadata] = useState<LinkMetadata | null>(null);
  const [isLoadingLinkPreview, setIsLoadingLinkPreview] = useState(false);

  // Facebook-style "New Post" Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDailyQuestionAnswer, setIsDailyQuestionAnswer] = useState(false);
  const [postBackground, setPostBackground] = useState<string>('default');
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [postFeeling, setPostFeeling] = useState<string | null>(null);
  const [showFeelingPicker, setShowFeelingPicker] = useState(false);
  const [postLocation, setPostLocation] = useState<string | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showPhotoDropzone, setShowPhotoDropzone] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // New Posts indicator state
  const [hasNewPosts, setHasNewPosts] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Comments state
  const [activeCommentPostId, setActiveCommentPostId] = useState<number | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({});
  const [replyInputs, setReplyInputs] = useState<Record<number, string>>({});
  const [activeReplyId, setActiveReplyId] = useState<number | null>(null);

  // Read More / Truncation state: set of expanded post IDs
  const [expandedPostIds, setExpandedPostIds] = useState<Set<number>>(new Set());

  // Post dropdown menu state
  const [activeMenuPostId, setActiveMenuPostId] = useState<number | null>(null);
  const [copiedPostId, setCopiedPostId] = useState<number | null>(null);
  const [highlightedPostId, setHighlightedPostId] = useState<number | null>(null);

  // Post Editing state
  const [editingPost, setEditingPost] = useState<PostItem | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editVideos, setEditVideos] = useState<string[]>([]);
  const [editCategory, setEditCategory] = useState<PostCategory>('General Update');
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const editVideoInputRef = useRef<HTMLInputElement>(null);

  // Delete Post Confirmation Dialog state
  const [postToDelete, setPostToDelete] = useState<PostItem | null>(null);

  // Report Post Modal state
  const [postToReport, setPostToReport] = useState<PostItem | null>(null);
  const [reportReason, setReportReason] = useState('Inappropriate / Unprofessional');

  // Lightbox Modal state
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

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.post-menu-container')) {
        setActiveMenuPostId(null);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Synchronize autoPlayOnScroll with user preferences updates in real time
  useEffect(() => {
    const handlePrefsChange = (e: Event) => {
      const customEvent = e as CustomEvent<UserPreferences>;
      if (customEvent.detail && customEvent.detail.autoplay_videos_on_scroll !== undefined) {
        setAutoPlayOnScroll(customEvent.detail.autoplay_videos_on_scroll);
      }
    };
    window.addEventListener('ndc_user_prefs_changed', handlePrefsChange);
    return () => window.removeEventListener('ndc_user_prefs_changed', handlePrefsChange);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Build direct link to a specific post
  const getDirectPostUrl = (postId: number): string => {
    if (typeof window === 'undefined') return `#post-${postId}`;
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('post', String(postId));
    url.hash = `post-${postId}`;
    return url.toString();
  };

  // Copy direct link to a post to clipboard with fallback
  const handleSharePost = async (postId: number) => {
    const directUrl = getDirectPostUrl(postId);
    let copied = false;

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
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
        copied = true;
      } catch {
        copied = false;
      }
    }

    setCopiedPostId(postId);
    setTimeout(() => {
      setCopiedPostId((prev) => (prev === postId ? null : prev));
    }, 2500);

    playSound('post');
    showToast('Direct post link copied to clipboard!');
  };

  // Detect shared post ID from URL (?post=123 or #post-123) and scroll to it
  useEffect(() => {
    const checkSharedPostFromUrl = () => {
      if (typeof window === 'undefined') return;
      let targetPostId: number | null = null;
      const params = new URLSearchParams(window.location.search);
      const queryPost = params.get('post');
      if (queryPost && !Number.isNaN(Number(queryPost))) {
        targetPostId = Number(queryPost);
      } else if (window.location.hash.startsWith('#post-')) {
        const hashId = Number(window.location.hash.replace('#post-', ''));
        if (!Number.isNaN(hashId)) {
          targetPostId = hashId;
        }
      }

      if (targetPostId !== null) {
        setActiveFilterCategory('All');
        setHighlightedPostId(targetPostId);
        setTimeout(() => {
          const el = document.getElementById(`post-${targetPostId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 180);
      }
    };

    checkSharedPostFromUrl();
    window.addEventListener('hashchange', checkSharedPostFromUrl);
    window.addEventListener('popstate', checkSharedPostFromUrl);
    return () => {
      window.removeEventListener('hashchange', checkSharedPostFromUrl);
      window.removeEventListener('popstate', checkSharedPostFromUrl);
    };
  }, []);

  // Truncate toggle helper
  const toggleExpandPost = (postId: number) => {
    setExpandedPostIds((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  };

  // Helper to convert YouTube watch/share links into embed URLs
  const getYouTubeEmbedUrl = (url: string): string | null => {
    try {
      const trimmed = url.trim();
      const shortMatch = trimmed.match(/^https?:\/\/(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{6,})/);
      if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
      const watchMatch = trimmed.match(/^https?:\/\/(?:www\.)?youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{6,})/);
      if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
      const shortsMatch = trimmed.match(/^https?:\/\/(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/);
      if (shortsMatch) return `https://www.youtube.com/embed/${shortsMatch[1]}`;
      const embedMatch = trimmed.match(/^https?:\/\/(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/);
      if (embedMatch) return `https://www.youtube.com/embed/${embedMatch[1]}`;
    } catch {
      return null;
    }
    return null;
  };

  // Process uploaded files (photos and videos) from input, drag-and-drop, or clipboard paste
  const processUploadedFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    let addedPhotos = 0;
    let addedVideos = 0;

    fileArray.forEach((file: File) => {
      const isImage =
        file.type.startsWith('image/') ||
        ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) ||
        /\.(jpe?g|png|webp|gif|svg|avif|heic)$/i.test(file.name);
      const isVideo =
        file.type.startsWith('video/') ||
        ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'].includes(file.type) ||
        /\.(mp4|webm|ogg|mov|m4v|mkv)$/i.test(file.name);

      if (isImage) {
        if (file.size > 15 * 1024 * 1024) {
          showToast('Each photo must be smaller than 15 MB.');
          return;
        }
        addedPhotos += 1;
        compressImageFileToDataUrl(file)
          .then((result) => {
            if (result) {
              setAttachedImages((prev) => [...prev, result]);
            }
          })
          .catch(() => {
            const reader = new FileReader();
            reader.onload = (uploadEvent) => {
              const result = uploadEvent.target?.result as string;
              if (result) {
                setAttachedImages((prev) => [...prev, result]);
              }
            };
            reader.readAsDataURL(file);
          });
      } else if (isVideo) {
        if (file.size > 100 * 1024 * 1024) {
          showToast('Each video must be smaller than 100 MB.');
          return;
        }
        addedVideos += 1;
        if (file.size <= 15 * 1024 * 1024) {
          const reader = new FileReader();
          reader.onload = (uploadEvent) => {
            const result = uploadEvent.target?.result as string;
            if (result) {
              setAttachedVideos((prev) => [...prev, result]);
            }
          };
          reader.readAsDataURL(file);
        } else {
          const objectUrl = URL.createObjectURL(file);
          setAttachedVideos((prev) => [...prev, objectUrl]);
        }
      } else {
        showToast('Supported formats: JPG, PNG, WEBP, GIF photos and MP4, WEBM, MOV videos.');
      }
    });

    if (addedPhotos > 0 && addedVideos > 0) {
      showToast(`Added ${addedPhotos} photo(s) and ${addedVideos} video(s) to your post!`);
    } else if (addedPhotos > 0) {
      showToast(`${addedPhotos} photo${addedPhotos > 1 ? 's' : ''} added to your post!`);
    } else if (addedVideos > 0) {
      showToast(`${addedVideos} video${addedVideos > 1 ? 's' : ''} added to your post!`);
    }
  };

  // Handle image upload from file picker
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processUploadedFiles(e.target.files);
    }
    e.target.value = '';
  };

  // Handle video upload from file picker
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processUploadedFiles(e.target.files);
    }
    e.target.value = '';
  };

  // Handle adding a video or social post via URL (YouTube, Facebook, Instagram, LinkedIn, or direct video link)
  const handleAddVideoUrl = () => {
    const normalized = normalizeUrlInput(videoUrlInput);
    if (!normalized || !/^https?:\/\//i.test(normalized)) {
      showToast('Please enter a valid link (e.g. Facebook, YouTube, Instagram, LinkedIn, or video URL)');
      return;
    }
    setAttachedVideos((prev) => Array.from(new Set([...prev, normalized])));
    setVideoUrlInput('');
    setShowVideoUrlInput(false);
    showToast('Link attached to your post!');
  };

  // Remove attached video before posting
  const handleRemoveAttachedVideo = (indexToRemove: number) => {
    setAttachedVideos((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Handle drag and drop of photos into composer
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingOver) setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDropPhotos = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processUploadedFiles(e.dataTransfer.files);
    }
  };

  // Handle pasting images or links directly from clipboard into textarea
  const handlePasteClipboard = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // 1. Check for image files in clipboard
    const items = e.clipboardData?.items;
    if (items) {
      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i += 1) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) imageFiles.push(file);
        }
      }
      if (imageFiles.length > 0) {
        processUploadedFiles(imageFiles);
      }
    }

    // 2. Check for URL text in clipboard
    const pastedText = e.clipboardData?.getData('text') || '';
    const extractedUrl = extractFirstValidUrl(pastedText);
    if (extractedUrl && !detectedLinkUrl) {
      setDetectedLinkUrl(extractedUrl);
      setIsLoadingLinkPreview(true);
      fetchLinkPreview(extractedUrl)
        .then((meta) => {
          setComposerLinkMetadata(meta);
        })
        .catch(() => {
          // Silently fall back
        })
        .finally(() => {
          setIsLoadingLinkPreview(false);
        });
    }
  };

  // Remove attached image before posting
  const handleRemoveAttachedImage = (indexToRemove: number) => {
    setAttachedImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Promote an uploaded photo to be the cover (first) photo
  const handleMakeCoverImage = (indexToPromote: number) => {
    setAttachedImages((prev) => {
      if (indexToPromote <= 0 || indexToPromote >= prev.length) return prev;
      const chosen = prev[indexToPromote];
      const remaining = prev.filter((_, idx) => idx !== indexToPromote);
      return [chosen, ...remaining];
    });
    showToast('Updated cover photo for your post!');
  };

  // Edit image upload
  const handleEditImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    (Array.from(files) as File[]).forEach((file: File) => {
      const isImage =
        file.type.startsWith('image/') ||
        ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
        /\.(jpe?g|png|webp|gif|svg|avif|heic)$/i.test(file.name);
      if (!isImage) {
        showToast('Only JPG, PNG, WEBP, and GIF images are supported.');
        return;
      }
      compressImageFileToDataUrl(file)
        .then((result) => {
          if (result) {
            setEditImages((prev) => [...prev, result]);
          }
        })
        .catch(() => {
          const reader = new FileReader();
          reader.onload = (uploadEvent) => {
            const result = uploadEvent.target?.result as string;
            if (result) {
              setEditImages((prev) => [...prev, result]);
            }
          };
          reader.readAsDataURL(file);
        });
    });

    e.target.value = '';
  };

  const handleRemoveEditImage = (indexToRemove: number) => {
    setEditImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleEditVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    (Array.from(files) as File[]).forEach((file: File) => {
      if (!file.type.startsWith('video/')) {
        showToast('Only video files (MP4, WEBM, MOV) are supported.');
        return;
      }
      if (file.size <= 15 * 1024 * 1024) {
        const reader = new FileReader();
        reader.onload = (uploadEvent) => {
          const result = uploadEvent.target?.result as string;
          if (result) {
            setEditVideos((prev) => [...prev, result]);
          }
        };
        reader.readAsDataURL(file);
      } else {
        const objectUrl = URL.createObjectURL(file);
        setEditVideos((prev) => [...prev, objectUrl]);
      }
    });

    e.target.value = '';
  };

  const handleRemoveEditVideo = (indexToRemove: number) => {
    setEditVideos((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Toggle Like
  const handleToggleLike = (postId: number) => {
    togglePostLikeInDb(postId, currentUser.id).catch((err) => {
      console.warn('togglePostLikeInDb error:', err);
    });

    const targetPost = posts.find((p) => p.id === postId);
    if (targetPost && !targetPost.likedByMe) {
      notifyPostLike(targetPost, currentUser).catch((err) => {
        console.warn('notifyPostLike fallback:', err);
      });
    }

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const willLike = !p.likedByMe;
          if (willLike) playSound('like');
          return {
            ...p,
            likedByMe: willLike,
            likesCount: willLike ? p.likesCount + 1 : Math.max(0, p.likesCount - 1),
          };
        }
        return p;
      })
    );
  };

  // Create Post
  const handleCreatePost = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (isSubmittingPost) return;

    const pendingVideoOrSocialLink = normalizeUrlInput(videoUrlInput);
    const finalVideos = Array.from(
      new Set([
        ...attachedVideos,
        ...(pendingVideoOrSocialLink && /^https?:\/\//i.test(pendingVideoOrSocialLink)
          ? [pendingVideoOrSocialLink]
          : []),
      ])
    );

    if (!postContent.trim() && attachedImages.length === 0 && finalVideos.length === 0) return;

    const metaPrefix = [
      postFeeling ? `✨ ${postFeeling}` : null,
      postLocation ? `📍 ${postLocation}` : null,
    ]
      .filter(Boolean)
      .join(' · ');

    const defaultCaption = attachedImages.length > 0
      ? (attachedImages.length > 1 ? `Shared ${attachedImages.length} photos` : 'Shared a photo')
      : (finalVideos.length > 0 ? 'Shared a video' : 'Shared an update');

    const rawContent = postContent.trim() || defaultCaption;

    const finalContent = metaPrefix
      ? `${metaPrefix}\n\n${rawContent}`
      : rawContent;

    const resolvedLinkedUrl = detectedLinkUrl || extractFirstValidUrl(finalContent) || pendingVideoOrSocialLink || undefined;
    const resolvedLinkMetadata = composerLinkMetadata || undefined;

    setIsSubmittingPost(true);
    const tempPostId = -Date.now();
    const optimisticPost: PostItem = {
      id: tempPostId,
      userId: currentUser.id,
      fullName: currentUser.fullName || 'Notredamian Alumnus',
      avatarUrl: currentUser.avatarUrl || '/ndc-logo.png',
      batchYear: currentUser.batchYear || 68,
      content: finalContent,
      images: attachedImages,
      videos: finalVideos,
      linked_url: resolvedLinkedUrl,
      link_metadata: resolvedLinkMetadata,
      likesCount: 0,
      commentsCount: 0,
      createdAt: 'Just now',
      likedByMe: false,
      comments: [],
      category: selectedCategory,
      isEdited: false,
      pinned: false,
      author: currentUser.fullName || 'Notredamian Alumnus',
      authorAvatar: currentUser.avatarUrl || '/ndc-logo.png',
      authorBatch: currentUser.batchYear || 68,
      authorRole: 'Alumnus',
      verified: currentUser.verificationStatus === 'verified',
      timestamp: 'Just now',
      likes: 0,
      liked: false,
      commentsList: [],
      shares: 0,
    } as unknown as PostItem;

    // Show optimistic post immediately for instant responsiveness
    setPosts((prev) => [optimisticPost, ...prev]);

    try {
      // Persist directly to Supabase Database (Single Source of Truth)
      const res = await createFeedPostInDb({
        authorId: currentUser.id,
        content: finalContent,
        category: selectedCategory,
        images: attachedImages,
        videos: finalVideos,
        linked_url: resolvedLinkedUrl,
        link_metadata: resolvedLinkMetadata,
      });

      if (!res.success || !res.post) {
        // Rollback optimistic post immediately when database insert fails
        setPosts((prev) => prev.filter((p) => p.id !== tempPostId));
        showToast(res.error || 'Failed to publish post to Supabase database.');
        return;
      }

      // Prepend the real database-persisted post with its assigned ID and clear temp
      setPosts((prev) => [res.post!, ...prev.filter((p) => p.id !== tempPostId && p.id !== res.post!.id)]);
      if (finalContent.includes('আজকের প্রশ্ন:') || isDailyQuestionAnswer) {
        const match = finalContent.match(/আজকের প্রশ্ন:\s*([^\n]+)(?:\n+আমার উত্তর:\s*([\s\S]+))?/);
        const qText = match && match[1] ? match[1].trim() : 'আজকের প্রশ্ন';
        const aText = match && match[2] ? match[2].trim() : finalContent.replace(/^আজকের প্রশ্ন:[^\n]+/, '').trim();

        recordStreakAnswerInDb({
          userId: currentUser.id,
          authUserId: currentUser.authUserId,
          questionText: qText,
          answerText: aText || finalContent,
          postId: res.post.id,
        });
        setIsDailyQuestionAnswer(false);
      }
      setPostContent('');
      setAttachedImages([]);
      setAttachedVideos([]);
      setVideoUrlInput('');
      setShowVideoUrlInput(false);
      setDetectedLinkUrl(null);
      setComposerLinkMetadata(null);
      setSelectedCategory('General Update');
      setPostBackground('default');
      setPostFeeling(null);
      setPostLocation(null);
      setShowPhotoDropzone(false);
      setIsCreateModalOpen(false);
      playSound('post');
      showToast('Post published successfully to the alumni feed!');
    } catch (err: any) {
      // Rollback optimistic post on unexpected network or database error
      setPosts((prev) => prev.filter((p) => p.id !== tempPostId));
      console.error('Error creating feed post in Supabase:', err);
      showToast(err.message || 'Error publishing post');
    } finally {
      setIsSubmittingPost(false);
    }
  };

  // Open Edit Post
  const handleStartEdit = (post: PostItem) => {
    setActiveMenuPostId(null);
    setEditingPost(post);
    setEditContent(post.content);
    setEditImages([...(post.images || [])]);
    setEditVideos([...(post.videos || [])]);
    setEditCategory((post.category as PostCategory) || 'General Update');
  };

  // Save Post Changes
  const handleSaveEdit = () => {
    if (!editingPost) return;
    if (!editContent.trim() && editImages.length === 0 && editVideos.length === 0) {
      showToast('Post content, an image, or a video is required.');
      return;
    }

    editFeedPostInDb({
      postId: editingPost.id,
      content: editContent.trim(),
      category: editCategory,
      images: editImages,
      videos: editVideos,
    }).catch(() => {});

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === editingPost.id) {
          return {
            ...p,
            content: editContent.trim(),
            images: [...editImages],
            videos: [...editVideos],
            category: editCategory,
            isEdited: true,
          };
        }
        return p;
      })
    );

    setEditingPost(null);
    showToast('Your post has been updated!');
  };

  // Confirm and Execute Delete Post
  const handleConfirmDelete = async () => {
    if (!postToDelete) return;
    const targetPost = postToDelete;
    const targetPostId = targetPost.id;
    setPostToDelete(null);

    try {
      const ok = await deleteFeedPostInDb(targetPostId);
      if (ok) {
        setPosts((prev) => prev.filter((p) => p.id !== targetPostId));
        playSound('pop');
        showToast('Post has been deleted.');
      } else {
        showToast('Failed to delete post. You may not have permission to delete this post.');
      }
    } catch {
      showToast('Failed to delete post. Please try again.');
    }
  };

  // Submit Report
  const handleSubmitReport = () => {
    if (!postToReport) return;
    setPostToReport(null);
    showToast('Thank you. This post has been reported to the Notre Dame moderation team.');
  };

  // Open Lightbox
  const handleOpenLightbox = (post: PostItem, imageIndex: number) => {
    setLightboxState({
      isOpen: true,
      images: post.images,
      initialIndex: imageIndex,
      postAuthor: {
        fullName: post.fullName,
        avatarUrl: post.avatarUrl,
        batchYear: post.batchYear,
        createdAt: post.createdAt,
      },
      postCaption: post.content,
    });
  };

  // Refresh the first page directly from Supabase.
  const handleRefreshFeed = async () => {
    setHasNewPosts(false);
    setFeedError(null);
    setIsLoadingPosts(true);
    try {
      const dbPosts = await fetchFeedPostsFromDb(FEED_PAGE_SIZE, currentUser.id, 0);
      const loadedPosts = (dbPosts || []).filter((p) => !isProfilePhotoPost(p));
      nextFeedOffsetRef.current = loadedPosts.length;
      setPosts(loadedPosts);
      setHasMorePosts(loadedPosts.length === FEED_PAGE_SIZE);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showToast('Feed refreshed from Supabase!');
    } catch (err) {
      console.error('FeedView: failed to refresh Supabase posts:', err);
      if (posts.length === 0) {
        setFeedError('We could not load the feed. Check your connection and try again.');
      }
      showToast('Failed to refresh feed from database.');
    } finally {
      setIsLoadingPosts(false);
    }
  };

  const handleLoadMorePosts = async () => {
    if (loadMoreInFlightRef.current || !hasMorePosts) return;

    loadMoreInFlightRef.current = true;
    setIsLoadingMorePosts(true);
    setFeedError(null);
    const offset = nextFeedOffsetRef.current;

    try {
      const rawNextPage = await fetchFeedPostsFromDb(FEED_PAGE_SIZE, currentUser.id, offset);
      const nextPage = (rawNextPage || []).filter((p) => !isProfilePhotoPost(p));
      nextFeedOffsetRef.current = offset + nextPage.length;
      setPosts((previousPosts) => {
        const existingIds = new Set(previousPosts.map((post) => post.id));
        return [...previousPosts, ...nextPage.filter((post) => !existingIds.has(post.id))];
      });
      setHasMorePosts(nextPage.length === FEED_PAGE_SIZE);
    } catch (err) {
      console.error('FeedView: failed to load more Supabase posts:', err);
      setFeedError('More posts could not be loaded. Check your connection and try again.');
    } finally {
      loadMoreInFlightRef.current = false;
      setIsLoadingMorePosts(false);
    }
  };

  // Add Comment
  const handleAddComment = (postId: number) => {
    const text = (commentInputs[postId] || '').trim();
    if (!text) return;

    addPostCommentInDb({
      postId,
      userId: currentUser.id,
      content: text,
    }).catch((err) => {
      console.warn('addPostCommentInDb fallback:', err);
    });

    const targetPost = posts.find((p) => p.id === postId);
    if (targetPost) {
      notifyPostComment(targetPost, text, currentUser).catch((err) => {
        console.warn('notifyPostComment fallback:', err);
      });
    }

    const newComment: PostComment = {
      id: Date.now(),
      postId,
      userId: currentUser.id || currentUser.userId,
      fullName: currentUser.fullName,
      avatarUrl: currentUser.avatarUrl,
      content: text,
      likesCount: 0,
      likedByMe: false,
      createdAt: 'Just now',
      replies: [],
    };

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          return {
            ...p,
            commentsCount: p.commentsCount + 1,
            comments: [...p.comments, newComment],
          };
        }
        return p;
      })
    );

    setCommentInputs({ ...commentInputs, [postId]: '' });
    playSound('comment');
  };

  // Add Reply
  const handleAddReply = (postId: number, parentCommentId: number) => {
    const text = (replyInputs[parentCommentId] || '').trim();
    if (!text) return;

    addPostCommentInDb({
      postId,
      userId: currentUser.id,
      content: text,
    }).catch(() => {});

    const targetPost = posts.find((p) => p.id === postId);
    const parentComment = targetPost?.comments?.find((c) => c.id === parentCommentId);
    if (targetPost && parentComment) {
      notifyCommentReply(targetPost, parentComment, text, currentUser).catch((err) => {
        console.warn('notifyCommentReply fallback:', err);
      });
    }

    const newReply: PostComment = {
      id: Date.now(),
      postId,
      userId: currentUser.id || currentUser.userId,
      fullName: currentUser.fullName,
      avatarUrl: currentUser.avatarUrl,
      content: text,
      likesCount: 0,
      likedByMe: false,
      createdAt: 'Just now',
    };

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const updatedComments = p.comments.map((c) => {
            if (c.id === parentCommentId) {
              return {
                ...c,
                replies: [...(c.replies || []), newReply],
              };
            }
            return c;
          });
          return {
            ...p,
            commentsCount: p.commentsCount + 1,
            comments: updatedComments,
          };
        }
        return p;
      })
    );

    setReplyInputs({ ...replyInputs, [parentCommentId]: '' });
    setActiveReplyId(null);
  };

  const handleAnswerDailyQuestion = (questionText: string) => {
    setIsDailyQuestionAnswer(true);
    setPostContent(`আজকের প্রশ্ন: ${questionText}\n\nআমার উত্তর: `);
    setIsCreateModalOpen(true);
    setTimeout(() => {
      if (composerTextareaRef.current) {
        composerTextareaRef.current.focus();
        const len = composerTextareaRef.current.value.length;
        composerTextareaRef.current.setSelectionRange(len, len);
      }
    }, 120);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 sm:top-20 right-3 sm:right-5 max-w-[calc(100vw-1.5rem)] sm:max-w-md z-50 flex items-center gap-2.5 px-3.5 sm:px-4 py-2.5 sm:py-3 bg-slate-900/95 text-white dark:bg-white/95 dark:text-slate-900 rounded-2xl shadow-xl border border-slate-700/50 dark:border-slate-200 text-xs font-semibold animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span className="truncate">{toastMessage}</span>
        </div>
      )}

      {/* New Posts Floating Indicator */}
      {hasNewPosts && (
        <div className="sticky top-20 z-30 flex justify-center animate-bounce">
          <button
            type="button"
            onClick={handleRefreshFeed}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-full shadow-lg shadow-blue-600/30 border border-blue-400/40 transition-all cursor-pointer hover:scale-105"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>New posts available · Click to refresh view</span>
          </button>
        </div>
      )}

      {/* Offline Notice Banner */}
      {!isOnline && (
        <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-2.5">
            <WifiOff className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              <strong>Offline Mode Active:</strong> You are browsing cached feed posts.
            </span>
          </div>
        </div>
      )}

      {/* Emergency Blood Alert Banner (Dismissible with Cross button) */}
      <BloodNeededNowSection
        variant="feed"
        onNavigateToBloodNetwork={() => onNavigate && onNavigate('emergency')}
      />

      {/* Daily Nostalgia Question & Duolingo-style Streak */}
      <DailyQuestion
        onAnswerQuestion={handleAnswerDailyQuestion}
        onViewProfile={onViewProfile}
      />

      {/* Create Post Card (Facebook-Style Trigger Bar -> Opens "New Post" Modal on Click) */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(e) => {
          handleDropPhotos(e);
          setIsCreateModalOpen(true);
        }}
        className={`bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border transition-all shadow-xs ${
          isDraggingOver
            ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/40 dark:bg-blue-950/20'
            : 'border-slate-200/80 dark:border-slate-800'
        }`}
      >
        {/* Top Row: Avatar + Clickable Placeholder + Quick Photo & Emoji Icons */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <img
            src={currentUser.avatarUrl}
            alt={currentUser.fullName}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover ring-2 ring-blue-500/20 shrink-0"
          />

          {/* Clickable Placeholder that opens the Facebook-style New Post modal */}
          <button
            type="button"
            id="open-create-post-modal-btn"
            onClick={() => {
              setIsCreateModalOpen(true);
              setTimeout(() => composerTextareaRef.current?.focus(), 80);
            }}
            className="flex-1 text-left px-4 py-3 rounded-full bg-slate-100 hover:bg-slate-200/75 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 text-sm text-slate-500 dark:text-slate-400 transition-all cursor-pointer truncate"
          >
            {postContent.trim()
              ? postContent
              : 'Share something with your NDC family...'}
          </button>
        </div>

        {/* Hidden File Input for Multi-Image Upload */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={handleImageUpload}
          className="hidden"
          id="feed-photo-upload-input"
        />

        {/* Hidden File Input for Video Upload */}
        <input
          type="file"
          ref={videoInputRef}
          accept="video/mp4,video/webm,video/ogg,video/quicktime"
          multiple
          onChange={handleVideoUpload}
          className="hidden"
          id="feed-video-upload-input"
        />

        {/* Hidden Camera Capture Input */}
        <input
          type="file"
          ref={cameraInputRef}
          accept="image/*,video/*"
          capture="environment"
          onChange={handleImageUpload}
          className="hidden"
          id="feed-camera-capture-input"
        />
      </div>

      {/* ===================================================================== */}
      {/* FACEBOOK-STYLE "NEW POST" MODAL (APPEARS WHEN CLICKING PLACEHOLDER)   */}
      {/* ===================================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDropPhotos}
            className="bg-white dark:bg-slate-900 w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-lg sm:rounded-3xl border-0 sm:border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden relative"
          >
            {/* Drag-and-Drop Overlay Indicator */}
            {isDraggingOver && (
              <div className="absolute inset-3 z-40 rounded-2xl bg-blue-600/90 backdrop-blur-xs border-2 border-dashed border-white flex flex-col items-center justify-center text-white p-6 text-center pointer-events-none animate-fade-in">
                <UploadCloud className="w-12 h-12 mb-2 animate-bounce" />
                <p className="text-base font-bold">Drop photos here to attach to your post</p>
                <p className="text-xs text-blue-100 mt-1">Supports JPG, PNG, WEBP & GIF</p>
              </div>
            )}

            {/* 1. Top Navigation Header: X | New Post | Settings */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200/80 dark:border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                aria-label="Close New Post"
                className="p-2 -ml-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                New Post
              </h2>

              <button
                type="button"
                onClick={() => {
                  setIsCategoryDropdownOpen((prev) => !prev);
                  playSound('click');
                }}
                title="Public audience · Click to select post category"
                aria-label="Public post audience and category"
                className="p-2 -mr-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              >
                <Globe className="w-5 h-5 text-blue-500" />
              </button>
            </div>

            {/* 2. Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {/* Author Info + Audience Pill & Category Dropdown (Under Globe Image) */}
              <div className="flex items-start gap-3">
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.fullName}
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover ring-2 ring-blue-500/20 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {currentUser.fullName}
                    </span>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      · Batch {currentUser.batchYear}
                    </span>
                    {postFeeling && (
                      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                        is {postFeeling}
                      </span>
                    )}
                    {postLocation && (
                      <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                        at {postLocation}
                      </span>
                    )}
                  </div>

                  {/* Under the user info: Audience & Category Dropdown */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {/* Globe Public Audience Badge */}
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium border border-slate-200/80 dark:border-slate-700/70 shrink-0">
                      <Globe className="w-3.5 h-3.5 text-blue-500" />
                      <span>Public</span>
                    </span>

                    {/* Category Dropdown Trigger (Under globe image) */}
                    <div ref={categoryDropdownRef} className="relative">
                      <motion.button
                        type="button"
                        onClick={() => {
                          setIsCategoryDropdownOpen((prev) => !prev);
                          playSound('click');
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        aria-expanded={isCategoryDropdownOpen}
                        aria-haspopup="listbox"
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border shadow-2xs ${
                          selectedCategory === 'Blood Donation'
                            ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800 ring-1 ring-rose-400/40 font-bold'
                            : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700/80'
                        }`}
                      >
                        {(() => {
                          const currentCat = CATEGORIES.find((c) => c.label === selectedCategory) || CATEGORIES[0];
                          const CurrentIcon = currentCat.icon;
                          const isBlood = selectedCategory === 'Blood Donation';
                          return (
                            <>
                              <CurrentIcon className={`w-3.5 h-3.5 ${isBlood ? 'text-rose-600 fill-rose-600 animate-pulse' : 'text-slate-500 dark:text-slate-400'}`} />
                              <span className="truncate max-w-[130px] sm:max-w-none">{selectedCategory}</span>
                            </>
                          );
                        })()}
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 ml-0.5 transition-transform ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                      </motion.button>

                      {/* Dropdown Menu when alumni click it: shows post categories */}
                      <AnimatePresence>
                        {isCategoryDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -6, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.98 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                            className="absolute left-0 top-full mt-1.5 z-50 w-72 sm:w-80 p-3 rounded-2xl bg-white/98 dark:bg-slate-900/98 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-700/80 shadow-2xl shadow-slate-950/25 space-y-2.5 max-h-[380px] flex flex-col"
                          >
                            {/* Search categories */}
                            <div className="relative shrink-0">
                              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                value={categorySearchQuery}
                                onChange={(e) => setCategorySearchQuery(e.target.value)}
                                placeholder="Search post categories..."
                                className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                              />
                              {categorySearchQuery && (
                                <button
                                  type="button"
                                  onClick={() => setCategorySearchQuery('')}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            {/* Categories List: Blood Donation is highlighted, others simple, all as standard category buttons */}
                            <div className="overflow-y-auto space-y-1 pr-1 flex-1 custom-scrollbar">
                              {CATEGORIES.filter((cat) => {
                                if (!categorySearchQuery.trim()) return true;
                                const q = categorySearchQuery.toLowerCase();
                                return (
                                  cat.label.toLowerCase().includes(q) ||
                                  cat.description.toLowerCase().includes(q)
                                );
                              }).map((cat) => {
                                const isBlood = cat.label === 'Blood Donation';
                                const Icon = cat.icon;
                                const isSelected = selectedCategory === cat.label;

                                return (
                                  <button
                                    key={cat.label}
                                    type="button"
                                    onClick={() => {
                                      setSelectedCategory(cat.label);
                                      setIsCategoryDropdownOpen(false);
                                      setCategorySearchQuery('');
                                      if (isBlood) playSound('like');
                                      else playSound('click');
                                    }}
                                    className={`w-full px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer flex items-center justify-between gap-2.5 ${
                                      isSelected
                                        ? isBlood
                                          ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 font-bold border border-rose-300 dark:border-rose-800'
                                          : 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200/80 dark:border-blue-800/60'
                                        : isBlood
                                        ? 'bg-rose-50/70 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 hover:bg-rose-100/80 dark:hover:bg-rose-900/40 border border-rose-200/80 dark:border-rose-800/60 font-semibold'
                                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 border border-transparent'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div
                                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                          isBlood
                                            ? 'bg-rose-600 text-white shadow-xs'
                                            : isSelected
                                            ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                        }`}
                                      >
                                        <Icon className={`w-3.5 h-3.5 ${isBlood ? 'fill-white text-white' : ''}`} />
                                      </div>
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-xs truncate">{cat.label}</span>
                                          {isBlood && (
                                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold uppercase bg-rose-600 text-white">
                                              Urgent
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {isSelected && (
                                      <Check className={`w-4 h-4 shrink-0 ${isBlood ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'}`} />
                                    )}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Dropdown Footer */}
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400 shrink-0">
                              <span>{CATEGORIES.length} Post Categories</span>
                              <button
                                type="button"
                                onClick={() => setIsCategoryDropdownOpen(false)}
                                className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                              >
                                Done
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Post Textarea */}
              <div
                className={`rounded-2xl transition-all relative ${
                  postBackground !== 'default'
                    ? `${postBackground} p-6 min-h-[180px] flex items-center justify-center text-center shadow-inner`
                    : 'bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 p-3.5'
                }`}
              >
                <textarea
                  ref={composerTextareaRef}
                  rows={postBackground !== 'default' ? 4 : 4}
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  onPaste={handlePasteClipboard}
                  placeholder="Share something with your NDC family..."
                  className={`w-full bg-transparent focus:outline-none resize-none ${
                    postBackground !== 'default'
                      ? 'text-white placeholder-white/80 text-xl font-bold text-center'
                      : 'text-base text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 min-h-[105px]'
                  }`}
                />
              </div>

              {/* Optional Feeling / Activity Picker Drawer */}
              {showFeelingPicker && (
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      How are you feeling?
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowFeelingPicker(false)}
                      className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'feeling proud 🎓',
                      'celebrating an achievement 🏆',
                      'missing NDC campus ❤️',
                      'excited for reunion 🎉',
                      'sharing career advice 💼',
                      'seeking medical consultation 🩺',
                    ].map((feel) => (
                      <button
                        key={feel}
                        type="button"
                        onClick={() => {
                          setPostFeeling(postFeeling === feel ? null : feel);
                          setShowFeelingPicker(false);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                          postFeeling === feel
                            ? 'bg-amber-500 text-white'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {feel}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Optional Location Check-in Picker Drawer */}
              {showLocationPicker && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/90 dark:border-slate-700/80 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        Check in at a location
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {postLocation && (
                        <button
                          type="button"
                          onClick={() => {
                            setPostLocation(null);
                          }}
                          className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowLocationPicker(false)}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer px-2 py-0.5 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                      >
                        Done
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {/* Free-form Location Input where anyone can type any location */}
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-rose-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        autoFocus
                        placeholder="Type any location, city, campus, or workplace..."
                        value={postLocation || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPostLocation(val.trim() ? val : null);
                        }}
                        className="w-full pl-9 pr-8 py-2.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/25 focus:border-rose-500 shadow-2xs"
                      />
                      {postLocation && (
                        <button
                          type="button"
                          onClick={() => setPostLocation(null)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Quick suggestion tags for 1-tap selection */}
                    <div className="pt-0.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                        Suggested Locations:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          'Notre Dame College, Motijheel',
                          'Dhaka Medical College (DMC)',
                          'BUET Campus, Dhaka',
                          'Dhaka University',
                          'Silicon Valley Chapter',
                          'London UK Chapter',
                          'Toronto Canada Chapter',
                          'Chattogram',
                          'Sylhet',
                        ].map((loc) => {
                          const isSelected = postLocation === loc;
                          return (
                            <button
                              key={loc}
                              type="button"
                              onClick={() => {
                                setPostLocation(isSelected ? null : loc);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-all border ${
                                isSelected
                                  ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-rose-400'
                              }`}
                            >
                              📍 {loc}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Current check-in badge */}
                    {postLocation && (
                      <div className="flex items-center justify-between p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs font-semibold text-rose-700 dark:text-rose-300">
                        <span className="flex items-center gap-1.5 truncate">
                          <span>📍</span>
                          <span className="font-bold">Checking in at:</span>
                          <span className="truncate">{postLocation}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setPostLocation(null)}
                          className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-200 ml-2 cursor-pointer shrink-0"
                          title="Remove location"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* =============================================================== */}
              {/* INTERACTIVE PHOTO UPLOAD STUDIO & MULTI-PHOTO PREVIEW GRID      */}
              {/* =============================================================== */}
              <div className="space-y-3 pt-1">
                {/* Multi-Photo Grid Preview when photos are attached */}
                {attachedImages.length > 0 && (
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/70 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-emerald-500" />
                        <span>Attached Photos ({attachedImages.length})</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add More</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setAttachedImages([])}
                          className="px-2 py-1 rounded-lg text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>

                    <div
                      className={`grid gap-2 ${
                        attachedImages.length === 1
                          ? 'grid-cols-1'
                          : attachedImages.length === 2
                          ? 'grid-cols-2'
                          : 'grid-cols-2 sm:grid-cols-3'
                      }`}
                    >
                      {attachedImages.map((img, idx) => (
                        <div
                          key={idx}
                          className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900"
                        >
                          <img
                            src={img}
                            alt={`Attachment ${idx + 1}`}
                            className={`w-full object-cover ${
                              attachedImages.length === 1 ? 'max-h-56' : 'h-32'
                            }`}
                          />
                          {/* Cover Badge or Make Cover Button */}
                          {idx === 0 ? (
                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold">
                              Cover Photo
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleMakeCoverImage(idx)}
                              className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 hover:bg-blue-600 text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 cursor-pointer"
                              title="Set as first photo"
                            >
                              <ArrowUpLeft className="w-3 h-3" />
                              <span>Make Cover</span>
                            </button>
                          )}

                          {/* Remove Photo Button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachedImage(idx)}
                            className="absolute top-2 right-2 p-1.5 bg-black/75 hover:bg-rose-600 text-white rounded-full transition-colors cursor-pointer"
                            title="Remove photo"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Live Link Preview: small preview thumbnail under textarea with spinner while loading */}
                {(() => {
                  const activeUrl = detectedLinkUrl || extractFirstValidUrl(postContent);
                  if (!activeUrl && !isLoadingLinkPreview) return null;

                  return (
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/70 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                          <Link2 className="w-4 h-4 text-blue-500" />
                          <span>Link Preview</span>
                        </span>
                        {detectedLinkUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              setDetectedLinkUrl(null);
                              setComposerLinkMetadata(null);
                            }}
                            className="text-[11px] text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                          >
                            Remove preview
                          </button>
                        )}
                      </div>

                      {isLoadingLinkPreview ? (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                          <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                              Fetching link preview...
                            </p>
                            <p className="text-[11px] text-slate-400 truncate font-mono">
                              {activeUrl}
                            </p>
                          </div>
                        </div>
                      ) : composerLinkMetadata ? (
                        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                          <div className="flex items-center gap-3 p-2.5">
                            {composerLinkMetadata.image ? (
                              <img
                                src={composerLinkMetadata.image}
                                alt={composerLinkMetadata.title}
                                className="w-16 h-16 rounded-lg object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-400">
                                <Globe className="w-6 h-6" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                {composerLinkMetadata.site_name || composerLinkMetadata.type}
                              </span>
                              <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                {composerLinkMetadata.title || activeUrl}
                              </h5>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                                {composerLinkMetadata.description || activeUrl}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : activeUrl ? (
                        <LinkPreview url={activeUrl} autoPlayOnScroll={false} />
                      ) : null}
                    </div>
                  );
                })()}

                {/* Attached Videos Preview when videos are attached */}
                {attachedVideos.length > 0 && (
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/70 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <Video className="w-4 h-4 text-purple-500" />
                        <span>Attached Videos & Links ({attachedVideos.length})</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => videoInputRef.current?.click()}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Video</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setAttachedVideos([])}
                          className="px-2 py-1 rounded-lg text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {attachedVideos.map((vidUrl, idx) => {
                        const isDirect =
                          vidUrl.startsWith('data:video/') ||
                          vidUrl.startsWith('blob:') ||
                          /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(vidUrl);

                        return (
                          <div key={idx} className="relative rounded-2xl overflow-hidden bg-black">
                            {isDirect ? (
                              <FeedVideoPlayer
                                src={vidUrl}
                                autoPlayOnScroll={false}
                                controls={true}
                                mutedDefault={true}
                              />
                            ) : (
                              <LinkPreview url={vidUrl} autoPlayOnScroll={false} />
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveAttachedVideo(idx)}
                              className="absolute top-2.5 right-2.5 p-1.5 bg-black/80 hover:bg-rose-600 text-white rounded-full transition-colors cursor-pointer z-30 shadow-md"
                              title="Remove attached video or link"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Optional Video / Social Link (YouTube / Facebook / Instagram / LinkedIn / MP4 URL) Input Drawer */}
                {showVideoUrlInput && (
                  <div className="p-3 rounded-2xl bg-purple-50/60 dark:bg-purple-950/25 border border-purple-200/80 dark:border-purple-800/60 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <Link2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        <span>Share Video or Post Link (Facebook, YouTube, Instagram, LinkedIn, MP4)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowVideoUrlInput(false)}
                        className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={videoUrlInput}
                        onChange={(e) => setVideoUrlInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddVideoUrl();
                          }
                        }}
                        placeholder="Paste Facebook video/post link, YouTube, Instagram, LinkedIn, or .mp4 URL..."
                        className="flex-1 px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddVideoUrl}
                        className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
                      >
                        Attach
                      </button>
                    </div>

                    {/* Live Preview inside the Link Drawer */}
                    {videoUrlInput.trim() && /^https?:\/\//i.test(normalizeUrlInput(videoUrlInput)) && (
                      <div className="pt-1">
                        <SharedEmbedCard
                          url={normalizeUrlInput(videoUrlInput)}
                          autoPlayOnScroll={false}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Expandable Drag-and-Drop Photo/Video Upload Box */}
                {showPhotoDropzone && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-4 rounded-2xl border-2 border-dashed border-emerald-400/70 dark:border-emerald-500/50 bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/30 transition-all text-center cursor-pointer space-y-1.5"
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      Click to upload photos or drag & drop photos/videos here
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Supports JPG, PNG, WEBP, GIF photos & MP4, WEBM, MOV videos
                    </div>
                  </div>
                )}

                {/* Facebook-Style Horizontal Camera, Upload Photos & Upload Videos Strip */}
                <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                  {/* Camera Tile */}
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="w-24 h-24 rounded-2xl bg-slate-100 hover:bg-slate-200/70 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700 flex flex-col items-center justify-center gap-1.5 text-slate-700 dark:text-slate-200 shrink-0 transition-colors cursor-pointer"
                  >
                    <Camera className="w-6 h-6 text-blue-500" />
                    <span className="text-[11px] font-bold">Camera</span>
                  </button>

                  {/* Add Photos Tile */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 border border-emerald-200/80 dark:border-emerald-800/70 flex flex-col items-center justify-center gap-1.5 text-emerald-700 dark:text-emerald-300 shrink-0 transition-colors cursor-pointer"
                  >
                    <ImageIcon className="w-6 h-6 text-emerald-500" />
                    <span className="text-[11px] font-bold">Add Photos</span>
                  </button>

                  {/* Add Video File Tile */}
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="w-24 h-24 rounded-2xl bg-purple-50 hover:bg-purple-100/80 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 border border-purple-200/80 dark:border-purple-800/70 flex flex-col items-center justify-center gap-1.5 text-purple-700 dark:text-purple-300 shrink-0 transition-colors cursor-pointer"
                  >
                    <Video className="w-6 h-6 text-purple-500" />
                    <span className="text-[11px] font-bold">Add Video</span>
                  </button>

                  {/* Add Video URL / YouTube Tile */}
                  <button
                    type="button"
                    onClick={() => setShowVideoUrlInput((v) => !v)}
                    className="w-24 h-24 rounded-2xl bg-indigo-50 hover:bg-indigo-100/80 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 border border-indigo-200/80 dark:border-indigo-800/70 flex flex-col items-center justify-center gap-1.5 text-indigo-700 dark:text-indigo-300 shrink-0 transition-colors cursor-pointer"
                  >
                    <Link2 className="w-6 h-6 text-indigo-500" />
                    <span className="text-[11px] font-bold">Video Link</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 3. Toolbar Row: Aa Background Picker + Photo Upload + Emoji Picker + Feeling + Location */}
            <div className="px-4 py-2.5 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-200/70 dark:border-slate-800 shrink-0">
              {showBgPicker && (
                <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-slate-200/60 dark:border-slate-700/60 overflow-x-auto scrollbar-none">
                  {[
                    { id: 'default', label: 'Default', preview: 'bg-slate-200 dark:bg-slate-700' },
                    { id: 'bg-gradient-to-br from-blue-600 to-indigo-800', label: 'NDC Blue', preview: 'bg-gradient-to-br from-blue-600 to-indigo-800' },
                    { id: 'bg-gradient-to-br from-emerald-600 to-teal-800', label: 'Emerald', preview: 'bg-gradient-to-br from-emerald-600 to-teal-800' },
                    { id: 'bg-gradient-to-br from-purple-600 to-rose-600', label: 'Celebration', preview: 'bg-gradient-to-br from-purple-600 to-rose-600' },
                    { id: 'bg-gradient-to-br from-amber-500 to-orange-700', label: 'Gold', preview: 'bg-gradient-to-br from-amber-500 to-orange-700' },
                  ].map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setPostBackground(theme.id)}
                      title={theme.label}
                      className={`w-7 h-7 rounded-lg ${theme.preview} shrink-0 cursor-pointer transition-transform ${
                        postBackground === theme.id ? 'ring-2 ring-blue-500 scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 sm:gap-1.5">
                  {/* Aa Text Background Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowBgPicker((v) => !v)}
                    className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white text-xs font-extrabold tracking-tight shadow-xs cursor-pointer"
                  >
                    Aa
                  </button>

                  {/* Upload Photo Toggle / Picker */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowPhotoDropzone((v) => !v);
                      fileInputRef.current?.click();
                    }}
                    title="Upload Photos"
                    className={`p-2 rounded-xl transition-colors cursor-pointer ${
                      showPhotoDropzone || attachedImages.length > 0
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                        : 'hover:bg-slate-200/70 dark:hover:bg-slate-700/70 text-emerald-500'
                    }`}
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>

                  {/* Upload Video Picker */}
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    title="Upload Video"
                    className={`p-2 rounded-xl transition-colors cursor-pointer ${
                      attachedVideos.length > 0
                        ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400'
                        : 'hover:bg-slate-200/70 dark:hover:bg-slate-700/70 text-purple-500'
                    }`}
                  >
                    <Video className="w-5 h-5" />
                  </button>

                  {/* Feeling / Activity */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowFeelingPicker((v) => !v);
                      setShowLocationPicker(false);
                    }}
                    title="Feeling / Activity"
                    className={`p-2 rounded-xl transition-colors cursor-pointer ${
                      showFeelingPicker || postFeeling
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                        : 'hover:bg-slate-200/70 dark:hover:bg-slate-700/70 text-amber-500'
                    }`}
                  >
                    <Smile className="w-5 h-5" />
                  </button>

                  {/* Check-in Location */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowLocationPicker((v) => !v);
                      setShowFeelingPicker(false);
                    }}
                    title="Check-in Location"
                    className={`p-2 rounded-xl transition-colors cursor-pointer ${
                      showLocationPicker || postLocation
                        ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                        : 'hover:bg-slate-200/70 dark:hover:bg-slate-700/70 text-rose-500'
                    }`}
                  >
                    <MapPin className="w-5 h-5" />
                  </button>
                </div>

                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                  {attachedImages.length > 0 || attachedVideos.length > 0
                    ? `${attachedImages.length} photo(s) · ${attachedVideos.length} video(s)`
                    : 'Add to your post'}
                </span>
              </div>
            </div>

            {/* 4. Bottom Sticky Bar: Audience/Category Summary Pill + Blue "Post" Button */}
            <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsCategoryDropdownOpen((prev) => !prev);
                  playSound('click');
                }}
                title="Click to change post category"
                aria-label="Public post audience and category"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer border border-slate-200/60 dark:border-slate-700/60"
              >
                <Globe className="w-3.5 h-3.5 text-blue-500" />
                <span>Public</span>
                <span className="text-slate-400">·</span>
                <span className={selectedCategory === 'Blood Donation' ? 'text-rose-600 dark:text-rose-400 font-extrabold' : 'text-blue-600 dark:text-blue-400'}>
                  {selectedCategory}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
              </button>

              <button
                type="button"
                id="submit-post-btn"
                onClick={handleCreatePost}
                disabled={
                  isSubmittingPost ||
                  (!postContent.trim() &&
                    attachedImages.length === 0 &&
                    attachedVideos.length === 0 &&
                    !videoUrlInput.trim())
                }
                className="inline-flex items-center justify-center gap-2 px-7 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer"
              >
                <span>{isSubmittingPost ? 'Posting...' : 'Post'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* FEED CATEGORY FILTER: QUICK-PILL TOPIC CAROUSEL                       */}
      {/* ===================================================================== */}
      <div className="space-y-2.5">

        {/* Streamlined Quick-Pill Carousel */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-0.5">
          {['All', ...CATEGORIES.map((c) => c.label)].map((catLabel) => {
            const active = activeFilterCategory === catLabel;
            const isBlood = catLabel === 'Blood Donation';
            const catItem = CATEGORIES.find((c) => c.label === catLabel);
            const Icon = catItem ? catItem.icon : Globe;
            return (
              <motion.button
                key={catLabel}
                type="button"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  setActiveFilterCategory(catLabel);
                  if (isBlood) playSound('like');
                  else playSound('click');
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 border ${
                  active
                    ? isBlood
                      ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/30 ring-2 ring-rose-400'
                      : 'bg-blue-600 text-white border-blue-500 shadow-xs'
                    : isBlood
                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800 hover:bg-rose-100 font-extrabold'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-800 hover:border-blue-400'
                }`}
              >
                {isBlood ? (
                  <Droplet className={`w-3.5 h-3.5 ${active ? 'fill-white text-white' : 'fill-rose-500 text-rose-500'}`} />
                ) : (
                  <Icon className="w-3.5 h-3.5" />
                )}
                <span>{catLabel}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Dedicated Active Blood Donation Alert Banner on Feed */}
        {activeFilterCategory === 'Blood Donation' && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-gradient-to-r from-rose-500/15 via-rose-500/10 to-rose-500/5 dark:from-rose-950/50 dark:via-rose-950/30 dark:to-slate-900 border border-rose-400/60 dark:border-rose-700/60 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-rose-900 dark:text-rose-100"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-600/25 animate-pulse">
                <Droplet className="w-5 h-5 fill-white text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs sm:text-sm font-black text-rose-900 dark:text-rose-100">
                    Urgent Blood Appeals & Patient Support
                  </h4>
                  <span className="px-2 py-0.2 rounded-full text-[10px] font-black bg-rose-600 text-white uppercase tracking-wider">
                    Emergency Priority
                  </span>
                </div>
                <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                  Showing critical blood requests and plasma appeals from batchmates and hospital attendants.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('Blood Donation');
                  setIsCreateModalOpen(true);
                  setTimeout(() => composerTextareaRef.current?.focus(), 100);
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Post Appeal</span>
              </button>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('emergency')}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-xs font-bold cursor-pointer"
                >
                  Blood Network
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveFilterCategory('All')}
                className="px-2.5 py-1.5 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Clear
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Posts Stream */}
      <div className="space-y-5">
        {(() => {
          if (isLoadingPosts) {
            return (
              <>
                {[0, 1, 2].map((placeholder) => (
                  <article
                    key={placeholder}
                    aria-hidden="true"
                    className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs animate-pulse"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-40 max-w-full rounded-full bg-slate-200 dark:bg-slate-700" />
                        <div className="h-2.5 w-24 rounded-full bg-slate-100 dark:bg-slate-800" />
                      </div>
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800" />
                      <div className="h-3 w-4/5 rounded-full bg-slate-100 dark:bg-slate-800" />
                    </div>
                    <div className="h-40 rounded-2xl bg-slate-100 dark:bg-slate-800" />
                  </article>
                ))}
                <p role="status" className="text-xs text-center text-slate-500 dark:text-slate-400">
                  Loading feed posts...
                </p>
              </>
            );
          }

          if (feedError && posts.length === 0) {
            const isGuest = !currentUser.id || currentUser.id === 0;
            return (
              <div
                role="alert"
                className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 text-center shadow-xs"
              >
                {isGuest ? (
                  <Lock className="w-8 h-8 mx-auto text-blue-600 dark:text-blue-400 mb-3" />
                ) : (
                  <AlertTriangle className="w-6 h-6 mx-auto text-amber-500 mb-3" />
                )}
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  {isGuest ? 'Alumni Community Feed' : 'Feed unavailable'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">{feedError}</p>
                {isGuest ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (onNavigate) {
                        onNavigate('home');
                      }
                      window.dispatchEvent(new CustomEvent('ndc_open_auth_modal'));
                    }}
                    className="mt-4 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    Sign In / Register
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleRefreshFeed()}
                    className="mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                  >
                    Try again
                  </button>
                )}
              </div>
            );
          }

          const displayedPosts =
            activeFilterCategory !== 'All'
              ? posts.filter((p) => p.category === activeFilterCategory)
              : posts;

          if (displayedPosts.length === 0) {
            return (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 border border-slate-200/80 dark:border-slate-800 text-center shadow-xs">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  Welcome to the Alumni Feed
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  {posts.length > 0
                    ? `No ${activeFilterCategory} posts have loaded yet. Load more posts to continue searching.`
                    : 'No posts have been published yet. Share a professional milestone, career update, or reunion announcement using the box above!'}
                </p>
              </div>
            );
          }

          return displayedPosts.map((post) => {
            const isOwner = Boolean(
              currentUser &&
              (post.userId === currentUser.id ||
                post.userId === currentUser.userId ||
                post.authorId === currentUser.id ||
                post.authorId === currentUser.userId)
            );
            const firstPostUrl =
              extractFirstValidUrl(post.content) ||
              (post.videos && post.videos.length > 0 ? extractFirstValidUrl(post.videos[0]) || post.videos[0] : null);
            const hasSharedLinks = Boolean(firstPostUrl);
            const isLongContent = post.content.length > 360 && !hasSharedLinks;
            const isExpanded = expandedPostIds.has(post.id);
            const displayedText =
              isLongContent && !isExpanded
                ? `${post.content.slice(0, 360)}...`
                : post.content;

            return (
              <article
                key={post.id}
                id={`post-${post.id}`}
                className={`bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border shadow-xs transition-all hover:shadow-sm ${
                  highlightedPostId === post.id
                    ? 'border-blue-500 ring-2 ring-blue-500/30 dark:border-blue-400'
                    : 'border-slate-200/80 dark:border-slate-800'
                }`}
              >
                {highlightedPostId === post.id && (
                  <div className="mb-3 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200/70 dark:border-blue-800/70 flex items-center justify-between text-xs text-blue-700 dark:text-blue-300 font-bold">
                    <span className="flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5" />
                      <span>Viewing shared post via direct link</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setHighlightedPostId(null)}
                      className="text-[11px] underline hover:no-underline cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Post Header */}
                <div className="flex items-center justify-between mb-3.5">
                  <div
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => onViewProfile && onViewProfile(post.userId)}
                  >
                    <img
                      src={post.avatarUrl}
                      alt={post.fullName}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800 group-hover:ring-blue-500 transition-all"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {post.fullName}
                        </span>
                        <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        {isProfilePhotoPost(post) && (
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                            {post.link_metadata?.isFirstUpload
                              ? 'added a profile picture.'
                              : 'updated their profile picture.'}
                          </span>
                        )}
                        {(post.postType === 'blood_request' || post.link_metadata?.postType === 'blood_request') && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping shrink-0" />
                            Emergency Blood Request
                          </span>
                        )}
                        {post.isEdited && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                            (edited)
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
                        <span>Batch {post.batchYear}</span>
                        <span>·</span>
                        <span
                          className="hover:underline cursor-pointer inline-flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                          title={getFullFacebookTimestamp(post.createdAt || (post as any).timestamp)}
                        >
                          {formatFacebookTime(post.createdAt || (post as any).timestamp)}
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">·</span>
                          <Globe className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0 inline-block" aria-hidden="true" />
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Post Options Dropdown Menu (Three-dot) */}
                  <div className="relative post-menu-container">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuPostId(activeMenuPostId === post.id ? null : post.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      aria-label="Post Options"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {/* Dropdown Menu Popup */}
                    {activeMenuPostId === post.id && (
                      <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-20 animate-fade-in text-xs font-semibold">
                        {isOwner ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStartEdit(post)}
                              className="w-full px-3.5 py-2 text-left flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-blue-500" />
                              <span>Edit Post</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuPostId(null);
                                handleSharePost(post.id);
                              }}
                              className="w-full px-3.5 py-2 text-left flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70 transition-colors cursor-pointer"
                            >
                              <Share2 className="w-3.5 h-3.5 text-blue-500" />
                              <span>Copy Post Link</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuPostId(null);
                                setPostToDelete(post);
                              }}
                              className="w-full px-3.5 py-2 text-left flex items-center gap-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Post</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuPostId(null);
                                setPostToReport(post);
                              }}
                              className="w-full px-3.5 py-2 text-left flex items-center gap-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                            >
                              <Flag className="w-3.5 h-3.5" />
                              <span>Report Post</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuPostId(null);
                                handleToggleSave(post);
                              }}
                              className="w-full px-3.5 py-2 text-left flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70 transition-colors cursor-pointer"
                            >
                              <Bookmark className="w-3.5 h-3.5 text-blue-500" />
                              <span>{isPostSaved(post.id) || post.isSaved ? 'Remove from Saved' : 'Save for Offline'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuPostId(null);
                                handleSharePost(post.id);
                              }}
                              className="w-full px-3.5 py-2 text-left flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70 transition-colors cursor-pointer"
                            >
                              <Share2 className="w-3.5 h-3.5 text-blue-500" />
                              <span>Copy Post Link</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Post Body with Clickable Full-Visibility Links */}
                {post.content && (
                  <div className="mb-3.5">
                    <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line break-words">
                      {renderTextWithClickableLinks(displayedText)}
                    </p>
                    {isLongContent && (
                      <button
                        type="button"
                        onClick={() => toggleExpandPost(post.id)}
                        className="mt-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        {isExpanded ? 'Show less' : 'Read more'}
                      </button>
                    )}
                  </div>
                )}

                {/* Emergency Blood Request Dedicated Card */}
                {(post.postType === 'blood_request' || post.link_metadata?.postType === 'blood_request') && (
                  <div className="mb-4 rounded-2xl bg-gradient-to-br from-rose-50 via-red-50/60 to-rose-100/50 dark:from-rose-950/40 dark:via-slate-900/90 dark:to-slate-900 border-2 border-rose-200 dark:border-rose-900/60 p-4 sm:p-5 shadow-xs overflow-hidden relative">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-rose-200/70 dark:border-rose-900/50">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex flex-col items-center justify-center font-black shadow-md shadow-rose-600/30 shrink-0 ring-4 ring-rose-200 dark:ring-rose-950">
                          <Droplet className="w-3.5 h-3.5 fill-current -mb-0.5" />
                          <span className="text-base tracking-tight">{post.link_metadata?.bloodGroup || 'A+'}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-400">
                              Emergency Blood Request
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-600 text-white shadow-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                              {post.link_metadata?.emergencyLevel || 'Urgent'}
                            </span>
                          </div>
                          <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                            {post.link_metadata?.unitsRequired || 1} Unit(s) Needed · {post.link_metadata?.patientRelation || 'Notredamian Patient'}
                          </h4>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (onNavigate) {
                            onNavigate('emergency');
                          } else {
                            window.dispatchEvent(new CustomEvent('ndc_navigate_route', { detail: { route: 'emergency' } }));
                          }
                        }}
                        className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/25 hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Heart className="w-4 h-4 fill-current" />
                        <span>I Can Donate / Respond</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-300 mt-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                        <span className="truncate font-medium">
                          {post.link_metadata?.hospitalName || 'Hospital'}{post.link_metadata?.hospitalArea ? ` (${post.link_metadata.hospitalArea})` : ''}
                        </span>
                      </div>
                      {post.link_metadata?.contactMethod && (
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-rose-500 shrink-0" />
                          <span className="truncate font-medium">Contact: {post.link_metadata.contactMethod}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Facebook-style Profile Picture Showcase OR Regular Image Grid */}
                {post.images && post.images.length > 0 && (
                  isProfilePhotoPost(post) ? (
                    <div className="mb-4 rounded-2xl sm:rounded-3xl p-6 sm:p-8 bg-gradient-to-b from-slate-100/90 to-slate-50/60 dark:from-slate-800/60 dark:to-slate-900/40 border border-slate-200/70 dark:border-slate-800 flex flex-col items-center justify-center relative overflow-hidden group">
                      <div
                        className="relative cursor-pointer"
                        onClick={() => handleOpenLightbox(post, 0)}
                      >
                        <div className="w-48 h-48 sm:w-60 sm:h-60 rounded-full overflow-hidden ring-4 ring-white dark:ring-slate-800 shadow-2xl relative transition-transform duration-300 group-hover:scale-105 bg-white dark:bg-slate-800">
                          <img
                            src={post.images[0]}
                            alt={post.fullName}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <span className="p-2 rounded-full bg-black/60 backdrop-blur-xs">
                              <ZoomIn className="w-5 h-5 text-white" />
                            </span>
                          </div>
                        </div>
                        <div
                          className="absolute bottom-1.5 right-1.5 p-2 rounded-full bg-blue-600 text-white ring-3 ring-white dark:ring-slate-800 shadow-md flex items-center justify-center"
                          title="Profile Picture"
                        >
                          <Camera className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="mt-3.5 text-center">
                        <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-center gap-1">
                          <Camera className="w-3 h-3" /> Profile Picture
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`grid gap-2 mb-4 rounded-2xl overflow-hidden ${
                        post.images.length === 1
                          ? 'grid-cols-1'
                          : post.images.length === 2
                          ? 'grid-cols-2'
                          : post.images.length === 3
                          ? 'grid-cols-3'
                          : 'grid-cols-2 sm:grid-cols-3'
                      }`}
                    >
                      {post.images.map((imgUrl, idx) => (
                        <div
                          key={idx}
                          className="relative group cursor-pointer overflow-hidden rounded-xl bg-slate-950"
                          onClick={() => handleOpenLightbox(post, idx)}
                        >
                          <img
                            src={imgUrl}
                            alt={`Attached media ${idx + 1}`}
                            className={`w-full object-cover group-hover:scale-103 transition-transform duration-300 ${
                              post.images.length === 1 ? 'max-h-[440px]' : 'h-48 sm:h-56'
                            }`}
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white">
                            <span className="p-2 rounded-full bg-black/60 backdrop-blur-xs">
                              <ZoomIn className="w-5 h-5 text-white" />
                            </span>
                            <span className="text-xs font-bold hidden sm:inline">View full screen</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* Post Uploaded / Attached Videos */}
                {post.videos && post.videos.length > 0 && (
                  <div className="space-y-3 mb-4">
                    {post.videos.map((vidUrl, vidIdx) => {
                      const isDirect =
                        vidUrl.startsWith('data:video/') ||
                        vidUrl.startsWith('blob:') ||
                        /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(vidUrl);
                      if (isDirect) {
                        return (
                          <FeedVideoPlayer
                            key={vidIdx}
                            src={vidUrl}
                            autoPlayOnScroll={autoPlayOnScroll}
                            controls={true}
                            className="w-full"
                          />
                        );
                      }
                      return (
                        <LinkPreview
                          key={vidIdx}
                          url={vidUrl}
                          autoPlayOnScroll={autoPlayOnScroll}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Universal Link Preview: link_metadata or detected URL (only if not already shown in post.videos) */}
                {(() => {
                  const hasVideos = Boolean(post.videos && post.videos.length > 0);
                  const extraUrl = post.linked_url || firstPostUrl;
                  const alreadyShownInVideos = hasVideos && Boolean(
                    extraUrl && post.videos?.some((v) => v === extraUrl || (v && extraUrl && (v.includes(extraUrl) || extraUrl.includes(v))))
                  );
                  if (alreadyShownInVideos) return null;
                  if (!post.link_metadata && !extraUrl) return null;
                  return (
                    <div className="mb-4">
                      <LinkPreview
                        url={post.linked_url || firstPostUrl || undefined}
                        data={post.link_metadata}
                        autoPlayOnScroll={autoPlayOnScroll}
                      />
                    </div>
                  );
                })()}

                {/* Stats Row */}
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 py-2 border-t border-b border-slate-100 dark:border-slate-800/80 mb-2">
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[9px]">
                      ♥
                    </span>
                    {post.likesCount} {post.likesCount === 1 ? 'like' : 'likes'}
                  </span>
                  <span>
                    {post.commentsCount} {post.commentsCount === 1 ? 'comment' : 'comments'}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1 sm:gap-2">
                  {/* Like Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleLike(post.id)}
                    title={post.likedByMe ? 'Unlike' : 'Like'}
                    aria-label={post.likedByMe ? 'Unlike' : 'Like'}
                    className={`group relative flex-1 min-w-0 flex items-center justify-center gap-1 sm:gap-2 py-2 px-2 sm:px-2 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                      post.likedByMe
                        ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Heart
                      className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 group-active:scale-125 ${
                        post.likedByMe ? 'fill-rose-500 text-rose-500' : ''
                      }`}
                    />
                    <span className="hidden sm:inline truncate">{post.likedByMe ? 'Liked' : 'Like'}</span>
                    {/* Touch / Hover popover text on mobile */}
                    <span className="sm:hidden pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 group-active:opacity-100 group-focus:opacity-100 transition-opacity duration-150 bg-slate-900/90 dark:bg-slate-800/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md whitespace-nowrap z-30">
                      {post.likedByMe ? 'Liked' : 'Like'}
                    </span>
                  </button>

                  {/* Comment Button */}
                  <button
                    type="button"
                    onClick={() =>
                      setActiveCommentPostId(
                        activeCommentPostId === post.id ? null : post.id
                      )
                    }
                    title="Comment"
                    aria-label="Comment"
                    className="group relative flex-1 min-w-0 flex items-center justify-center gap-1 sm:gap-2 py-2 px-2 sm:px-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer active:scale-95"
                  >
                    <MessageCircle className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110 group-active:scale-125" />
                    <span className="hidden sm:inline truncate">Comment</span>
                    {/* Touch / Hover popover text on mobile */}
                    <span className="sm:hidden pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 group-active:opacity-100 group-focus:opacity-100 transition-opacity duration-150 bg-slate-900/90 dark:bg-slate-800/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md whitespace-nowrap z-30">
                      Comment
                    </span>
                  </button>

                  {/* Save Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleSave(post)}
                    title={isPostSaved(post.id) || post.isSaved ? 'Saved to offline cache' : 'Save post for offline reading'}
                    aria-label={isPostSaved(post.id) || post.isSaved ? 'Saved' : 'Save'}
                    className={`group relative flex-1 min-w-0 flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-2 sm:px-2 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                      isPostSaved(post.id) || post.isSaved
                        ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {isPostSaved(post.id) || post.isSaved ? (
                      <BookmarkCheck className="w-4 h-4 shrink-0 fill-current text-blue-600 dark:text-blue-400 transition-transform group-hover:scale-110 group-active:scale-125" />
                    ) : (
                      <Bookmark className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110 group-active:scale-125" />
                    )}
                    <span className="hidden sm:inline truncate">{isPostSaved(post.id) || post.isSaved ? 'Saved' : 'Save'}</span>
                    {/* Touch / Hover popover text on mobile */}
                    <span className="sm:hidden pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 group-active:opacity-100 group-focus:opacity-100 transition-opacity duration-150 bg-slate-900/90 dark:bg-slate-800/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md whitespace-nowrap z-30">
                      {isPostSaved(post.id) || post.isSaved ? 'Saved' : 'Save'}
                    </span>
                  </button>

                  {/* Share Button */}
                  <button
                    type="button"
                    onClick={() => handleSharePost(post.id)}
                    title="Copy direct link to this post"
                    aria-label="Share Post"
                    className={`group relative flex-1 min-w-0 flex items-center justify-center gap-1 sm:gap-2 py-2 px-2 sm:px-2 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                      copiedPostId === post.id
                        ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {copiedPostId === post.id ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 transition-transform group-hover:scale-110 group-active:scale-125" />
                        <span className="hidden sm:inline truncate">Copied</span>
                        {/* Touch / Hover popover text on mobile */}
                        <span className="sm:hidden pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 group-active:opacity-100 group-focus:opacity-100 transition-opacity duration-150 bg-slate-900/90 dark:bg-slate-800/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md whitespace-nowrap z-30">
                          Copied
                        </span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110 group-active:scale-125" />
                        <span className="hidden sm:inline truncate">Share</span>
                        {/* Touch / Hover popover text on mobile */}
                        <span className="sm:hidden pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 group-active:opacity-100 group-focus:opacity-100 transition-opacity duration-150 bg-slate-900/90 dark:bg-slate-800/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md whitespace-nowrap z-30">
                          Share
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {/* Comments Thread */}
                <div className="mt-3.5 space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                  {post.comments.map((comment) => (
                    <div key={comment.id} className="space-y-2">
                      <div className="flex items-start gap-2.5">
                        <img
                          src={comment.avatarUrl}
                          alt={comment.fullName}
                          className="w-7 h-7 rounded-full object-cover mt-0.5"
                        />
                        <div className="flex-1">
                          <div className="bg-slate-100 dark:bg-slate-800/80 rounded-2xl px-3.5 py-2 inline-block max-w-full">
                            <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">
                              {comment.fullName}
                            </span>
                            <p className="text-xs text-slate-700 dark:text-slate-300 break-words mt-0.5">
                              {comment.content}
                            </p>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500 mt-1 pl-2">
                            <span
                              className="hover:underline cursor-pointer transition-colors hover:text-slate-600 dark:hover:text-slate-300"
                              title={getFullFacebookTimestamp(comment.createdAt)}
                            >
                              {formatFacebookTime(comment.createdAt)}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setActiveReplyId(
                                  activeReplyId === comment.id ? null : comment.id
                                )
                              }
                              className="font-bold hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                            >
                              Reply
                            </button>
                          </div>

                          {comment.replies && comment.replies.length > 0 && (
                            <div className="ml-5 mt-2 space-y-2 border-l-2 border-slate-200 dark:border-slate-700/80 pl-3">
                              {comment.replies.map((reply) => (
                                <div key={reply.id} className="flex items-start gap-2">
                                  <img
                                    src={reply.avatarUrl}
                                    alt={reply.fullName}
                                    className="w-6 h-6 rounded-full object-cover mt-0.5"
                                  />
                                  <div className="bg-slate-100 dark:bg-slate-800/80 rounded-xl px-3 py-1.5 inline-block">
                                    <span className="font-bold text-[11px] text-slate-900 dark:text-slate-100 block">
                                      {reply.fullName}
                                    </span>
                                    <p className="text-xs text-slate-700 dark:text-slate-300">
                                      {reply.content}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {activeReplyId === comment.id && (
                            <div className="flex items-center gap-2 mt-2 ml-5">
                              <input
                                type="text"
                                placeholder={`Reply to ${comment.fullName.split(' ')[0]}...`}
                                value={replyInputs[comment.id] || ''}
                                onChange={(e) =>
                                  setReplyInputs({
                                    ...replyInputs,
                                    [comment.id]: e.target.value,
                                  })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleAddReply(post.id, comment.id);
                                  }
                                }}
                                className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                              <button
                                type="button"
                                onClick={() => handleAddReply(post.id, comment.id)}
                                className="p-1.5 bg-blue-600 text-white rounded-full text-xs font-bold cursor-pointer"
                              >
                                <Send className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add Comment Input */}
                  <div className="flex items-center gap-2 pt-2">
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.fullName}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={commentInputs[post.id] || ''}
                        onChange={(e) =>
                          setCommentInputs({
                            ...commentInputs,
                            [post.id]: e.target.value,
                          })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddComment(post.id);
                        }}
                        placeholder="Write a comment..."
                        className="w-full pl-4 pr-10 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-full text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddComment(post.id)}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          });
        })()}
        {feedError && posts.length > 0 && (
          <div
            role="alert"
            className="bg-amber-50 dark:bg-amber-950/30 rounded-2xl p-4 border border-amber-200 dark:border-amber-900 text-center"
          >
            <p className="text-xs text-amber-800 dark:text-amber-200">{feedError}</p>
            <button
              type="button"
              onClick={() => void handleLoadMorePosts()}
              disabled={isLoadingMorePosts}
              className="mt-2 px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-100 text-xs font-bold disabled:opacity-50 cursor-pointer"
            >
              Try again
            </button>
          </div>
        )}
        {hasMorePosts && !feedError && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => void handleLoadMorePosts()}
              disabled={isLoadingMorePosts}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold hover:border-blue-400 disabled:opacity-60 cursor-pointer"
            >
              {isLoadingMorePosts && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              {isLoadingMorePosts ? 'Loading more posts...' : 'Load more posts'}
            </button>
          </div>
        )}
      </div>

      {/* EDIT POST MODAL */}
      {editingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  Edit Alumni Post
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingPost(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Category
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = editCategory === cat.label;
                  return (
                    <button
                      key={cat.label}
                      type="button"
                      onClick={() => setEditCategory(cat.label)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? cat.isUrgent
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-blue-600 text-white shadow-xs'
                          : cat.isUrgent
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Content
              </label>
              <textarea
                rows={4}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Update your post message..."
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Attached Media ({editImages.length} photos, {editVideos.length} videos)
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Photos</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => editVideoInputRef.current?.click()}
                    className="text-xs text-purple-600 dark:text-purple-400 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Video</span>
                  </button>
                </div>
              </div>

              <input
                type="file"
                ref={editFileInputRef}
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                onChange={handleEditImageUpload}
                className="hidden"
              />

              <input
                type="file"
                ref={editVideoInputRef}
                accept="video/mp4,video/webm,video/ogg,video/quicktime"
                multiple
                onChange={handleEditVideoUpload}
                className="hidden"
              />

              {editImages.length > 0 || editVideos.length > 0 ? (
                <div className="space-y-3">
                  {editImages.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {editImages.map((img, idx) => (
                        <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                          <img src={img} alt="Post media preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveEditImage(idx)}
                            className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-rose-600 text-white rounded-full transition-colors cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {editVideos.length > 0 && (
                    <div className="space-y-2">
                      {editVideos.map((vid, idx) => (
                        <div key={idx} className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-black">
                          <video src={vid} controls className="w-full max-h-40 object-contain" />
                          <button
                            type="button"
                            onClick={() => handleRemoveEditVideo(idx)}
                            className="absolute top-2 right-2 p-1 bg-black/75 hover:bg-rose-600 text-white rounded-full transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No photos or videos currently attached.</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingPost(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {postToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  Delete Post?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Are you sure you want to delete this post?
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
              This action cannot be undone. It will permanently remove this post and all associated comments from the Notre Dame alumni community feed.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPostToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Post</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPORT POST MODAL */}
      {postToReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  Report Post
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPostToReport(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Help maintain a high standard of professional etiquette and fraternal integrity in the Notre Dame Alumni Network.
            </p>

            <div className="space-y-2">
              {[
                'Inappropriate / Unprofessional',
                'Spam or Commercial Promotion',
                'Misleading or Fraudulent Information',
                'Harassment or Offensive Language',
                'Other Violation'
              ].map((reason) => (
                <label
                  key={reason}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                    reportReason === reason
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 text-blue-700 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="reportReason"
                    checked={reportReason === reason}
                    onChange={() => setReportReason(reason)}
                    className="accent-blue-600"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPostToReport(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitReport}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL-SCREEN LIGHTBOX MODAL FOR ATTACHED MEDIA */}
      <PostLightboxModal
        isOpen={lightboxState.isOpen}
        images={lightboxState.images}
        initialIndex={lightboxState.initialIndex}
        onClose={() => setLightboxState({ ...lightboxState, isOpen: false })}
        postAuthor={lightboxState.postAuthor}
        postCaption={lightboxState.postCaption}
      />
    </div>
  );
};
