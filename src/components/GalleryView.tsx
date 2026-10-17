import React, { useState, useEffect, useMemo } from 'react';
import {
  Image as ImageIcon,
  Calendar,
  Heart,
  Plus,
  Search,
  Filter,
  FolderPlus,
  Upload,
  Sparkles,
  MapPin,
  Users,
  Camera,
  Layers,
  ArrowRight,
  Edit3,
  Trash2,
  ShieldCheck,
} from 'lucide-react';
import { GalleryAlbum, GalleryPhoto, PostComment } from '../types';
import { INITIAL_ALBUMS } from '../data/galleryData';
import { AlbumShowcaseView } from './gallery/AlbumShowcaseView';
import { CreateAlbumModal } from './gallery/CreateAlbumModal';
import { UploadPhotosModal } from './gallery/UploadPhotosModal';
import { PhotoLightbox } from './gallery/PhotoLightbox';
import { EditPhotoModal } from './gallery/EditPhotoModal';
import { EditAlbumModal } from './gallery/EditAlbumModal';
import {
  fetchGalleryAlbumsFromDb,
  createGalleryAlbumInDb,
  addPhotoToGalleryAlbumInDb,
  updateGalleryPhotoInDb,
  deleteGalleryPhotoInDb,
  updateGalleryAlbumInDb,
  deleteGalleryAlbumInDb,
} from '../services/supabaseService';
import { useAuth } from '../context/AuthContext';
import { notifyPhotoLike, notifyPhotoComment } from '../utils/notificationService';
import { playSound } from '../utils/audio';
import { syncNewAlbumToQuadFeed, syncUploadedPhotosToQuadFeed } from '../utils/galleryFeedSync';
import {
  isMainAdmin,
  canEditGalleryPhoto,
  canDeleteGalleryPhoto,
  canEditGalleryAlbum,
  canDeleteGalleryAlbum,
} from '../utils/galleryPermissions';

const STORAGE_KEY = 'ndc_alumni_gallery_albums';

export interface GalleryViewProps {
  initialAlbumId?: number | null;
  onNavigate?: (route: string) => void;
}

export const GalleryView: React.FC<GalleryViewProps> = ({ initialAlbumId, onNavigate }) => {
  const { currentUser } = useAuth();
  const isAdmin = isMainAdmin(currentUser);
  // Load albums from localStorage or fallback to INITIAL_ALBUMS
  const [albums, setAlbums] = useState<GalleryAlbum[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_ALBUMS;
  });

  // Save to localStorage on change and load from Supabase on mount
  useEffect(() => {
    let isMounted = true;
    fetchGalleryAlbumsFromDb()
      .then((dbAlbums) => {
        if (isMounted && dbAlbums && dbAlbums.length > 0) {
          setAlbums((prev) => {
            const map = new Map<string | number, GalleryAlbum>();
            dbAlbums.forEach((a) => map.set(a.id, a));
            prev.forEach((a) => {
              if (!map.has(a.id)) map.set(a.id, a);
            });
            return Array.from(map.values());
          });
        }
      })
      .catch((err) => {
        console.warn('GalleryView: Supabase albums fetch fallback:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(albums));
    } catch {
      // ignore
    }
  }, [albums]);

  // Selected Album for Showcase View
  const [selectedAlbumId, setSelectedAlbumId] = useState<number | null>(() => {
    if (initialAlbumId) return initialAlbumId;
    if (typeof window !== 'undefined') {
      const h = window.location.hash.replace('#', '');
      if (h.startsWith('album-') || h.startsWith('gallery-album-')) {
        const idNum = parseInt(h.replace(/^(album-|gallery-album-)/, ''), 10);
        if (!isNaN(idNum)) return idNum;
      }
    }
    return null;
  });

  // Category and Search filter
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isCreateAlbumOpen, setIsCreateAlbumOpen] = useState<boolean>(false);
  const [isUploadPhotosOpen, setIsUploadPhotosOpen] = useState<boolean>(false);
  const [targetAlbumIdForUpload, setTargetAlbumIdForUpload] = useState<number | undefined>(undefined);
  const [editingPhoto, setEditingPhoto] = useState<{ photo: GalleryPhoto; albumId: number } | null>(null);
  const [editingAlbum, setEditingAlbum] = useState<GalleryAlbum | null>(null);

  // Lightbox state
  const [lightboxState, setLightboxState] = useState<{
    isOpen: boolean;
    albumId: number | null;
    currentIndex: number;
  }>({
    isOpen: false,
    albumId: null,
    currentIndex: 0,
  });

  // Slideshow auto-play state
  const [isPlayingSlideshow, setIsPlayingSlideshow] = useState<boolean>(false);

  // Active album being showcased
  const activeAlbum = useMemo(() => {
    return albums.find((a) => a.id === selectedAlbumId) || null;
  }, [albums, selectedAlbumId]);

  // Active photo set for lightbox
  const activeLightboxPhotos = useMemo(() => {
    if (!lightboxState.albumId) return [];
    const alb = albums.find((a) => a.id === lightboxState.albumId);
    return alb ? alb.photos : [];
  }, [albums, lightboxState.albumId]);

  // Slideshow timer effect
  useEffect(() => {
    if (!isPlayingSlideshow || !lightboxState.isOpen || activeLightboxPhotos.length === 0) return;

    const timer = setInterval(() => {
      setLightboxState((prev) => {
        const nextIndex =
          prev.currentIndex < activeLightboxPhotos.length - 1 ? prev.currentIndex + 1 : 0;
        return { ...prev, currentIndex: nextIndex };
      });
    }, 3500);

    return () => clearInterval(timer);
  }, [isPlayingSlideshow, lightboxState.isOpen, activeLightboxPhotos.length]);

  // Deep link to photo or album from hash or custom event
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkHash = () => {
        const h = window.location.hash.replace('#', '');
        if (h.startsWith('album-') || h.startsWith('gallery-album-')) {
          const albumIdStr = h.replace(/^(album-|gallery-album-)/, '');
          const targetId = parseInt(albumIdStr, 10);
          if (!isNaN(targetId)) {
            setSelectedAlbumId(targetId);
          }
        } else if (h.startsWith('photo-')) {
          const photoId = h.replace('photo-', '');
          for (const alb of albums) {
            const idx = alb.photos.findIndex((p) => p.id === photoId);
            if (idx >= 0) {
              setSelectedAlbumId(alb.id);
              setLightboxState({
                isOpen: true,
                albumId: alb.id,
                currentIndex: idx,
              });
              break;
            }
          }
        }
      };

      checkHash();
      window.addEventListener('hashchange', checkHash);

      const handleOpenAlbum = (e: Event) => {
        const custom = e as CustomEvent<{ albumId: number }>;
        if (custom.detail?.albumId) {
          setSelectedAlbumId(custom.detail.albumId);
        }
      };
      window.addEventListener('ndc_open_gallery_album', handleOpenAlbum);

      return () => {
        window.removeEventListener('hashchange', checkHash);
        window.removeEventListener('ndc_open_gallery_album', handleOpenAlbum);
      };
    }
  }, [albums]);

  // Filtered albums for grid
  const filteredAlbums = useMemo(() => {
    return albums.filter((album) => {
      if (activeCategory !== 'all' && album.category !== activeCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = album.title.toLowerCase().includes(q);
        const matchDesc = album.description?.toLowerCase().includes(q) || false;
        const matchLoc = album.location?.toLowerCase().includes(q) || false;
        if (!matchTitle && !matchDesc && !matchLoc) {
          return false;
        }
      }
      return true;
    });
  }, [albums, activeCategory, searchQuery]);

  // Aggregate Metrics
  const totalPhotosCount = useMemo(() => {
    return albums.reduce((acc, a) => acc + (a.photos?.length || a.photosCount || 0), 0);
  }, [albums]);

  // Handlers
  const handleCreateAlbum = async (newAlbum: GalleryAlbum) => {
    // 1. Optimistic local update for instant user feedback
    setAlbums((prev) => [newAlbum, ...prev]);
    setSelectedAlbumId(newAlbum.id);

    try {
      // 2. Persist to Supabase Database
      const dbId = await createGalleryAlbumInDb({
        title: newAlbum.title,
        description: newAlbum.description,
        category: newAlbum.category,
        eventDateLabel: newAlbum.date,
        location: newAlbum.location,
        batchYear: newAlbum.batchYear,
        coverUrl: newAlbum.coverUrl,
        createdById: currentUser?.id,
      });

      const effectiveAlbum: GalleryAlbum = dbId
        ? { ...newAlbum, id: dbId }
        : newAlbum;

      if (dbId) {
        setAlbums((prev) =>
          prev.map((a) => (a.id === newAlbum.id ? effectiveAlbum : a))
        );
        setSelectedAlbumId(dbId);
      }

      // 3. Automatically create activity post in the Quad Feed with database ID
      if (currentUser) {
        syncNewAlbumToQuadFeed({
          album: effectiveAlbum,
          author: currentUser,
        }).catch((err) => {
          console.warn('Failed to sync new album to Quad Feed:', err);
        });
      }
    } catch (err) {
      console.warn('createGalleryAlbumInDb fallback:', err);
    }
  };

  const handleUploadPhotos = async (albumId: number, newPhotos: GalleryPhoto[]) => {
    // Optimistically update local view
    setAlbums((prev) =>
      prev.map((alb) => {
        if (alb.id === albumId) {
          const updatedPhotos = [...newPhotos, ...alb.photos];
          return {
            ...alb,
            photos: updatedPhotos,
            photosCount: updatedPhotos.length,
          };
        }
        return alb;
      })
    );

    // Persist each photo to Supabase gallery_photos
    const syncedPhotos: GalleryPhoto[] = [];
    for (const photo of newPhotos) {
      try {
        const photoId = await addPhotoToGalleryAlbumInDb({
          albumId,
          url: photo.url,
          caption: photo.caption,
          batchYear: photo.batchYear,
          tags: photo.tags,
          mediaType: photo.mediaType,
          fileSize: photo.fileSize,
          uploaderId: currentUser?.id,
        });
        syncedPhotos.push({
          ...photo,
          id: photoId || photo.id,
        });
      } catch (err) {
        console.warn('addPhotoToGalleryAlbumInDb error:', err);
        syncedPhotos.push(photo);
      }
    }

    const targetAlbum = albums.find((a) => a.id === albumId);

    // Automatically create activity post in the Quad Feed with CDN-synced photos
    if (targetAlbum && currentUser) {
      syncUploadedPhotosToQuadFeed({
        album: { ...targetAlbum, id: albumId },
        newPhotos: syncedPhotos.length > 0 ? syncedPhotos : newPhotos,
        author: currentUser,
      }).catch((err) => {
        console.warn('Failed to sync uploaded photos to Quad Feed:', err);
      });
    }
  };

  const handleToggleLike = (photoId: string) => {
    let targetPhoto: GalleryPhoto | undefined;
    let targetAlbum: GalleryAlbum | undefined;

    for (const alb of albums) {
      const p = alb.photos.find((x) => x.id === photoId);
      if (p) {
        targetPhoto = p;
        targetAlbum = alb;
        break;
      }
    }

    if (targetPhoto && !targetPhoto.likedByMe && currentUser) {
      notifyPhotoLike(targetPhoto, currentUser, targetAlbum?.title).catch(() => {});
    }

    setAlbums((prev) =>
      prev.map((alb) => ({
        ...alb,
        photos: alb.photos.map((p) => {
          if (p.id === photoId) {
            const liked = !p.likedByMe;
            return {
              ...p,
              likedByMe: liked,
              likesCount: (p.likesCount || 0) + (liked ? 1 : -1),
            };
          }
          return p;
        }),
      }))
    );
  };

  const handleAddPhotoComment = (photoId: string, text: string) => {
    let targetPhoto: GalleryPhoto | undefined;
    let targetAlbum: GalleryAlbum | undefined;

    for (const alb of albums) {
      const p = alb.photos.find((x) => x.id === photoId);
      if (p) {
        targetPhoto = p;
        targetAlbum = alb;
        break;
      }
    }

    if (targetPhoto && currentUser) {
      notifyPhotoComment(targetPhoto, text, currentUser, targetAlbum?.title).catch(() => {});
    }

    const newComment: PostComment = {
      id: Date.now(),
      postId: 0,
      userId: currentUser.id,
      fullName: currentUser.fullName,
      avatarUrl: currentUser.avatarUrl,
      content: text,
      likesCount: 0,
      likedByMe: false,
      createdAt: 'Just now',
    };

    setAlbums((prev) =>
      prev.map((alb) => ({
        ...alb,
        photos: alb.photos.map((p) => {
          if (p.id === photoId) {
            return {
              ...p,
              commentsCount: (p.commentsCount || p.comments?.length || 0) + 1,
              comments: [...(p.comments || []), newComment],
            };
          }
          return p;
        }),
      }))
    );
    playSound('comment');
  };

  const openUploadModalForAlbum = (albumId?: number) => {
    setTargetAlbumIdForUpload(albumId);
    setIsUploadPhotosOpen(true);
  };

  const startAlbumSlideshow = (albumId: number) => {
    setLightboxState({
      isOpen: true,
      albumId,
      currentIndex: 0,
    });
    setIsPlayingSlideshow(true);
  };

  const handleOpenEditPhoto = (photo: GalleryPhoto, albumId?: number) => {
    const targetAlbumId =
      albumId ||
      selectedAlbumId ||
      albums.find((a) => a.photos.some((p) => p.id === photo.id))?.id ||
      1;
    setEditingPhoto({ photo, albumId: targetAlbumId });
  };

  const handleOpenEditAlbum = (album: GalleryAlbum) => {
    setEditingAlbum(album);
  };

  const handleSavePhotoUpdates = async (
    albumId: number,
    photoId: string,
    updates: Partial<GalleryPhoto>
  ) => {
    setAlbums((prev) =>
      prev.map((alb) => {
        if (alb.id === albumId) {
          return {
            ...alb,
            photos: alb.photos.map((p) => (p.id === photoId ? { ...p, ...updates } : p)),
          };
        }
        return alb;
      })
    );

    try {
      await updateGalleryPhotoInDb(photoId, {
        caption: updates.caption,
        batchYear: updates.batchYear,
        tags: updates.tags,
        url: updates.url,
        mediaType: updates.mediaType,
      });
    } catch (err) {
      console.warn('updateGalleryPhotoInDb fallback:', err);
    }
  };

  const handleDeletePhoto = async (albumId: number, photoId: string) => {
    setAlbums((prev) =>
      prev.map((alb) => {
        if (alb.id === albumId) {
          const remaining = alb.photos.filter((p) => p.id !== photoId);
          return {
            ...alb,
            photos: remaining,
            photosCount: remaining.length,
          };
        }
        return alb;
      })
    );

    if (lightboxState.isOpen && lightboxState.albumId === albumId) {
      const alb = albums.find((a) => a.id === albumId);
      if (alb && alb.photos.length <= 1) {
        setLightboxState({ isOpen: false, albumId: null, currentIndex: 0 });
      } else {
        setLightboxState((prev) => ({
          ...prev,
          currentIndex: Math.max(0, prev.currentIndex - 1),
        }));
      }
    }

    try {
      await deleteGalleryPhotoInDb(photoId);
    } catch (err) {
      console.warn('deleteGalleryPhotoInDb fallback:', err);
    }
  };

  const handleSaveAlbumUpdates = async (
    albumId: number,
    updates: Partial<GalleryAlbum>
  ) => {
    setAlbums((prev) =>
      prev.map((alb) => (alb.id === albumId ? { ...alb, ...updates } : alb))
    );

    try {
      await updateGalleryAlbumInDb(albumId, {
        title: updates.title,
        description: updates.description,
        category: updates.category,
        eventDateLabel: updates.date,
        location: updates.location,
        batchYear: updates.batchYear,
        coverUrl: updates.coverUrl,
      });
    } catch (err) {
      console.warn('updateGalleryAlbumInDb fallback:', err);
    }
  };

  const handleDeleteAlbum = async (albumId: number) => {
    setAlbums((prev) => prev.filter((a) => a.id !== albumId));
    if (selectedAlbumId === albumId) {
      setSelectedAlbumId(null);
    }

    try {
      await deleteGalleryAlbumInDb(albumId);
    } catch (err) {
      console.warn('deleteGalleryAlbumInDb fallback:', err);
    }
  };

  // If viewing an album showcase:
  if (activeAlbum) {
    return (
      <>
        <AlbumShowcaseView
          album={activeAlbum}
          onBack={() => {
            setSelectedAlbumId(null);
            if (
              typeof window !== 'undefined' &&
              (window.location.hash.startsWith('#album-') ||
                window.location.hash.startsWith('#gallery-album-'))
            ) {
              window.location.hash = 'gallery';
            }
          }}
          onOpenLightbox={(index) => {
            setLightboxState({
              isOpen: true,
              albumId: activeAlbum.id,
              currentIndex: index,
            });
            setIsPlayingSlideshow(false);
          }}
          onToggleLike={handleToggleLike}
          onRequestUpload={(albumId) => openUploadModalForAlbum(albumId)}
          onStartSlideshow={() => startAlbumSlideshow(activeAlbum.id)}
          onEditPhoto={(photo) => handleOpenEditPhoto(photo, activeAlbum.id)}
          onDeletePhoto={(photoId) => handleDeletePhoto(activeAlbum.id, photoId)}
          onEditAlbum={(album) => handleOpenEditAlbum(album)}
          onDeleteAlbum={(albumId) => handleDeleteAlbum(albumId)}
        />

        {/* Lightbox */}
        <PhotoLightbox
          photos={activeLightboxPhotos}
          currentIndex={lightboxState.currentIndex}
          isOpen={lightboxState.isOpen}
          onClose={() => {
            setLightboxState((prev) => ({ ...prev, isOpen: false }));
            setIsPlayingSlideshow(false);
          }}
          onNavigate={(newIndex) =>
            setLightboxState((prev) => ({ ...prev, currentIndex: newIndex }))
          }
          onToggleLike={handleToggleLike}
          onAddComment={handleAddPhotoComment}
          onEditPhoto={(photo) =>
            handleOpenEditPhoto(photo, lightboxState.albumId || activeAlbum.id)
          }
          onDeletePhoto={(photoId) =>
            handleDeletePhoto(lightboxState.albumId || activeAlbum.id, photoId)
          }
          isPlayingSlideshow={isPlayingSlideshow}
          onToggleSlideshow={() => setIsPlayingSlideshow((prev) => !prev)}
        />

        {/* Upload Modal */}
        <UploadPhotosModal
          isOpen={isUploadPhotosOpen}
          onClose={() => setIsUploadPhotosOpen(false)}
          albums={albums}
          selectedAlbumId={targetAlbumIdForUpload || activeAlbum.id}
          onUploadPhotos={handleUploadPhotos}
          onRequestCreateAlbum={() => {
            setIsUploadPhotosOpen(false);
            setIsCreateAlbumOpen(true);
          }}
        />

        {/* Create Album Modal */}
        <CreateAlbumModal
          isOpen={isCreateAlbumOpen}
          onClose={() => setIsCreateAlbumOpen(false)}
          onCreateAlbum={handleCreateAlbum}
        />

        {/* Edit Photo Modal */}
        <EditPhotoModal
          photo={editingPhoto?.photo || null}
          albumId={editingPhoto?.albumId || activeAlbum.id}
          isOpen={Boolean(editingPhoto)}
          onClose={() => setEditingPhoto(null)}
          onSave={handleSavePhotoUpdates}
          onDelete={handleDeletePhoto}
        />

        {/* Edit Album Modal */}
        <EditAlbumModal
          album={editingAlbum}
          isOpen={Boolean(editingAlbum)}
          onClose={() => setEditingAlbum(null)}
          onSave={handleSaveAlbumUpdates}
          onDelete={handleDeleteAlbum}
        />
      </>
    );
  }

  // Otherwise: Main Album Gallery Grid View
  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* 1. Page Header & Actions */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-wider">
            <ImageIcon className="w-4 h-4" />
            <span>Alumni Visual Archives</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight mt-0.5">
            Campus & Alumni Gallery
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Cherished moments, convocation memories, and alumni reunions across the years.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 self-start sm:self-center flex-wrap">
          <button
            type="button"
            onClick={() => setIsCreateAlbumOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-2xl transition-all cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs"
          >
            <FolderPlus className="w-4 h-4 text-blue-600" />
            <span>+ Make Album</span>
          </button>

          <button
            type="button"
            onClick={() => openUploadModalForAlbum()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-2xl shadow-xs transition-all cursor-pointer scale-100 hover:scale-102"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Photos</span>
          </button>
        </div>
      </div>

      {/* Main Admin Full Access Status Banner */}
      {isAdmin && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-3xl bg-gradient-to-r from-blue-900/60 via-slate-900/80 to-purple-900/50 border border-blue-500/40 text-white shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-900/40 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                <span>Main Admin Gallery Access Active</span>
                <span className="px-1.5 py-0.2 rounded bg-blue-500/30 text-[10px] text-blue-200 border border-blue-400/30">Full Control</span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Full authority enabled: you can upload new campus pictures, edit captions/tags, replace photos, and delete images or albums.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCreateAlbumOpen(true)}
              className="btn-interactive inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>+ New Album</span>
            </button>
            <button
              type="button"
              onClick={() => openUploadModalForAlbum()}
              className="btn-interactive inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Upload Photos</span>
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. Gallery Summary Metrics */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Curated Albums
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-50">
            {albums.length}
          </div>
          <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
            Reunions & Archives
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Total Memories
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
            {totalPhotosCount}+
          </div>
          <div className="text-[10px] text-slate-500 font-semibold">
            High-Resolution Photos
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Batches Covered
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            Batch 01–76+
          </div>
          <div className="text-[10px] text-slate-500 font-semibold">
            All Generations
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Latest Archive
          </div>
          <div className="text-sm font-black text-slate-900 dark:text-slate-50 truncate pt-1">
            Grand Reunion 2026
          </div>
          <div className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
            Updated recently
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. Category Filter Tabs & Search Bar */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: 'all', label: 'All Albums' },
            { id: 'reunion', label: 'Reunions' },
            { id: 'academic', label: 'Academic & Clubs' },
            { id: 'campus', label: 'Campus Life' },
            { id: 'convocation', label: 'Convocations' },
            { id: 'sports', label: 'Sports & Cultural' },
          ].map((cat) => {
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                  active
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search albums..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. Albums Showcase Grid */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-5 sm:gap-6">
        {filteredAlbums.map((album) => {
          const previewPhotos = album.photos.slice(0, 4);

          return (
            <div
              key={album.id}
              onClick={() => setSelectedAlbumId(album.id)}
              className="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-800 transition-all duration-300 cursor-pointer flex flex-col"
            >
              {/* Cover Image & Overlay */}
              <div className="h-60 sm:h-64 relative overflow-hidden bg-slate-950">
                <img
                  src={album.coverUrl}
                  alt={album.title}
                  className="w-full h-full object-cover group-hover:scale-106 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                {/* Top Badge: Photo Count & Category & Admin Controls */}
                <div className="absolute top-3.5 inset-x-4 flex items-center justify-between z-10">
                  <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-blue-600/90 text-white backdrop-blur-md shadow-xs flex items-center gap-1.5">
                    <Camera className="w-3 h-3" />
                    <span>{album.photos.length || album.photosCount} Photos</span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    {isAdmin && (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleOpenEditAlbum(album)}
                          title="Edit Album Metadata"
                          className="p-1.5 rounded-full bg-black/60 hover:bg-blue-600 text-white backdrop-blur-md transition-colors border border-white/20 shadow-xs cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-blue-300" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAlbum(album.id)}
                          title="Delete Album"
                          className="p-1.5 rounded-full bg-black/60 hover:bg-rose-600 text-white backdrop-blur-md transition-colors border border-white/20 shadow-xs cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-300" />
                        </button>
                      </div>
                    )}
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-black/50 text-slate-200 backdrop-blur-md border border-white/20">
                      {album.category}
                    </span>
                  </div>
                </div>

                {/* Bottom Title & Details */}
                <div className="absolute bottom-3 left-4 right-4 text-white space-y-1">
                  <h3 className="font-extrabold text-lg sm:text-xl leading-snug group-hover:text-blue-300 transition-colors">
                    {album.title}
                  </h3>
                  {album.location && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-300">
                      <MapPin className="w-3 h-3 text-rose-400" />
                      <span className="truncate">{album.location}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Photo Peek Thumbnails */}
              <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center -space-x-2 overflow-hidden">
                  {previewPhotos.map((photo, i) => (
                    <img
                      key={photo.id}
                      src={photo.url}
                      alt="Thumbnail preview"
                      className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-slate-900 object-cover"
                    />
                  ))}
                  {album.photos.length > 4 && (
                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/80 text-blue-700 dark:text-blue-200 text-[10px] font-black flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                      +{album.photos.length - 4}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openUploadModalForAlbum(album.id);
                  }}
                  className="text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors"
                >
                  <Plus className="w-3 h-3 text-blue-600" />
                  <span>Add Photos</span>
                </button>
              </div>

              {/* Footer Bar */}
              <div className="p-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium mt-auto">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{album.date}</span>
                </div>

                <span className="text-blue-600 dark:text-blue-400 font-extrabold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>View Album</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}

        {filteredAlbums.length === 0 && (
          <div className="col-span-full py-16 px-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-center shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center mb-3">
              <Camera className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              No photo albums found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No albums matched "${searchQuery}". Try a different keyword.`
                : 'No albums in this category yet. Be the first to share memorable moments!'}
            </p>
            <button
              type="button"
              onClick={() => setIsCreateAlbumOpen(true)}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              Create New Album
            </button>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. Modals */}
      {/* ------------------------------------------------------------- */}
      <CreateAlbumModal
        isOpen={isCreateAlbumOpen}
        onClose={() => setIsCreateAlbumOpen(false)}
        onCreateAlbum={handleCreateAlbum}
      />

      <UploadPhotosModal
        isOpen={isUploadPhotosOpen}
        onClose={() => setIsUploadPhotosOpen(false)}
        albums={albums}
        selectedAlbumId={targetAlbumIdForUpload}
        onUploadPhotos={handleUploadPhotos}
        onRequestCreateAlbum={() => {
          setIsUploadPhotosOpen(false);
          setIsCreateAlbumOpen(true);
        }}
      />

      {/* Edit Photo Modal */}
      <EditPhotoModal
        photo={editingPhoto?.photo || null}
        albumId={editingPhoto?.albumId || 1}
        isOpen={Boolean(editingPhoto)}
        onClose={() => setEditingPhoto(null)}
        onSave={handleSavePhotoUpdates}
        onDelete={handleDeletePhoto}
      />

      {/* Edit Album Modal */}
      <EditAlbumModal
        album={editingAlbum}
        isOpen={Boolean(editingAlbum)}
        onClose={() => setEditingAlbum(null)}
        onSave={handleSaveAlbumUpdates}
        onDelete={handleDeleteAlbum}
      />
    </div>
  );
};

export default GalleryView;
