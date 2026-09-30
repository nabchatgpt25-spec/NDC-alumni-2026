import React, { useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Heart,
  Download,
  Share2,
  Calendar,
  User,
  Play,
  Pause,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Film
} from 'lucide-react';
import { GalleryPhoto } from '../../types';
import { isVideoUrl } from '../../utils/mediaStorage';

interface PhotoLightboxProps {
  photos: GalleryPhoto[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (newIndex: number) => void;
  onToggleLike: (photoId: string) => void;
  isPlayingSlideshow: boolean;
  onToggleSlideshow: () => void;
}

export const PhotoLightbox: React.FC<PhotoLightboxProps> = ({
  photos,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
  onToggleLike,
  isPlayingSlideshow,
  onToggleSlideshow,
}) => {
  const currentPhoto = photos[currentIndex];

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        if (currentIndex < photos.length - 1) {
          onNavigate(currentIndex + 1);
        } else {
          onNavigate(0);
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentIndex > 0) {
          onNavigate(currentIndex - 1);
        } else {
          onNavigate(photos.length - 1);
        }
      } else if (e.key === ' ') {
        e.preventDefault();
        onToggleSlideshow();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, photos.length, onClose, onNavigate, onToggleSlideshow]);

  if (!isOpen || !currentPhoto) return null;

  const handlePrev = () => {
    if (currentIndex > 0) {
      onNavigate(currentIndex - 1);
    } else {
      onNavigate(photos.length - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < photos.length - 1) {
      onNavigate(currentIndex + 1);
    } else {
      onNavigate(0);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = currentPhoto.url;
    link.download = `ndc-gallery-${currentPhoto.id}.jpg`;
    link.target = '_blank';
    link.rel = 'noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md select-none">
      {/* Top Header Bar */}
      <div className="absolute top-0 inset-x-0 p-4 sm:p-5 flex items-center justify-between z-20 bg-gradient-to-b from-black/80 to-transparent text-white">
        <div className="flex items-center gap-3">
          <div className="text-xs font-black uppercase tracking-wider text-blue-400 bg-blue-500/20 px-2.5 py-1 rounded-full border border-blue-500/30">
            Photo {currentIndex + 1} of {photos.length}
          </div>
          {currentPhoto.batchYear && (
            <span className="text-xs font-bold text-slate-300 hidden sm:inline-block">
              Batch {currentPhoto.batchYear} Archive
            </span>
          )}
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2">
          {/* Slideshow play/pause */}
          <button
            type="button"
            onClick={onToggleSlideshow}
            title={isPlayingSlideshow ? 'Pause Slideshow (Space)' : 'Start Slideshow (Space)'}
            className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              isPlayingSlideshow
                ? 'bg-blue-600 text-white'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            {isPlayingSlideshow ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span className="hidden sm:inline">
              {isPlayingSlideshow ? 'Pause' : 'Play Slideshow'}
            </span>
          </button>

          {/* Download Photo */}
          <button
            type="button"
            onClick={handleDownload}
            title="Download high-resolution image"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Close Lightbox */}
          <button
            type="button"
            onClick={onClose}
            title="Close Lightbox (Esc)"
            className="p-2 rounded-xl bg-white/10 hover:bg-red-500/80 text-white transition-colors cursor-pointer ml-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div className="relative w-full h-full flex items-center justify-center p-4 sm:p-12 md:p-16">
        {/* Previous Button */}
        <button
          type="button"
          onClick={handlePrev}
          className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 p-3 sm:p-4 rounded-full bg-white/10 hover:bg-white/25 text-white backdrop-blur-md transition-transform duration-150 hover:scale-110 z-20 cursor-pointer shadow-lg"
          title="Previous Photo (Left Arrow)"
        >
          <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
        </button>

        {/* Current Photo with smooth enter transition */}
        <div className="relative max-w-full max-h-full flex items-center justify-center">
          <img
            key={currentPhoto.id}
            src={currentPhoto.url}
            alt={currentPhoto.caption || 'Notre Dame Alumni Memory'}
            className="max-w-full max-h-[75vh] sm:max-h-[80vh] object-contain rounded-2xl shadow-2xl transition-all duration-300 pointer-events-auto"
          />
        </div>

        {/* Next Button */}
        <button
          type="button"
          onClick={handleNext}
          className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 p-3 sm:p-4 rounded-full bg-white/10 hover:bg-white/25 text-white backdrop-blur-md transition-transform duration-150 hover:scale-110 z-20 cursor-pointer shadow-lg"
          title="Next Photo (Right Arrow)"
        >
          <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
        </button>
      </div>

      {/* Bottom Caption and Contributor Bar */}
      <div className="absolute bottom-0 inset-x-0 p-4 sm:p-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent text-white z-20">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1.5 min-w-0 flex-1">
            {currentPhoto.caption && (
              <p className="text-sm sm:text-base font-semibold text-slate-100 leading-snug">
                {currentPhoto.caption}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
              {currentPhoto.uploaderName && (
                <div className="flex items-center gap-2">
                  {currentPhoto.uploaderAvatar ? (
                    <img
                      src={currentPhoto.uploaderAvatar}
                      alt={currentPhoto.uploaderName}
                      className="w-5 h-5 rounded-full object-cover border border-white/40"
                    />
                  ) : (
                    <User className="w-4 h-4 text-blue-400" />
                  )}
                  <span className="font-medium text-white">{currentPhoto.uploaderName}</span>
                </div>
              )}

              {currentPhoto.uploadedAt && (
                <div className="flex items-center gap-1 text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{currentPhoto.uploadedAt}</span>
                </div>
              )}

              {/* Tags */}
              {currentPhoto.tags && currentPhoto.tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {currentPhoto.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-md bg-white/10 text-slate-200 text-[10px] font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Interaction Counter */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              type="button"
              onClick={() => onToggleLike(currentPhoto.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                currentPhoto.likedByMe
                  ? 'bg-rose-600 text-white border-rose-500 shadow-rose-600/30'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              }`}
            >
              <Heart
                className={`w-4 h-4 ${currentPhoto.likedByMe ? 'fill-current text-white' : ''}`}
              />
              <span>{currentPhoto.likesCount || 0}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
