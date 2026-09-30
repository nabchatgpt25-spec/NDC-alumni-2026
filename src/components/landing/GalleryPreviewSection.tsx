import React, { useState } from 'react';
import {
  Camera,
  Image as ImageIcon,
  ArrowRight,
  Sparkles,
  Heart,
  Maximize2
} from 'lucide-react';
import { INITIAL_ALBUMS } from '../../data/galleryData';
import { PhotoLightbox } from '../gallery/PhotoLightbox';
import { GalleryPhoto } from '../../types';

interface GalleryPreviewSectionProps {
  onExploreGallery: () => void;
}

export const GalleryPreviewSection: React.FC<GalleryPreviewSectionProps> = ({
  onExploreGallery,
}) => {
  // Extract top 6 photos across initial albums
  const photos = React.useMemo(() => {
    const list: GalleryPhoto[] = [];
    INITIAL_ALBUMS.forEach((album) => {
      album.photos.forEach((p) => {
        if (list.length < 6) list.push(p);
      });
    });
    return list;
  }, []);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const handleOpenPhoto = (idx: number) => {
    setActivePhotoIndex(idx);
    setLightboxOpen(true);
  };

  return (
    <section className="py-5 sm:py-8 lg:py-14 bg-slate-100/60 dark:bg-slate-900/40 border-y border-slate-200/80 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-3.5 sm:mb-6 gap-3 sm:gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1.5">
              <Camera className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Campus Nostalgia & Archives</span>
            </div>
            <h2 className="text-xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Notre Dame Moments & Memories
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5 max-w-xl">
              From academic lectures in Motijheel to science club festivals, debate championships, sports tournaments, and joyful batch reunions.
            </p>
          </div>

          <button
            type="button"
            onClick={onExploreGallery}
            className="inline-flex items-center gap-1.5 px-4 py-2 sm:px-5 sm:py-2.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all cursor-pointer self-start md:self-auto"
          >
            <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400" />
            <span>View All Photo Albums</span>
            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* Photo Mosaic */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4">
          {photos.map((photo, idx) => (
            <div
              key={photo.id}
              onClick={() => handleOpenPhoto(idx)}
              className="group relative h-32 sm:h-52 lg:h-64 rounded-xl sm:rounded-3xl overflow-hidden cursor-pointer shadow-sm sm:shadow-md bg-slate-900 border border-slate-200/50 dark:border-slate-800"
            >
              <img
                src={photo.url}
                alt={photo.caption || 'Campus photo'}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-95 group-hover:opacity-100"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

              {/* Caption & Uploader Badge */}
              <div className="absolute bottom-0 inset-x-0 p-2 sm:p-4 text-white">
                <p className="text-[11px] sm:text-xs font-semibold line-clamp-1 mb-0.5">
                  {photo.caption}
                </p>
                <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-slate-300">
                  <span className="truncate mr-1">By {photo.uploaderName}</span>
                  <span className="flex items-center gap-0.5 font-bold text-rose-300 shrink-0">
                    <Heart className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current" />
                    <span>{photo.likesCount}</span>
                  </span>
                </div>
              </div>

              {/* Hover Zoom Icon */}
              <div className="absolute top-2 right-2 sm:top-3 sm:right-3 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 backdrop-blur-md transition-opacity">
                <Maximize2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </div>
            </div>
          ))}
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
        isPlayingSlideshow={false}
        onToggleSlideshow={() => {}}
      />
    </section>
  );
};
