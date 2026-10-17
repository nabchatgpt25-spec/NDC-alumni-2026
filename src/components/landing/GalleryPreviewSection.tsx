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

  // Sync with DB
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
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(albums));
    } catch {
      // ignore
    }
  }, [albums]);

  // Extract top 6 photos across albums
  const photos = useMemo(() => {
    const list: (GalleryPhoto & { albumId: number })[] = [];
    albums.forEach((album) => {
      album.photos.forEach((p) => {
        if (list.length < 6) list.push({ ...p, albumId: album.id });
      });
    });
    return list;
  }, [albums]);

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
      albums.find((a) => a.photos.some((p) => p.id === photo.id))?.id ||
      1;
    setEditingPhoto({ photo, albumId: targetAlbumId });
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
      console.warn('updateGalleryPhotoInDb error:', err);
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

    if (lightboxOpen) {
      if (photos.length <= 1) {
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

    for (const photo of newPhotos) {
      try {
        await addPhotoToGalleryAlbumInDb({
          albumId,
          url: photo.url,
          caption: photo.caption,
          batchYear: photo.batchYear,
          tags: photo.tags,
          mediaType: photo.mediaType,
          fileSize: photo.fileSize,
          uploaderId: currentUser?.id,
        });
      } catch (err) {
        console.warn('addPhotoToGalleryAlbumInDb error:', err);
      }
    }
  };

  return (
    <section className="py-5 sm:py-8 lg:py-14 bg-slate-100/60 dark:bg-slate-900/40 border-y border-slate-200/80 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-4">
        {/* Main Admin Full Access Indicator Banner */}
        {isAdmin && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-blue-900/60 via-slate-900/80 to-purple-900/50 border border-blue-500/40 text-white shadow-md flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-xl bg-blue-600 text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                <ShieldCheck className="w-3.5 h-3.5" />
                Main Admin Full Access
              </span>
              <span className="text-xs text-slate-200">
                You can change captions, replace photographs, upload new moments, or delete any of these pictures.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsUploadOpen(true)}
              className="btn-interactive inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Upload New Photo</span>
            </button>
          </div>
        )}

        <ScrollReveal>
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-3.5 sm:mb-6 gap-3 sm:gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1.5">
                <Camera className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Campus Nostalgia &amp; Archives</span>
              </div>
              <h2 className="text-xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                Notre Dame Moments &amp; Memories
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5 max-w-xl">
                From academic lectures in Motijheel to science club festivals, debate championships, sports tournaments, and joyful batch reunions.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
              <MagneticWrap>
                <button
                  type="button"
                  onClick={onExploreGallery}
                  className="btn-interactive inline-flex items-center gap-1.5 px-4 py-2 sm:px-5 sm:py-2.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400" />
                  <span>View All Photo Albums</span>
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </MagneticWrap>
            </div>
          </div>
        </ScrollReveal>

        {/* Photo Mosaic with Staggered Reveal, 3D Tilt & Depth Zoom */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4">
          {photos.map((photo, idx) => {
            const canEdit = canEditGalleryPhoto(photo, currentUser);
            const canDelete = canDeleteGalleryPhoto(photo, currentUser);
            const isUploader =
              (photo.uploaderId && Number(photo.uploaderId) === Number(currentUser?.id)) ||
              (photo.uploaderName &&
                currentUser?.fullName &&
                photo.uploaderName.trim().toLowerCase() === currentUser.fullName.trim().toLowerCase());

            return (
              <motion.div
                key={photo.id}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 20, scale: 0.97 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{
                  duration: 0.5,
                  delay: idx * 0.06,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <Tilt3DCard
                  maxTilt={3.5}
                  onClick={() => handleOpenPhoto(idx)}
                  className="group relative h-36 sm:h-52 lg:h-64 rounded-xl sm:rounded-3xl overflow-hidden cursor-pointer shadow-sm sm:shadow-md bg-slate-900 border border-slate-200/50 dark:border-slate-800"
                >
                  <img
                    src={photo.url}
                    alt={photo.caption || 'Campus photo'}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out opacity-95 group-hover:opacity-100"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                  {/* Owner & Main Admin Management Overlay (Edit & Delete Buttons) */}
                  {(canEdit || canDelete) && (
                    <div
                      className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 z-30 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleOpenEditPhoto(photo, photo.albumId)}
                          title="Edit this picture (caption, tags, batch, replacement)"
                          className="px-2 py-1 rounded-lg bg-black/70 hover:bg-blue-600 text-white backdrop-blur-md border border-white/20 text-[10px] sm:text-xs font-bold flex items-center gap-1 shadow-md transition-all cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3 text-blue-300" />
                          <span className="hidden sm:inline">Edit</span>
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDeletePhoto(photo.albumId, photo.id)}
                          title="Delete this picture"
                          className="p-1 rounded-lg bg-black/70 hover:bg-rose-600 text-white backdrop-blur-md border border-white/20 shadow-md transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3 text-rose-300" />
                        </button>
                      )}
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider backdrop-blur-md shadow-xs ${
                          isAdmin
                            ? 'bg-blue-600/90 text-white border border-blue-400/40'
                            : 'bg-emerald-600/90 text-white border border-emerald-400/40'
                        }`}
                      >
                        {isAdmin ? 'Admin' : 'Yours'}
                      </span>
                    </div>
                  )}

                  {/* Caption & Uploader Badge */}
                  <div className="absolute bottom-0 inset-x-0 p-2 sm:p-4 text-white z-20">
                    <p className="text-[11px] sm:text-xs font-semibold line-clamp-1 mb-0.5">
                      {photo.caption}
                    </p>
                    <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-slate-300">
                      <span className="truncate mr-1">By {photo.uploaderName}</span>
                      <span className="flex items-center gap-0.5 font-bold text-rose-300 shrink-0">
                        <Heart className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current" />
                        <span>{photo.likesCount || 0}</span>
                      </span>
                    </div>
                  </div>

                  {/* Hover Zoom Icon */}
                  <div className="absolute top-2 right-2 sm:top-3 sm:right-3 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 backdrop-blur-md transition-opacity z-20">
                    <Maximize2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </div>
                </Tilt3DCard>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Lightbox Modal */}
      <PhotoLightbox
        photos={photos}
        currentIndex={activePhotoIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={(newIdx) => setActivePhotoIndex(newIdx)}
        onToggleLike={() => {}}
        onEditPhoto={(photo) => {
          const matched = photos.find((p) => p.id === photo.id);
          handleOpenEditPhoto(photo, matched?.albumId);
        }}
        onDeletePhoto={(photoId) => {
          const matched = photos.find((p) => p.id === photoId);
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
