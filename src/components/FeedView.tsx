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
  GraduationCap,
  Award,
  Users,
  MessageSquare,
  ZoomIn,
  Bookmark,
  BookmarkCheck,
  WifiOff
} from 'lucide-react';
import { PostItem, PostComment } from '../types';
import { INITIAL_POSTS } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { playSound } from '../utils/audio';
import { PostLightboxModal } from './PostLightboxModal';
import {
  isPostSaved,
  toggleSavePost,
  getSavedPosts,
  INITIAL_OFFLINE_SAVED_POSTS
} from '../utils/offlineStorage';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface FeedViewProps {
  onViewProfile?: (userId: number) => void;
}

type PostCategory = 'General Update' | 'Tech & Innovation' | 'Professional Insights' | 'Reunion' | 'Achievement';

const CATEGORIES: { label: PostCategory; icon: typeof MessageSquare; color: string; bg: string }[] = [
  { label: 'General Update', icon: MessageSquare, color: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-slate-800' },
  { label: 'Tech & Innovation', icon: Sparkles, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40' },
  { label: 'Professional Insights', icon: Briefcase, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
  { label: 'Reunion', icon: Users, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/40' },
  { label: 'Achievement', icon: Award, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40' },
];

export const FeedView: React.FC<FeedViewProps> = ({ onViewProfile }) => {
  const isOnline = useOnlineStatus();
  const { currentUser } = useAuth();
  const [feedTab, setFeedTab] = useState<'all' | 'saved'>('all');
  const [savedCount, setSavedCount] = useState(() => getSavedPosts().length);

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
    setSavedCount(getSavedPosts().length);
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Post Editing state
  const [editingPost, setEditingPost] = useState<PostItem | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editCategory, setEditCategory] = useState<PostCategory>('General Update');
  const editFileInputRef = useRef<HTMLInputElement>(null);

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

  // Handle image upload from file picker
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    (Array.from(files) as File[]).forEach((file: File) => {
      // Validate file type
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        showToast('Only JPG, PNG, and WEBP images are supported.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        if (result) {
          setAttachedImages((prev) => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset file input value
    e.target.value = '';
  };

  // Remove attached image before posting
  const handleRemoveAttachedImage = (indexToRemove: number) => {
    setAttachedImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
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
  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim() && attachedImages.length === 0) return;

    const newPost: PostItem = {
      id: Date.now(),
      userId: currentUser.userId,
      fullName: currentUser.fullName,
      avatarUrl: currentUser.avatarUrl,
      batchYear: currentUser.batchYear,
      content: postContent.trim(),
      images: [...attachedImages],
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
    setSelectedCategory('General Update');
    playSound('post');
    showToast('Post published successfully to the alumni feed!');
  };

  // Open Edit Post
  const handleStartEdit = (post: PostItem) => {
    setActiveMenuPostId(null);
    setEditingPost(post);
    setEditContent(post.content);
    setEditImages([...(post.images || [])]);
    setEditCategory((post.category as PostCategory) || 'General Update');
  };

  // Save Post Changes
  const handleSaveEdit = () => {
    if (!editingPost) return;
    if (!editContent.trim() && editImages.length === 0) {
      showToast('Post content or at least one image is required.');
      return;
    }

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === editingPost.id) {
          return {
            ...p,
            content: editContent.trim(),
            images: [...editImages],
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
    // Add simulated community update
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
              <strong>Offline Mode Active:</strong> You are browsing cached feed posts. You can view all your saved posts and cached directory even without internet.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setFeedTab('saved')}
            className="px-3 py-1 rounded-xl bg-amber-500 text-slate-900 font-bold hover:bg-amber-400 transition-colors shrink-0 cursor-pointer"
          >
            View Saved ({savedCount})
          </button>
        </div>
      )}

      {/* Feed Tabs Switcher */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setFeedTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              feedTab === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>All Posts</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${feedTab === 'all' ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-800'}`}>
              {posts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFeedTab('saved')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              feedTab === 'saved'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BookmarkCheck className="w-3.5 h-3.5" />
            <span>Saved Posts (Offline Cached)</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${feedTab === 'saved' ? 'bg-white/20' : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'}`}>
              {savedCount}
            </span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>Offline Ready</span>
        </div>
      </div>

      {/* Create Post Card (Visible only when in All tab) */}
      {feedTab === 'all' && (
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-start gap-3.5">
          <img
            src={currentUser.avatarUrl}
            alt={currentUser.fullName}
            className="w-11 h-11 rounded-full object-cover ring-2 ring-blue-500/20"
          />
          <div className="flex-1">
            <textarea
              rows={3}
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder={`Share an update, professional insight, or memory, ${currentUser.fullName.split(' ')[0]}...`}
              className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/70 rounded-2xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all"
            />

            {/* Category Selector Pills */}
            <div className="mt-3">
              <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Post Category
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory === cat.label;
                  return (
                    <button
                      key={cat.label}
                      type="button"
                      onClick={() => setSelectedCategory(cat.label)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/30 ring-2 ring-blue-500/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Attached Images Preview Row */}
            {attachedImages.length > 0 && (
              <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
                  <span>Attached Images ({attachedImages.length})</span>
                  <button
                    type="button"
                    onClick={() => setAttachedImages([])}
                    className="text-rose-500 hover:underline text-[11px]"
                  >
                    Remove all
                  </button>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {attachedImages.map((img, idx) => (
                    <div key={idx} className="relative group w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                      <img
                        src={img}
                        alt={`Attachment preview ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachedImage(idx)}
                        title="Remove image"
                        className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-rose-600 text-white rounded-full transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Add more button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Add another photo"
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-blue-500 transition-colors cursor-pointer"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="text-[10px] font-bold">Add</span>
                  </button>
                </div>
              </div>
            )}

            {/* Hidden File Input for Image Upload */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleImageUpload}
              className="hidden"
              id="feed-photo-upload-input"
            />

            {/* Action Buttons Row */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                {/* Photo/Media Button (Functional) */}
                <button
                  type="button"
                  id="feed-photo-media-btn"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800 transition-all cursor-pointer font-semibold"
                >
                  <ImageIcon className="w-4 h-4 text-emerald-500" />
                  <span>Photo/Media</span>
                </button>

                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px] font-semibold border border-blue-200/50 dark:border-blue-800/50">
                  <Sparkles className="w-3 h-3" /> NDC Verified
                </span>
              </div>

              <button
                type="button"
                id="submit-post-btn"
                onClick={handleCreatePost}
                disabled={!postContent.trim() && attachedImages.length === 0}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 text-white text-xs font-bold rounded-full shadow-md shadow-blue-600/20 transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Post</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Posts Stream */}
      <div className="space-y-5">
        {(() => {
          const displayedPosts =
            feedTab === 'saved'
              ? posts.filter((p) => isPostSaved(p.id) || p.isSaved)
              : posts;

          if (displayedPosts.length === 0) {
            return (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 border border-slate-200/80 dark:border-slate-800 text-center shadow-xs">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                  {feedTab === 'saved' ? <Bookmark className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  {feedTab === 'saved' ? 'No Saved Posts in Offline Cache' : 'Welcome to the Alumni Feed'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  {feedTab === 'saved'
                    ? 'Save posts by clicking the bookmark button on any post to view them here while offline.'
                    : 'No posts have been published yet. Share a professional milestone, career update, or reunion announcement using the box above!'}
                </p>
                {feedTab === 'saved' && (
                  <button
                    type="button"
                    onClick={() => setFeedTab('all')}
                    className="mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                  >
                    Browse All Posts
                  </button>
                )}
              </div>
            );
          }

          return displayedPosts.map((post) => {
            const isOwner = post.userId === currentUser.userId;
            const isLongContent = post.content.length > 300;
            const isExpanded = expandedPostIds.has(post.id);
            const displayedText = isLongContent && !isExpanded
              ? `${post.content.slice(0, 300)}...`
              : post.content;

            return (
              <article
                key={post.id}
                id={`post-${post.id}`}
                className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs transition-shadow hover:shadow-sm"
              >
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
                              navigator.clipboard?.writeText(window.location.href);
                              showToast('Post link copied to clipboard!');
                            }}
                            className="w-full px-3.5 py-2 text-left flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70 transition-colors cursor-pointer"
                          >
                            <Share2 className="w-3.5 h-3.5 text-blue-500" />
                            <span>Copy Link</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Post Body with Read More */}
              <div className="mb-3.5">
                <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                  {displayedText}
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
                      {/* Hover Overlay with Lightbox Icon */}
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
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href);
                    showToast('Post link copied to clipboard!');
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </button>
              </div>

              {/* Comments Thread (Expandable) */}
              <div className="mt-3.5 space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                {/* Existing Comments */}
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

                        {/* Nested Replies */}
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

                        {/* Reply Input Box */}
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

            {/* Post Category Picker in Edit */}
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

            {/* Content Textarea */}
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

            {/* Edit Attached Images */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Attached Media ({editImages.length})
                </label>
                <button
                  type="button"
                  onClick={() => editFileInputRef.current?.click()}
                  className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Photos</span>
                </button>
              </div>

              <input
                type="file"
                ref={editFileInputRef}
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleEditImageUpload}
                className="hidden"
              />

              {editImages.length > 0 ? (
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
              ) : (
                <p className="text-xs text-slate-400 italic">No images currently attached.</p>
              )}
            </div>

            {/* Modal Actions */}
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
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
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
