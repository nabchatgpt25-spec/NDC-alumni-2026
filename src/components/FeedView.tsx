import React, { useState, useRef, useEffect } from 'react';
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
  Link2
} from 'lucide-react';
import { PostItem, PostComment } from '../types';
import { useAuth } from '../context/AuthContext';
import { playSound } from '../utils/audio';
import { PostLightboxModal } from './PostLightboxModal';
import {
  extractUrlsFromText,
  normalizeUrlInput,
  renderTextWithClickableLinks,
  SharedEmbedCard
} from './SmartPostMediaAndEmbeds';
import {
  isPostSaved,
  toggleSavePost,
  INITIAL_OFFLINE_SAVED_POSTS
} from '../utils/offlineStorage';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { VerificationStatusBadge } from './verification/VerificationStatusBadge';
import {
  loadVouchRequests,
  simulateDemoVouchForUser,
  normalizeToBatchNumber
} from '../utils/verificationService';

interface FeedViewProps {
  onViewProfile?: (userId: number) => void;
  onOpenVerificationCenter?: (initialTab?: 'status' | 'vouch_others') => void;
}

type PostCategory = 'General Update' | 'Tech & Innovation' | 'Professional Insights' | 'Reunion' | 'Achievement';

const CATEGORIES: { label: PostCategory; icon: typeof MessageSquare; color: string; bg: string }[] = [
  { label: 'General Update', icon: MessageSquare, color: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-slate-800' },
  { label: 'Tech & Innovation', icon: Sparkles, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40' },
  { label: 'Professional Insights', icon: Briefcase, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
  { label: 'Reunion', icon: Users, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/40' },
  { label: 'Achievement', icon: Award, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40' },
];

export const FeedView: React.FC<FeedViewProps> = ({ onViewProfile, onOpenVerificationCenter }) => {
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

  const [posts, setPosts] = useState<PostItem[]>(() => {
    if (typeof window === 'undefined') return INITIAL_OFFLINE_SAVED_POSTS;
    try {
      const raw = localStorage.getItem('ndc_alumni_posts');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load posts', e);
    }
    return INITIAL_OFFLINE_SAVED_POSTS;
  });

  // Sync posts to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('ndc_alumni_posts', JSON.stringify(posts));
      } catch (e) {
        console.warn('Failed to save posts', e);
      }
    }
  }, [posts]);

  // Handle saving / bookmarking a post to offline cache
  const handleToggleSave = (post: PostItem) => {
    const isNowSaved = toggleSavePost(post);
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
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [attachedVideos, setAttachedVideos] = useState<string[]>([]);
  const [showVideoUrlInput, setShowVideoUrlInput] = useState(false);
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const composerTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeFilterCategory, setActiveFilterCategory] = useState<string>('All');
  const [autoPlayOnScroll, setAutoPlayOnScroll] = useState<boolean>(true);

  // Facebook-style "New Post" Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [postAudience, setPostAudience] = useState<'Public' | 'NDC Family' | 'Batch Only'>('Public');
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
      if (['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
        if (file.size > 10 * 1024 * 1024) {
          showToast('Each photo must be smaller than 10 MB.');
          return;
        }
        addedPhotos += 1;
        const reader = new FileReader();
        reader.onload = (uploadEvent) => {
          const result = uploadEvent.target?.result as string;
          if (result) {
            setAttachedImages((prev) => [...prev, result]);
          }
        };
        reader.readAsDataURL(file);
      } else if (
        file.type.startsWith('video/') ||
        ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'].includes(file.type)
      ) {
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

  // Handle pasting images directly from clipboard into textarea
  const handlePasteClipboard = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
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
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        showToast('Only JPG, PNG, and WEBP images are supported.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        if (result) {
          setEditImages((prev) => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
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
  const handleCreatePost = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
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

    const finalContent = metaPrefix
      ? `${metaPrefix}\n\n${postContent.trim()}`
      : postContent.trim();

    const newPost: PostItem = {
      id: Date.now(),
      userId: currentUser.userId,
      fullName: currentUser.fullName,
      avatarUrl: currentUser.avatarUrl,
      batchYear: currentUser.batchYear,
      content: finalContent,
      images: [...attachedImages],
      videos: finalVideos,
      category: selectedCategory,
      likesCount: 0,
      commentsCount: 0,
      createdAt: 'Just now',
      likedByMe: false,
      comments: [],
    };

    setPosts([newPost, ...posts]);
    setPostContent('');
    setAttachedImages([]);
    setAttachedVideos([]);
    setVideoUrlInput('');
    setShowVideoUrlInput(false);
    setSelectedCategory('General Update');
    setPostBackground('default');
    setPostFeeling(null);
    setPostLocation(null);
    setShowPhotoDropzone(false);
    setIsCreateModalOpen(false);
    playSound('post');
    showToast('Post published successfully to the alumni feed!');
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
  const handleConfirmDelete = () => {
    if (!postToDelete) return;
    setPosts((prev) => prev.filter((p) => p.id !== postToDelete.id));
    setPostToDelete(null);
    showToast('Post has been deleted from your feed.');
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

  // Refresh Feed
  const handleRefreshFeed = () => {
    setHasNewPosts(false);
    const simulatedPost: PostItem = {
      id: Date.now(),
      userId: 105,
      fullName: 'Tahmidur Rahman',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      batchYear: 58,
      content: 'Heartfelt congratulations to Batch 68 Notredamians completing their university graduations today! Notre Dame continues to shine across all sectors in Bangladesh and beyond.',
      images: [
        'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80',
      ],
      category: 'Achievement',
      likesCount: 14,
      commentsCount: 2,
      createdAt: 'Just now',
      likedByMe: false,
      comments: [],
    };
    setPosts([simulatedPost, ...posts]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Feed refreshed with new posts!');
  };

  // Add Comment
  const handleAddComment = (postId: number) => {
    const text = (commentInputs[postId] || '').trim();
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

    const newReply: PostComment = {
      id: Date.now(),
      postId,
      userId: currentUser.userId,
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-5 z-50 flex items-center gap-2.5 px-4 py-3 bg-slate-900/95 text-white dark:bg-white/95 dark:text-slate-900 rounded-2xl shadow-xl border border-slate-700/50 dark:border-slate-200 text-xs font-semibold animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
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

      {/* Active Verification & Peer Vouch Banner */}
      <div
        className={`rounded-2xl p-4 border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          (currentUser.verificationStatus || 'verified') === 'verified'
            ? 'bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-blue-50/80 dark:from-emerald-950/30 dark:via-slate-900 dark:to-blue-950/30 border-emerald-200/80 dark:border-emerald-800/60'
            : 'bg-gradient-to-r from-amber-50/95 via-orange-50/80 to-amber-50/90 dark:from-amber-950/35 dark:via-slate-900 dark:to-orange-950/30 border-amber-300/80 dark:border-amber-800/60'
        }`}
      >
        <div className="flex items-start sm:items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              (currentUser.verificationStatus || 'verified') === 'verified'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                : 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
            }`}
          >
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                {(currentUser.verificationStatus || 'verified') === 'verified'
                  ? 'Notredamian Verification Active'
                  : `Verification Pending (${currentUser.vouchesCount || 0}/2 Peer Vouches)`}
              </span>
              <VerificationStatusBadge
                status={currentUser.verificationStatus || 'verified'}
                vouchesCount={currentUser.vouchesCount ?? 2}
                size="sm"
                onClick={() => onOpenVerificationCenter && onOpenVerificationCenter('status')}
              />
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
              {(currentUser.verificationStatus || 'verified') === 'verified'
                ? `${pendingVouchesCount} Notredamian classmate${pendingVouchesCount === 1 ? ' is' : 's are'} awaiting peer verification. Vouch for your batchmates to keep the directory authentic.`
                : 'Complete your verification via 2 batchmate vouches or upload your NDC ID / Admit Card for instant verification.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {(currentUser.verificationStatus || 'verified') !== 'verified' && (
            <button
              type="button"
              onClick={() => {
                const updated = simulateDemoVouchForUser(currentUser);
                updateProfile(updated);
                playSound('post');
                showToast(
                  updated.verificationStatus === 'verified'
                    ? '2/2 Vouches received! Your Notredamian profile is now Verified!'
                    : `Batchmate vouch recorded (${updated.vouchesCount}/2)! One more vouch needed.`
                );
              }}
              className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              +1 Instant Vouch
            </button>
          )}
          <button
            type="button"
            onClick={() =>
              onOpenVerificationCenter &&
              onOpenVerificationCenter(
                (currentUser.verificationStatus || 'verified') === 'verified'
                  ? 'vouch_others'
                  : 'status'
              )
            }
            className={`px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5 ${
              (currentUser.verificationStatus || 'verified') === 'verified'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>
              {(currentUser.verificationStatus || 'verified') === 'verified'
                ? `Vouch for Classmates (${pendingVouchesCount})`
                : 'Open Verification Center'}
            </span>
          </button>
        </div>
      </div>

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
                onClick={() =>
                  setPostAudience((prev) =>
                    prev === 'Public' ? 'NDC Family' : prev === 'NDC Family' ? 'Batch Only' : 'Public'
                  )
                }
                title="Post Audience Settings"
                className="p-2 -mr-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>

            {/* 2. Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {/* Author Info + Facebook-style Action Pills Row */}
              <div className="flex items-start gap-3">
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.fullName}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-blue-500/20 shrink-0"
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
                </div>
              </div>

              {/* Category Quick Selection Pills */}
              <div className="pt-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                  Select Post Category
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = selectedCategory === cat.label;
                    return (
                      <button
                        key={cat.label}
                        type="button"
                        onClick={() => setSelectedCategory(cat.label)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs'
                            : `${cat.bg} ${cat.color} hover:opacity-85`
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
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
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      Check in at a location
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowLocationPicker(false)}
                      className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Notre Dame College, Motijheel',
                      'Dhaka Medical College (DMC)',
                      'BUET Campus, Dhaka',
                      'Dhaka University',
                      'Silicon Valley Alumni Chapter',
                      'London UK Notredamians',
                    ].map((loc) => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => {
                          setPostLocation(postLocation === loc ? null : loc);
                          setShowLocationPicker(false);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                          postLocation === loc
                            ? 'bg-rose-600 text-white'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        📍 {loc}
                      </button>
                    ))}
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

                {/* Live Detected Shared Link Preview (YouTube, Facebook, Instagram, LinkedIn, etc.) */}
                {(() => {
                  const detectedTextUrls = extractUrlsFromText(postContent).filter(
                    (u) => !attachedVideos.includes(u)
                  );
                  if (detectedTextUrls.length === 0) return null;
                  return (
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/70 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                          <Link2 className="w-4 h-4 text-blue-500" />
                          <span>Shared Link Preview ({detectedTextUrls.length})</span>
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          Full Visibility Active
                        </span>
                      </div>
                      <div className="space-y-2.5">
                        {detectedTextUrls.map((detectedUrl, idx) => (
                          <SharedEmbedCard
                            key={`${detectedUrl}-${idx}`}
                            url={detectedUrl}
                            autoPlayOnScroll={false}
                          />
                        ))}
                      </div>
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
                      {attachedVideos.map((vidUrl, idx) => (
                        <div key={idx} className="relative">
                          <SharedEmbedCard url={vidUrl} autoPlayOnScroll={false} />
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachedVideo(idx)}
                            className="absolute top-2.5 right-2.5 p-1.5 bg-black/80 hover:bg-rose-600 text-white rounded-full transition-colors cursor-pointer z-20"
                            title="Remove attached video or link"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
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
                onClick={() =>
                  setPostAudience((prev) =>
                    prev === 'Public' ? 'NDC Family' : prev === 'NDC Family' ? 'Batch Only' : 'Public'
                  )
                }
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-100 hover:bg-slate-200/70 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5 text-blue-500" />
                <span>{postAudience}</span>
                <span className="text-slate-400">·</span>
                <span className="text-blue-600 dark:text-blue-400">{selectedCategory}</span>
              </button>

              <button
                type="button"
                id="submit-post-btn"
                onClick={handleCreatePost}
                disabled={
                  !postContent.trim() &&
                  attachedImages.length === 0 &&
                  attachedVideos.length === 0 &&
                  !videoUrlInput.trim()
                }
                className="inline-flex items-center justify-center gap-2 px-7 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer"
              >
                <span>Post</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Filter Bar + Scroll Auto-Play Video Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {['All', ...CATEGORIES.map((c) => c.label)].map((catLabel) => {
            const active = activeFilterCategory === catLabel;
            return (
              <button
                key={catLabel}
                type="button"
                onClick={() => setActiveFilterCategory(catLabel)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:border-blue-400'
                }`}
              >
                {catLabel}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setAutoPlayOnScroll((prev) => !prev)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer shrink-0 ${
            autoPlayOnScroll
              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
              : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800'
          }`}
          title="Automatically play videos when scrolled into view and pause when scrolled away"
        >
          <Video className="w-3.5 h-3.5" />
          <span>Auto-Video on Scroll: {autoPlayOnScroll ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* Posts Stream */}
      <div className="space-y-5">
        {(() => {
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
                  No posts have been published yet. Share a professional milestone, career update, or reunion announcement using the box above!
                </p>
              </div>
            );
          }

          return displayedPosts.map((post) => {
            const isOwner = post.userId === currentUser.userId;
            const extractedUrls = extractUrlsFromText(post.content);
            const allSharedMediaAndLinks = Array.from(
              new Set([...(post.videos || []), ...extractedUrls])
            );
            const hasSharedLinks = extractedUrls.length > 0;
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
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {post.fullName}
                        </span>
                        <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        {post.isEdited && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                            (edited)
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
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

                {/* Post Images Grid with Full-screen Lightbox trigger */}
                {post.images && post.images.length > 0 && (
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
                )}

                {/* Post Videos & Shared Social/Web Links (YouTube, Facebook, Instagram, LinkedIn, Direct Videos, etc.) */}
                {allSharedMediaAndLinks.length > 0 && (
                  <div className="space-y-3.5 mb-4">
                    {allSharedMediaAndLinks.map((mediaUrl, idx) => (
                      <SharedEmbedCard
                        key={`${post.id}-media-${idx}`}
                        url={mediaUrl}
                        autoPlayOnScroll={autoPlayOnScroll}
                      />
                    ))}
                  </div>
                )}

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
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleLike(post.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      post.likedByMe
                        ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Heart
                      className={`w-4 h-4 ${post.likedByMe ? 'fill-rose-500 text-rose-500' : ''}`}
                    />
                    <span>{post.likedByMe ? 'Liked' : 'Like'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setActiveCommentPostId(
                        activeCommentPostId === post.id ? null : post.id
                      )
                    }
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Comment</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleSave(post)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      isPostSaved(post.id) || post.isSaved
                        ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title={isPostSaved(post.id) || post.isSaved ? 'Saved to offline cache' : 'Save post for offline reading'}
                  >
                    {isPostSaved(post.id) || post.isSaved ? (
                      <BookmarkCheck className="w-4 h-4 fill-current text-blue-600 dark:text-blue-400" />
                    ) : (
                      <Bookmark className="w-4 h-4" />
                    )}
                    <span>{isPostSaved(post.id) || post.isSaved ? 'Saved' : 'Save'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSharePost(post.id)}
                    title="Copy direct link to this post"
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      copiedPostId === post.id
                        ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {copiedPostId === post.id ? (
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
                            <span>{comment.createdAt}</span>
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
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.label}
                    type="button"
                    onClick={() => setEditCategory(cat.label)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                      editCategory === cat.label
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
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
