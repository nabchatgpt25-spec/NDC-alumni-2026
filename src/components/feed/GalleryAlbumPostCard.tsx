import React from 'react';
import {
  Images,
  ArrowRight,
  Camera,
  MapPin,
  Calendar,
  Layers,
  ZoomIn,
  Sparkles,
} from 'lucide-react';
import { PostItem } from '../../types';

interface GalleryAlbumPostCardProps {
  post: PostItem;
  onOpenLightbox?: (imageIndex: number) => void;
  onViewAlbum: (albumId: number) => void;
}

export const GalleryAlbumPostCard: React.FC<GalleryAlbumPostCardProps> = ({
  post,
  onOpenLightbox,
  onViewAlbum,
}) => {
  const metadata = post.link_metadata || {};
  const albumId: number = Number(
    metadata.albumId || (post.linked_url ? post.linked_url.replace('#album-', '') : 0)
  );
  const albumTitle: string =
    metadata.albumTitle ||
    (post.content ? post.content.split('\n')[0].replace(/^.*?"(.*?)".*$/, '$1') : 'Gallery Album');
  const albumCategory: string = metadata.albumCategory || 'Campus Memories';
  const photoCount: number =
    metadata.photoCount ||
    metadata.totalPhotosCount ||
    metadata.newPhotosCount ||
    (post.images ? post.images.length : 1);
  const eventDate: string | undefined = metadata.eventDate;
  const location: string | undefined = metadata.location;
  const isPhotoUpload: boolean = metadata.actionType === 'upload_photos';

  // Images for the collage preview
  const images = (post.images && post.images.length > 0)
    ? post.images
    : (metadata.previewPhotos && metadata.previewPhotos.length > 0)
      ? metadata.previewPhotos
      : metadata.albumCover
        ? [metadata.albumCover]
        : [];

  const handleImageClick = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (onOpenLightbox) {
      onOpenLightbox(index);
    } else {
      onViewAlbum(albumId);
    }
  };

  const handleAlbumClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewAlbum(albumId);
  };

  const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
    reunion: {
      bg: 'bg-purple-100 dark:bg-purple-950/60',
      text: 'text-purple-700 dark:text-purple-300',
      border: 'border-purple-200 dark:border-purple-800',
    },
    academic: {
      bg: 'bg-blue-100 dark:bg-blue-950/60',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-800',
    },
    campus: {
      bg: 'bg-emerald-100 dark:bg-emerald-950/60',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-200 dark:border-emerald-800',
    },
    convocation: {
      bg: 'bg-amber-100 dark:bg-amber-950/60',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-200 dark:border-amber-800',
    },
    sports: {
      bg: 'bg-rose-100 dark:bg-rose-950/60',
      text: 'text-rose-700 dark:text-rose-300',
      border: 'border-rose-200 dark:border-rose-800',
    },
    cultural: {
      bg: 'bg-pink-100 dark:bg-pink-950/60',
      text: 'text-pink-700 dark:text-pink-300',
      border: 'border-pink-200 dark:border-pink-800',
    },
  };

  const catKey = albumCategory.toLowerCase();
  const theme = categoryColors[catKey] || {
    bg: 'bg-blue-100 dark:bg-blue-950/60',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
  };

  return (
    <div className="mb-4 rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs hover:shadow-md transition-all group/albumcard">
      {/* ------------------------------------------------------------- */}
      {/* 1. Preview Photo Collage */}
      {/* ------------------------------------------------------------- */}
      {images.length > 0 && (
        <div className="relative overflow-hidden bg-slate-950">
          {/* Collage: 1 Photo */}
          {images.length === 1 && (
            <div
              onClick={(e) => handleImageClick(e, 0)}
              className="relative aspect-video sm:aspect-[16/10] w-full overflow-hidden cursor-pointer group/img"
            >
              <img
                src={images[0]}
                alt={`${albumTitle} preview`}
                className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                <span className="p-2.5 rounded-full bg-black/60 backdrop-blur-xs text-white shadow-lg">
                  <ZoomIn className="w-5 h-5" />
                </span>
              </div>
              <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-md">
                <Camera className="w-3.5 h-3.5 text-blue-400" />
                <span>Cover Photo</span>
              </div>
            </div>
          )}

          {/* Collage: 2 Photos */}
          {images.length === 2 && (
            <div className="grid grid-cols-2 gap-1 h-60 sm:h-72 w-full">
              {images.map((url, idx) => (
                <div
                  key={idx}
                  onClick={(e) => handleImageClick(e, idx)}
                  className="relative h-full overflow-hidden cursor-pointer group/img"
                >
                  <img
                    src={url}
                    alt={`${albumTitle} preview ${idx + 1}`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="p-2 rounded-full bg-black/60 backdrop-blur-xs text-white">
                      <ZoomIn className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Collage: 3 Photos (1 large left, 2 stacked right) */}
          {images.length === 3 && (
            <div className="grid grid-cols-3 gap-1 h-64 sm:h-80 w-full">
              <div
                onClick={(e) => handleImageClick(e, 0)}
                className="col-span-2 relative h-full overflow-hidden cursor-pointer group/img"
              >
                <img
                  src={images[0]}
                  alt={`${albumTitle} featured`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="p-2.5 rounded-full bg-black/60 backdrop-blur-xs text-white">
                    <ZoomIn className="w-5 h-5" />
                  </span>
                </div>
              </div>
              <div className="col-span-1 flex flex-col gap-1 h-full">
                {images.slice(1, 3).map((url, idx) => (
                  <div
                    key={idx}
                    onClick={(e) => handleImageClick(e, idx + 1)}
                    className="relative flex-1 overflow-hidden cursor-pointer group/img"
                  >
                    <img
                      src={url}
                      alt={`${albumTitle} preview ${idx + 2}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="p-1.5 rounded-full bg-black/60 backdrop-blur-xs text-white">
                        <ZoomIn className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Collage: 4 Photos (2x2 equal grid) */}
          {images.length === 4 && (
            <div className="grid grid-cols-2 gap-1 h-64 sm:h-80 w-full">
              {images.map((url, idx) => (
                <div
                  key={idx}
                  onClick={(e) => handleImageClick(e, idx)}
                  className="relative h-full overflow-hidden cursor-pointer group/img"
                >
                  <img
                    src={url}
                    alt={`${albumTitle} preview ${idx + 1}`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="p-2 rounded-full bg-black/60 backdrop-blur-xs text-white">
                      <ZoomIn className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Collage: 5+ Photos (2x2 grid with +N more overlay on 4th photo) */}
          {images.length >= 5 && (
            <div className="grid grid-cols-2 gap-1 h-64 sm:h-80 w-full">
              {images.slice(0, 3).map((url, idx) => (
                <div
                  key={idx}
                  onClick={(e) => handleImageClick(e, idx)}
                  className="relative h-full overflow-hidden cursor-pointer group/img"
                >
                  <img
                    src={url}
                    alt={`${albumTitle} preview ${idx + 1}`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="p-2 rounded-full bg-black/60 backdrop-blur-xs text-white">
                      <ZoomIn className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              ))}

              {/* 4th Photo with +N badge */}
              <div
                onClick={handleAlbumClick}
                className="relative h-full overflow-hidden cursor-pointer group/more"
              >
                <img
                  src={images[3]}
                  alt={`${albumTitle} preview 4`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover/more:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] flex flex-col items-center justify-center text-white transition-colors group-hover/more:bg-slate-950/80">
                  <span className="text-xl sm:text-2xl font-black tracking-tight">
                    +{images.length - 3}
                  </span>
                  <span className="text-[11px] sm:text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1 mt-0.5">
                    <Layers className="w-3.5 h-3.5" />
                    More Photos
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. Interactive Album Info Banner & "View Full Album" Link */}
      {/* ------------------------------------------------------------- */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50/70 dark:from-slate-900/90 dark:via-blue-950/30 dark:to-slate-900 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Album meta info */}
        <div
          onClick={handleAlbumClick}
          className="flex items-center gap-3.5 min-w-0 cursor-pointer group/title"
        >
          <div className="w-12 h-12 rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 ring-1 ring-blue-500/20 group-hover/title:scale-105 transition-transform shadow-xs">
            <Images className="w-6 h-6" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${theme.bg} ${theme.text} ${theme.border}`}
              >
                {albumCategory}
              </span>

              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Camera className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                {photoCount} {photoCount === 1 ? 'Photo' : 'Photos'}
              </span>

              {isPhotoUpload && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900/50">
                  <Sparkles className="w-3 h-3" />
                  Recent Upload
                </span>
              )}
            </div>

            <h4
              className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 group-hover/title:text-blue-600 dark:group-hover/title:text-blue-400 transition-colors truncate"
              title={albumTitle}
            >
              {albumTitle}
            </h4>

            {(location || eventDate) && (
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                {location && (
                  <span className="flex items-center gap-1 truncate max-w-xs">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{location}</span>
                  </span>
                )}
                {eventDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{eventDate}</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* "View Full Album" CTA Button */}
        <div className="flex items-center sm:self-center shrink-0">
          <button
            type="button"
            onClick={handleAlbumClick}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:from-blue-800 active:to-indigo-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/25 hover:shadow-lg hover:shadow-blue-600/35 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer group/cta"
          >
            <span>View Full Album</span>
            <ArrowRight className="w-4 h-4 group-hover/cta:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};
