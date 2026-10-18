/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Camera,
  Image as ImageIcon,
  ArrowRight,
  Heart,
  Maximize2,
  Edit3,
  Trash2,
  Plus,
  ShieldCheck,
  UserCheck,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { INITIAL_ALBUMS } from '../../data/galleryData';
import { PhotoLightbox } from '../gallery/PhotoLightbox';
import { EditPhotoModal } from '../gallery/EditPhotoModal';
import { UploadPhotosModal } from '../gallery/UploadPhotosModal';
import { GalleryAlbum, GalleryPhoto } from '../../types';
import {
  MagneticWrap,
  ScrollReveal,
  Tilt3DCard,
} from '../motion/CinematicMotion';
import { useAuth } from '../../context/AuthContext';
import {
  isMainAdmin,
  canEditGalleryPhoto,
  canDeleteGalleryPhoto,
  ADMIN_EMAILS_SET,
} from '../../utils/galleryPermissions';
import {
  fetchGalleryAlbumsFromDb,
  updateGalleryPhotoInDb,
  deleteGalleryPhotoInDb,
  addPhotoToGalleryAlbumInDb,
} from '../../services/supabaseService';

const STORAGE_KEY = 'ndc_alumni_gallery_albums';

interface GalleryPreviewSectionProps {
  onExploreGallery: () => void;
}

export const GalleryPreviewSection: React.FC<GalleryPreviewSectionProps> = ({
  onExploreGallery,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const { currentUser } = useAuth();
  
  // Verify Main Admin access: matches role 'admin'/'moderator' or any official admin email (including firstaidnetworkbd@gmail.com)
  const isAdmin =
    isMainAdmin(currentUser) ||
    currentUser.role === 'admin' ||
    currentUser.role === 'moderator' ||
    ADMIN_EMAILS_SET.has((currentUser.email || '').trim().toLowerCase());

  // Database is the primary source of truth; INITIAL_ALBUMS acts as fallback / seed
  const [albums, setAlbums] = useState<GalleryAlbum[]>(INITIAL_ALBUMS);

  // Sync with DB on mount
  useEffect(() => {
    let isMounted = true;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}

    fetchGalleryAlbumsFromDb()
      .then((dbAlbums) => {
        if (isMounted && dbAlbums && dbAlbums.length > 0) {
          setAlbums(() => {
            const dbIds = new Set(dbAlbums.map((a) => a.id));
            const remainingPresets = INITIAL_ALBUMS.filter((a) => !dbIds.has(a.id));
            return [...dbAlbums, ...remainingPresets];
          });
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  // Listen to updates from other views (e.g. GalleryView, feeds)
  useEffect(() => {
    const handleUpdate = () => {
      fetchGalleryAlbumsFromDb()
        .then((dbAlbums) => {
          if (dbAlbums && dbAlbums.length > 0) {
            setAlbums(() => {
              const dbIds = new Set(dbAlbums.map((a) => a.id));
              const remainingPresets = INITIAL_ALBUMS.filter((a) => !dbIds.has(a.id));
              return [...dbAlbums, ...remainingPresets];
            });
          }
        })
        .catch(() => {});
    };
    window.addEventListener('ndc_gallery_updated', handleUpdate);
    return () => {
      window.removeEventListener('ndc_gallery_updated', handleUpdate);
    };
  }, []);

  // Extract ALL photos across albums - no artificial 6-photo hardcap!
  // Sort custom/uploaded photos first so newly uploaded pictures appear at the top of the homepage!
  const allPhotos = useMemo(() => {
    const list: (GalleryPhoto & { albumId: number; albumTitle?: string })[] = [];
    const seenIds = new Set<string>();

    albums.forEach((album) => {
      (album.photos || []).forEach((p) => {
        if (!seenIds.has(p.id)) {
          seenIds.add(p.id);
          list.push({ ...p, albumId: album.id, albumTitle: album.title });
        }
      });
    });

    // Custom uploads (e.g. uploadedAt === 'Just now' or recent dates) prioritized at the front
    return list.sort((a, b) => {
      if (a.uploadedAt === 'Just now' && b.uploadedAt !== 'Just now') return -1;
      if (b.uploadedAt === 'Just now' && a.uploadedAt !== 'Just now') return 1;

      const dateA = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
      const dateB = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
      if (dateA && dateB && dateA !== dateB) return dateB - dateA;

      return 0;
    });
  }, [albums]);

  // Show all photos by default as requested by user ("i want to add many photo here as i wish")
  const [showAllPhotos, setShowAllPhotos] = useState<boolean>(true);

  // If there are more than 12 photos, user can toggle between 12 or all
  const displayPhotos = useMemo(() => {
    if (showAllPhotos || allPhotos.length <= 12) {
      return allPhotos;
    }
    return allPhotos.slice(0, 12);
  }, [allPhotos, showAllPhotos]);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [editingPhoto, setEditingPhoto] = useState<{
    photo: GalleryPhoto;
    albumId: number;
  } | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const handleOpenPhoto = (idx: number) => {
    setActivePhotoIndex(idx);
    setLightboxOpen(true);
  };

  const handleOpenEditPhoto = (photo: GalleryPhoto, albumId?: number) => {
    const targetAlbumId =
      albumId ||
      albums.find((a) => a.photos?.some((p) => p.id === photo.id))?.id ||
      albums[0]?.id ||
      1;
    setEditingPhoto({ photo, albumId: targetAlbumId });
  };

  const handleSavePhotoUpdates = async (
    albumId: number,
    photoId: string,
    updates: Partial<GalleryPhoto>
  ) => {
    setAlbums((prev) => {
      const updated = prev.map((alb) => {
        if (alb.id === albumId) {
          return {
            ...alb,
            photos: (alb.photos || []).map((p) => (p.id === photoId ? { ...p, ...updates } : p)),
          };
        }
        return alb;
      });
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('ndc_gallery_updated'));
      } catch {}
      return updated;
    });

    try {
      await updateGalleryPhotoInDb(photoId, {
        caption: updates.caption,
        batchYear: updates.batchYear,
        tags: updates.tags,
        url: updates.url,
        mediaType: updates.mediaType,
      });
    } catch (err) {
      console.warn('updateGalleryPhotoInDb error:', err);
    }
  };

  const handleDeletePhoto = async (albumId: number, photoId: string) => {
    if (typeof window !== 'undefined') {
      const confirmDelete = window.confirm(
        'Are you sure you want to delete this photo from the homepage gallery?'
      );
      if (!confirmDelete) return;
    }

    setAlbums((prev) => {
      const updated = prev.map((alb) => {
        if (alb.id === albumId) {
          const remaining = (alb.photos || []).filter((p) => p.id !== photoId);
          return {
            ...alb,
            photos: remaining,
            photosCount: remaining.length,
          };
        }
        return alb;
      });
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('ndc_gallery_updated'));
      } catch {}
      return updated;
    });

    if (lightboxOpen) {
      if (allPhotos.length <= 1) {
        setLightboxOpen(false);
      } else {
        setActivePhotoIndex((prev) => Math.max(0, prev - 1));
      }
    }

    try {
      await deleteGalleryPhotoInDb(photoId);
    } catch (err) {
      console.warn('deleteGalleryPhotoInDb error:', err);
    }
  };

  const handleUploadPhotos = async (albumId: number, newPhotos: GalleryPhoto[]) => {
    const targetAlbumId = albumId || albums[0]?.id || 1;

    setAlbums((prev) => {
      let matched = false;
      const updated = prev.map((alb) => {
        if (alb.id === targetAlbumId) {
          matched = true;
          const updatedPhotos = [...newPhotos, ...(alb.photos || [])];
          return {
            ...alb,
            photos: updatedPhotos,
            photosCount: updatedPhotos.length,
          };
        }
        return alb;
      });

      // If target album didn't exist, prepend to the very first album
      if (!matched && prev.length > 0) {
        return prev.map((alb, idx) => {
          if (idx === 0) {
            const updatedPhotos = [...newPhotos, ...(alb.photos || [])];
            return {
              ...alb,
              photos: updatedPhotos,
              photosCount: updatedPhotos.length,
            };
          }
          return alb;
        });
      }

      return updated;
    });

    // Broadcast update across views
    window.dispatchEvent(new CustomEvent('ndc_gallery_updated'));

    for (const photo of newPhotos) {
      const isAlreadyPersisted =
        photo.url.startsWith('http') &&
        !photo.id.startsWith('pending-') &&
        !photo.id.startsWith('media-') &&
        !photo.id.startsWith('p-');

      if (isAlreadyPersisted) continue;

      try {
        await addPhotoToGalleryAlbumInDb({
          albumId: targetAlbumId,
          url: photo.url,
          caption: photo.caption,
          batchYear: photo.batchYear,
          tags: photo.tags,
          mediaType: photo.mediaType,
          fileSize: photo.fileSize,
          uploaderId: currentUser?.id,
        });
      } catch (err: any) {
        console.error('addPhotoToGalleryAlbumInDb error:', err);
        const errMsg = err?.message || String(err);
        alert(`Failed to save photograph to Supabase:\n\n${errMsg}`);
        throw err;
      }
    }
  };

  return (
    <section className="py-6 sm:py-10 lg:py-16 bg-slate-100/70 dark:bg-slate-900/50 border-y border-slate-200/80 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-5">
        {/* Main Admin Full Access Indicator Banner */}
        {isAdmin && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-900/90 via-slate-900/95 to-indigo-950/90 border border-blue-500/50 text-white shadow-lg flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md border border-blue-400/40">
                <ShieldCheck className="w-4 h-4" />
                Main Admin Full Access
              </span>
              <span className="text-xs sm:text-sm text-slate-200">
                You have full permission to <strong>add</strong> new photos, <strong>edit</strong> captions &amp; replacements, or <strong>delete</strong> any photos here.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsUploadOpen(true)}
                className="btn-interactive inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold transition-all shadow-md cursor-pointer hover:shadow-blue-500/30"
              >
                <Plus className="w-4 h-4" />
                <span>Add / Upload Photos</span>
              </button>
            </div>
          </div>
        )}

        <ScrollReveal>
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-4 sm:mb-6 gap-3 sm:gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1.5">
                <Camera className="w-3.5 h-3.5" />
                <span>Campus Nostalgia &amp; Archives</span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                  Notre Dame Moments &amp; Memories
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-extrabold">
                  {allPhotos.length} {allPhotos.length === 1 ? 'Photo' : 'Photos'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
                Historic campus heritage, jubilee reunions, sports championships, and alumni moments. Custom uploaded photos appear instantly here.
              </p>
            </div>

            <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(true)}
                  className="btn-interactive inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Photo</span>
                </button>
              )}

              <MagneticWrap>
                <button
                  type="button"
                  onClick={onExploreGallery}
                  className="btn-interactive inline-flex items-center gap-1.5 px-4 py-2 sm:px-5 sm:py-2.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400" />
                  <span>View All Albums</span>
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </MagneticWrap>
            </div>
          </div>
        </ScrollReveal>

        {/* Dynamic Photo Grid without 6-photo hardcap */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Main Admin Quick Add Card */}
          {isAdmin && (
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <button
                type="button"
                onClick={() => setIsUploadOpen(true)}
                className="group w-full h-44 sm:h-56 lg:h-64 rounded-xl sm:rounded-3xl border-2 border-dashed border-blue-400/70 dark:border-blue-500/50 hover:border-blue-600 dark:hover:border-blue-400 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/60 dark:hover:bg-blue-950/40 flex flex-col items-center justify-center p-4 text-center transition-all cursor-pointer shadow-xs"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mb-2 shadow-md group-hover:scale-110 transition-transform">
                  <Plus className="w-6 h-6" />
                </div>
                <span className="text-xs sm:text-sm font-bold text-blue-900 dark:text-blue-200">
                  Add New Photo
                </span>
                <span className="text-[10px] sm:text-xs text-blue-700/70 dark:text-blue-300/70 mt-0.5">
                  Upload file or paste URL
                </span>
              </button>
            </motion.div>
          )}

          {displayPhotos.map((photo, idx) => {
            const canEdit = isAdmin || canEditGalleryPhoto(photo, currentUser);
            const canDelete = isAdmin || canDeleteGalleryPhoto(photo, currentUser);
            const isUploader =
              (photo.uploaderId && Number(photo.uploaderId) === Number(currentUser?.id)) ||
              (photo.uploaderName &&
                currentUser?.fullName &&
                photo.uploaderName.trim().toLowerCase() === currentUser.fullName.trim().toLowerCase());

            return (
              <motion.div
                key={photo.id}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 15, scale: 0.97 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{
                  duration: 0.4,
                  delay: Math.min(idx * 0.04, 0.4),
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <Tilt3DCard
                  maxTilt={3.5}
                  onClick={() => handleOpenPhoto(idx)}
                  className="group relative h-44 sm:h-56 lg:h-64 rounded-xl sm:rounded-3xl overflow-hidden cursor-pointer shadow-sm sm:shadow-md bg-slate-900 border border-slate-200/50 dark:border-slate-800"
                >
                  <img
                    src={photo.url}
                    alt={photo.caption || 'Campus photo'}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out opacity-95 group-hover:opacity-100"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                  {/* Owner & Main Admin Management Overlay (Edit & Delete Buttons) */}
                  {(canEdit || canDelete) && (
                    <div
                      className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 z-30 flex items-center gap-1.5 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleOpenEditPhoto(photo, photo.albumId)}
                          title="Edit this picture (caption, tags, batch, replacement)"
                          className="px-2 py-1 rounded-lg bg-black/80 hover:bg-blue-600 text-white backdrop-blur-md border border-white/20 text-[10px] sm:text-xs font-bold flex items-center gap-1 shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
                        >
                          <Edit3 className="w-3 h-3 text-blue-300" />
                          <span>Edit</span>
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDeletePhoto(photo.albumId, photo.id)}
                          title="Delete this picture"
                          className="p-1.5 rounded-lg bg-black/80 hover:bg-rose-600 text-white backdrop-blur-md border border-white/20 shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
                        >
                          <Trash2 className="w-3 h-3 text-rose-300" />
                        </button>
                      )}
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider backdrop-blur-md shadow-xs ${
                          isAdmin
                            ? 'bg-blue-600 text-white border border-blue-400/40'
                            : 'bg-emerald-600 text-white border border-emerald-400/40'
                        }`}
                      >
                        {isAdmin ? 'Admin' : 'Yours'}
                      </span>
                    </div>
                  )}

                  {/* Caption & Uploader Badge */}
                  <div className="absolute bottom-0 inset-x-0 p-2.5 sm:p-4 text-white z-20">
                    <p className="text-[11px] sm:text-xs font-semibold line-clamp-1 mb-0.5">
                      {photo.caption}
                    </p>
                    <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-slate-300">
                      <span className="truncate mr-1 font-medium">By {photo.uploaderName || 'Notre Dame Alumnus'}</span>
                      <span className="flex items-center gap-0.5 font-bold text-rose-300 shrink-0">
                        <Heart className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current" />
                        <span>{photo.likesCount || 0}</span>
                      </span>
                    </div>
                  </div>

                  {/* Hover Zoom Icon */}
                  <div className="absolute top-2 right-2 sm:top-3 sm:right-3 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/60 text-white flex items-center justify-center opacity-80 sm:opacity-0 group-hover:opacity-100 backdrop-blur-md transition-opacity z-20">
                    <Maximize2 className="w-3.5 h-3.5" />
                  </div>
                </Tilt3DCard>
              </motion.div>
            );
          })}
        </div>

        {/* Expand / Collapse toggle if there are more than 12 photos */}
        {allPhotos.length > 12 && (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => setShowAllPhotos((prev) => !prev)}
              className="btn-interactive inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-bold shadow-xs cursor-pointer transition-all"
            >
              {showAllPhotos ? (
                <>
                  <ChevronUp className="w-4 h-4 text-blue-600" />
                  <span>Show Less Photos</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 text-blue-600" />
                  <span>Show All {allPhotos.length} Photos</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      <PhotoLightbox
        photos={displayPhotos}
        currentIndex={activePhotoIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={(newIdx) => setActivePhotoIndex(newIdx)}
        onToggleLike={() => {}}
        onEditPhoto={(photo) => {
          const matched = displayPhotos.find((p) => p.id === photo.id);
          handleOpenEditPhoto(photo, matched?.albumId);
        }}
        onDeletePhoto={(photoId) => {
          const matched = displayPhotos.find((p) => p.id === photoId);
          if (matched) {
            handleDeletePhoto(matched.albumId, photoId);
          }
        }}
        isPlayingSlideshow={false}
        onToggleSlideshow={() => {}}
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

      {/* Upload Photos Modal */}
      <UploadPhotosModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        albums={albums}
        selectedAlbumId={albums[0]?.id || 1}
        onUploadPhotos={handleUploadPhotos}
        onRequestCreateAlbum={() => {
          setIsUploadOpen(false);
          onExploreGallery();
        }}
      />
    </section>
  );
};
