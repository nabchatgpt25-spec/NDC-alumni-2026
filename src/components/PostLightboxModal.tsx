import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Download,
  RotateCw,
  Share2,
  Calendar,
  User,
  ShieldCheck
} from 'lucide-react';

export interface PostLightboxProps {
  isOpen: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
  postAuthor?: {
    fullName: string;
    avatarUrl: string;
    batchYear?: number;
    createdAt?: string;
  };
  postCaption?: string;
}

export const PostLightboxModal: React.FC<PostLightboxProps> = ({
  isOpen,
  images,
  initialIndex = 0,
  onClose,
  postAuthor,
  postCaption,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDetails, setShowDetails] = useState(true);

  // Sync index when initialIndex changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.max(0, Math.min(initialIndex, images.length - 1)));
      setZoomLevel(1);
      setRotation(0);
    }
  }, [isOpen, initialIndex, images.length]);

  const handleNext = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % images.length);
    setZoomLevel(1);
    setRotation(0);
  }, [images.length]);

  const handlePrev = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    setZoomLevel(1);
    setRotation(0);
  }, [images.length]);

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.25, 0.75));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setRotation(0);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  const handleDownload = () => {
    const currentImg = images[currentIndex];
    if (!currentImg) return;
    const a = document.createElement('a');
    a.href = currentImg;
    a.download = `ndc-media-${Date.now()}-${currentIndex + 1}.jpg`;
    a.target = '_blank';
    a.rel = 'noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      } else if (e.key === '0') {
        handleResetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Prevent scrolling behind modal
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose, handleNext, handlePrev]);

  if (!isOpen || images.length === 0) return null;

  const currentImg = images[currentIndex] || images[0];

  return (
    <div
      id="post-media-lightbox"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md select-none transition-opacity duration-300"
      onClick={(e) => {
        // Close if clicking the outer backdrop directly
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Top Header Bar */}
      <div className="absolute top-0 inset-x-0 p-3 sm:p-4.5 flex items-center justify-between z-30 bg-gradient-to-b from-black/85 via-black/50 to-transparent text-white gap-2">
        {/* Author / Post Info */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {postAuthor ? (
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <img
                src={postAuthor.avatarUrl}
                alt={postAuthor.fullName}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover ring-2 ring-blue-500/40 shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1 sm:gap-1.5 font-bold text-xs sm:text-sm text-white truncate">
                  <span className="truncate">{postAuthor.fullName}</span>
                  <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400 shrink-0" />
                </div>
                <div className="text-[10px] sm:text-[11px] text-slate-300 flex items-center gap-1.5 sm:gap-2 truncate">
                  {postAuthor.batchYear && (
                    <span className="font-semibold text-blue-300 shrink-0">Batch {postAuthor.batchYear}</span>
                  )}
                  {postAuthor.createdAt && (
                    <span className="truncate">· {postAuthor.createdAt}</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <span className="font-bold text-xs sm:text-sm text-slate-200 truncate">Notre Dame Alumni Media</span>
          )}

          {images.length > 1 && (
            <span className="hidden min-[480px]:inline-flex ml-1 sm:ml-2 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-blue-500/20 text-blue-300 text-[10px] sm:text-xs font-bold border border-blue-500/30 whitespace-nowrap shrink-0">
              {currentIndex + 1} of {images.length}
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Zoom controls */}
          <div className="hidden sm:flex items-center bg-white/10 rounded-xl p-1 backdrop-blur-sm border border-white/10">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 0.75}
              title="Zoom Out (-)"
              className="p-1.5 text-slate-200 hover:text-white hover:bg-white/15 disabled:opacity-30 rounded-lg transition-colors cursor-pointer"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              title="Reset Zoom (0)"
              className="px-2 text-xs font-semibold text-slate-200 hover:text-white"
            >
              {Math.round(zoomLevel * 100)}%
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 3}
              title="Zoom In (+)"
              className="p-1.5 text-slate-200 hover:text-white hover:bg-white/15 disabled:opacity-30 rounded-lg transition-colors cursor-pointer"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Rotate */}
          <button
            type="button"
            onClick={handleRotate}
            title="Rotate image 90°"
            className="p-2 text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-colors cursor-pointer"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Fullscreen toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className="hidden sm:inline-flex p-2 text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-colors cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Download button */}
          <button
            type="button"
            onClick={handleDownload}
            title="Download Image"
            className="p-2 text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Close Modal Button */}
          <button
            type="button"
            id="close-lightbox-btn"
            onClick={onClose}
            title="Close Lightbox (Esc)"
            className="p-2 text-white bg-white/15 hover:bg-rose-600 rounded-xl transition-colors cursor-pointer ml-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div
        className="relative w-full h-full flex items-center justify-center p-4 sm:p-12 overflow-hidden"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div
          className="relative max-w-full max-h-full flex items-center justify-center transition-transform duration-200 ease-out"
          style={{
            transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
          }}
        >
          <img
            id="lightbox-active-media"
            src={currentImg}
            alt={postCaption || 'Post attached media'}
            className="max-w-[92vw] max-h-[80vh] object-contain rounded-lg shadow-2xl transition-all select-none"
            draggable={false}
          />
        </div>

        {/* Previous Button */}
        {images.length > 1 && (
          <button
            type="button"
            id="lightbox-prev-btn"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            title="Previous Image (Left Arrow)"
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 p-3 sm:p-3.5 rounded-full bg-black/60 hover:bg-blue-600 text-white border border-white/20 backdrop-blur-md shadow-xl transition-all cursor-pointer hover:scale-105"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Next Button */}
        {images.length > 1 && (
          <button
            type="button"
            id="lightbox-next-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            title="Next Image (Right Arrow)"
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 p-3 sm:p-3.5 rounded-full bg-black/60 hover:bg-blue-600 text-white border border-white/20 backdrop-blur-md shadow-xl transition-all cursor-pointer hover:scale-105"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Information & Thumbnails Bar */}
      <div className="absolute bottom-0 inset-x-0 p-3 sm:p-4 z-30 bg-gradient-to-t from-black/90 via-black/60 to-transparent text-white flex flex-col items-center">
        {/* Caption Snippet */}
        {postCaption && showDetails && (
          <div className="max-w-2xl text-center mb-2.5 px-4">
            <p className="text-xs sm:text-sm text-slate-200 line-clamp-2 leading-relaxed bg-black/40 px-3.5 py-1.5 rounded-xl border border-white/10 backdrop-blur-sm">
              "{postCaption}"
            </p>
          </div>
        )}

        {/* Thumbnail Filmstrip (if multiple images) */}
        {images.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto max-w-[90vw] py-1 px-2 no-scrollbar">
            {images.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setCurrentIndex(idx);
                  setZoomLevel(1);
                  setRotation(0);
                }}
                className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                  idx === currentIndex
                    ? 'border-blue-500 scale-105 shadow-md shadow-blue-500/50 ring-2 ring-blue-400/40'
                    : 'border-white/20 opacity-60 hover:opacity-100'
                }`}
              >
                <img
                  src={img}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        {/* Keyboard hints */}
        <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-400 mt-1">
          <span>Esc: Close</span>
          {images.length > 1 && <span>← / →: Navigate</span>}
          <span>+/-: Zoom</span>
        </div>
      </div>
    </div>
  );
};
