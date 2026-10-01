import React, { useState, useEffect } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  Trash2,
  ExternalLink,
  MessageSquare,
  Heart,
  Share2,
  WifiOff,
  Sparkles,
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';
import { PostItem } from '../types';
import { getSavedPosts, toggleSavePost, setSavedPosts } from '../utils/offlineStorage';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { PostLightboxModal } from './PostLightboxModal';
import {
  extractUrlsFromText,
  renderTextWithClickableLinks,
  SharedEmbedCard
} from './SmartPostMediaAndEmbeds';

interface SavedPostsViewProps {
  onViewProfile?: (userId: number) => void;
  onNavigateToFeed?: () => void;
}

export const SavedPostsView: React.FC<SavedPostsViewProps> = ({
  onViewProfile,
  onNavigateToFeed,
}) => {
  const isOnline = useOnlineStatus();
  const [savedPosts, setSavedPostsState] = useState<PostItem[]>(() => getSavedPosts());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedSavedPostId, setCopiedSavedPostId] = useState<number | null>(null);

  // Lightbox modal state
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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleShareSavedPost = async (postId: number) => {
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

    setCopiedSavedPostId(postId);
    setTimeout(() => {
      setCopiedSavedPostId((prev) => (prev === postId ? null : prev));
    }, 2500);
    showToast('Direct post link copied to clipboard!');
  };

  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const handleRemoveSaved = (post: PostItem) => {
    toggleSavePost(post);
    setSavedPostsState(getSavedPosts());
    showToast('Post removed from saved offline cache.');
  };

  const handleClearAll = () => {
    setSavedPosts([]);
    setSavedPostsState([]);
    setConfirmClearAll(false);
    showToast('All saved posts cleared from offline cache.');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 px-4 py-2.5 rounded-2xl bg-slate-900 text-white shadow-xl text-xs font-bold border border-slate-700 animate-in fade-in">
          {toastMessage}
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold">
                <BookmarkCheck className="w-3.5 h-3.5" />
                <span>Offline Storage Active</span>
              </span>
              {!isOnline && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-bold">
                  <WifiOff className="w-3 h-3" />
                  <span>Offline Mode</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
              Saved Posts & Articles
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
              All bookmarked posts, case discussions, and reunion notices are cached locally in your browser service worker cache for offline reading anytime.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {onNavigateToFeed && (
              <button
                type="button"
                onClick={onNavigateToFeed}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Feed</span>
              </button>
            )}

            {savedPosts.length > 0 && (
              confirmClearAll ? (
                <div className="inline-flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Clear</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearAll(false)}
                    className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(true)}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold transition-colors cursor-pointer"
                  title="Clear all saved posts"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear All</span>
                </button>
              )
            )}
          </div>
        </div>

        {/* Offline Cache Notice */}
        <div className="mt-5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>
              <strong>{savedPosts.length}</strong> {savedPosts.length === 1 ? 'post' : 'posts'} stored in service worker offline cache
            </span>
          </div>
          <span className="text-[11px] text-slate-400">Cache Strategy: Stale-While-Revalidate</span>
        </div>
      </div>

      {/* Saved Posts List */}
      {savedPosts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-3xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center mb-4">
            <Bookmark className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
            No Saved Posts Yet
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
            Click the bookmark icon on any post in the alumni feed or discussions to save it for offline reading without an internet connection.
          </p>
          {onNavigateToFeed && (
            <button
              type="button"
              onClick={onNavigateToFeed}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all cursor-pointer"
            >
              <span>Explore Alumni Feed</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {savedPosts.map((post) => (
            <article
              key={post.id}
              className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4"
            >
              {/* Post Header */}
              <div className="flex items-start justify-between gap-3">
                <div
                  className="flex items-center gap-3 cursor-pointer group"
                  onClick={() => onViewProfile?.(post.userId)}
                >
                  <img
                    src={post.avatarUrl}
                    alt={post.fullName}
                    className="w-11 h-11 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 group-hover:scale-105 transition-transform"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {post.fullName}
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                        Batch {post.batchYear}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span>{post.createdAt}</span>
                      {post.category && (
                        <>
                          <span>•</span>
                          <span className="font-medium text-slate-600 dark:text-slate-300">
                            {post.category}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Remove from Saved Button */}
                <button
                  type="button"
                  onClick={() => handleRemoveSaved(post)}
                  title="Remove from saved offline cache"
                  className="p-2 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                >
                  <BookmarkCheck className="w-5 h-5 fill-current" />
                </button>
              </div>

              {/* Post Content */}
              <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed break-words">
                {renderTextWithClickableLinks(post.content)}
              </p>

              {/* Attached Images */}
              {post.images && post.images.length > 0 && (
                <div
                  className={`grid gap-2 rounded-2xl overflow-hidden ${
                    post.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                  }`}
                >
                  {post.images.map((img, idx) => (
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
                      className="cursor-pointer group relative aspect-video bg-slate-100 dark:bg-slate-800 overflow-hidden"
                    >
                      <img
                        src={img}
                        alt="Post media attachment"
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Attached Videos & Shared Links (YouTube, Facebook, Instagram, LinkedIn, etc.) */}
              {(() => {
                const allMediaAndLinks = Array.from(
                  new Set([
                    ...(post.videos || []),
                    ...extractUrlsFromText(post.content),
                  ])
                );
                if (allMediaAndLinks.length === 0) return null;
                return (
                  <div className="space-y-3">
                    {allMediaAndLinks.map((mediaUrl, idx) => (
                      <SharedEmbedCard
                        key={`${post.id}-saved-media-${idx}`}
                        url={mediaUrl}
                        autoPlayOnScroll={true}
                      />
                    ))}
                  </div>
                );
              })()}

              {/* Post Footer Counts & Share */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                    <span>{post.likesCount} Likes</span>
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                    <span>{post.comments?.length || post.commentsCount} Comments</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleShareSavedPost(post.id)}
                    title="Copy direct link to this post"
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-bold transition-colors cursor-pointer ${
                      copiedSavedPostId === post.id
                        ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {copiedSavedPostId === post.id ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Share</span>
                      </>
                    )}
                  </button>
                </div>

                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Available Offline</span>
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxState.isOpen && (
        <PostLightboxModal
          isOpen={lightboxState.isOpen}
          images={lightboxState.images}
          initialIndex={lightboxState.initialIndex}
          postAuthor={lightboxState.postAuthor}
          postCaption={lightboxState.postCaption}
          onClose={() => setLightboxState((prev) => ({ ...prev, isOpen: false }))}
        />
      )}
    </div>
  );
};
