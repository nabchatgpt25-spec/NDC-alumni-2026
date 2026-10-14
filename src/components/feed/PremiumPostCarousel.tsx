import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  LayoutGrid,
  Sparkles,
  Image as ImageIcon,
  ZoomIn,
  Layers,
  Check,
} from 'lucide-react';

export interface PremiumPostCarouselProps {
  images: string[];
  altPrefix?: string;
  onOpenLightbox?: (index: number) => void;
  className?: string;
  initialIndex?: number;
  showThumbnailStripDefault?: boolean;
}

export const PremiumPostCarousel: React.FC<PremiumPostCarouselProps> = ({
  images,
  altPrefix = 'Post photo',
  onOpenLightbox,
  className = '',
  initialIndex = 0,
  showThumbnailStripDefault = true,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [viewMode, setViewMode] = useState<'carousel' | 'collage'>('carousel');
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain');
  const [showThumbnails, setShowThumbnails] = useState(showThumbnailStripDefault);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Touch and drag swipe state
  const touchStartXRef = useRef<number | null>(null);
  const touchDeltaXRef = useRef<number>(0);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isSwiping, setIsSwiping] = useState(false);

  // Keep index within bounds if images change
  useEffect(() => {
    if (currentIndex >= images.length) {
      setCurrentIndex(Math.max(0, images.length - 1));
    }
  }, [images.length, currentIndex]);

  const total = images.length;
  const currentImg = images[currentIndex] || images[0];

  const handleNext = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (total <= 1) return;
      setCurrentIndex((prev) => (prev + 1) % total);
      setImageLoaded(false);
    },
    [total]
  );

  const handlePrev = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (total <= 1) return;
      setCurrentIndex((prev) => (prev - 1 + total) % total);
      setImageLoaded(false);
    },
    [total]
  );

  const handleJumpToIndex = (idx: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (idx < 0 || idx >= total) return;
    setCurrentIndex(idx);
    setImageLoaded(false);
  };

  // Touch swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (total <= 1) return;
    touchStartXRef.current = e.touches[0].clientX;
    touchDeltaXRef.current = 0;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || total <= 1) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartXRef.current;
    touchDeltaXRef.current = diff;
    // Dampen drag effect
    setDragOffset(diff * 0.35);
  };

  const handleTouchEnd = () => {
    if (touchStartXRef.current !== null && total > 1) {
      const diff = touchDeltaXRef.current;
      const swipeThreshold = 45; // 45px displacement to trigger slide
      if (diff < -swipeThreshold) {
        handleNext();
      } else if (diff > swipeThreshold) {
        handlePrev();
      }
    }
    touchStartXRef.current = null;
    touchDeltaXRef.current = 0;
    setDragOffset(0);
    setIsSwiping(false);
  };

  // Keyboard navigation when focused
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (total <= 1) return;
    if (e.key === 'ArrowRight') {
      handleNext();
    } else if (e.key === 'ArrowLeft') {
      handlePrev();
    }
  };

  if (!images || images.length === 0) {
    return null;
  }

  // Single Image Presentation
  if (total === 1) {
    return (
      <div className={`mb-4 ${className}`}>
        <div
          onClick={() => onOpenLightbox && onOpenLightbox(0)}
          className="relative group cursor-pointer overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-slate-950 shadow-xs hover:shadow-md transition-all duration-300"
        >
          <div className="relative w-full flex items-center justify-center bg-slate-900/60 min-h-[220px]">
            <img
              src={images[0]}
              alt={altPrefix}
              className="w-full max-h-[640px] sm:max-h-[760px] object-contain transition-transform duration-500 ease-out group-hover:scale-[1.01]"
              loading="lazy"
            />
          </div>

          {/* Interactive Zoom Hover Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3.5 sm:p-4 pointer-events-none">
            <span className="text-xs font-semibold text-white/95 flex items-center gap-1.5 drop-shadow-md">
              <ZoomIn className="w-4 h-4 text-white" />
              <span>Click to view full screen</span>
            </span>
            <span className="p-1.5 rounded-lg bg-white/20 backdrop-blur-xs text-white">
              <Maximize2 className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>
    );
  }

  // COLLAGE GRID MODE ("More premium than carousel")
  if (viewMode === 'collage') {
    return (
      <div className={`mb-4 space-y-2 ${className}`}>
        {/* Mode Toggle Header */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
            <LayoutGrid className="w-3.5 h-3.5 text-blue-500" />
            <span>Mosaic Grid View ({total} Photos)</span>
          </div>
          <button
            type="button"
            onClick={() => setViewMode('carousel')}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60 text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3 h-3" />
            <span>Switch to Carousel</span>
          </button>
        </div>

        {/* Dynamic Mosaic Grid based on photo count */}
        <div className="overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-slate-950 shadow-sm">
          {total === 2 && (
            <div className="grid grid-cols-2 gap-1 h-[280px] sm:h-[380px]">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  onClick={() => onOpenLightbox && onOpenLightbox(idx)}
                  className="relative group cursor-pointer overflow-hidden bg-slate-900 h-full"
                >
                  <img
                    src={img}
                    alt={`${altPrefix} ${idx + 1}`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <Maximize2 className="w-5 h-5 drop-shadow-md" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {total === 3 && (
            <div className="grid grid-cols-3 gap-1 h-[300px] sm:h-[400px]">
              <div
                onClick={() => onOpenLightbox && onOpenLightbox(0)}
                className="col-span-2 relative group cursor-pointer overflow-hidden bg-slate-900 h-full"
              >
                <img
                  src={images[0]}
                  alt={`${altPrefix} 1`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <Maximize2 className="w-6 h-6 drop-shadow-md" />
                </div>
              </div>
              <div className="grid grid-rows-2 gap-1 h-full">
                {images.slice(1, 3).map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => onOpenLightbox && onOpenLightbox(idx + 1)}
                    className="relative group cursor-pointer overflow-hidden bg-slate-900 h-full"
                  >
                    <img
                      src={img}
                      alt={`${altPrefix} ${idx + 2}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Maximize2 className="w-4 h-4 drop-shadow-md" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {total === 4 && (
            <div className="grid grid-cols-2 grid-rows-2 gap-1 h-[320px] sm:h-[420px]">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  onClick={() => onOpenLightbox && onOpenLightbox(idx)}
                  className="relative group cursor-pointer overflow-hidden bg-slate-900 h-full"
                >
                  <img
                    src={img}
                    alt={`${altPrefix} ${idx + 1}`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <Maximize2 className="w-5 h-5 drop-shadow-md" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {total >= 5 && (
            <div className="grid grid-cols-6 grid-rows-2 gap-1 h-[320px] sm:h-[440px]">
              {/* First row: 2 wide photos */}
              <div
                onClick={() => onOpenLightbox && onOpenLightbox(0)}
                className="col-span-3 relative group cursor-pointer overflow-hidden bg-slate-900 h-full"
              >
                <img
                  src={images[0]}
                  alt={`${altPrefix} 1`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <Maximize2 className="w-5 h-5 drop-shadow-md" />
                </div>
              </div>
              <div
                onClick={() => onOpenLightbox && onOpenLightbox(1)}
                className="col-span-3 relative group cursor-pointer overflow-hidden bg-slate-900 h-full"
              >
                <img
                  src={images[1]}
                  alt={`${altPrefix} 2`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <Maximize2 className="w-5 h-5 drop-shadow-md" />
                </div>
              </div>

              {/* Second row: 3 photos */}
              <div
                onClick={() => onOpenLightbox && onOpenLightbox(2)}
                className="col-span-2 relative group cursor-pointer overflow-hidden bg-slate-900 h-full"
              >
                <img
                  src={images[2]}
                  alt={`${altPrefix} 3`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <Maximize2 className="w-4 h-4 drop-shadow-md" />
                </div>
              </div>
              <div
                onClick={() => onOpenLightbox && onOpenLightbox(3)}
                className="col-span-2 relative group cursor-pointer overflow-hidden bg-slate-900 h-full"
              >
                <img
                  src={images[3]}
                  alt={`${altPrefix} 4`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <Maximize2 className="w-4 h-4 drop-shadow-md" />
                </div>
              </div>
              <div
                onClick={() => onOpenLightbox && onOpenLightbox(4)}
                className="col-span-2 relative group cursor-pointer overflow-hidden bg-slate-900 h-full"
              >
                <img
                  src={images[4]}
                  alt={`${altPrefix} 5`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                {total > 5 ? (
                  <div className="absolute inset-0 bg-black/65 backdrop-blur-xs flex flex-col items-center justify-center text-white transition-all group-hover:bg-black/50">
                    <span className="text-xl sm:text-2xl font-black tracking-tight">+{total - 4}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-200">More</span>
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <Maximize2 className="w-4 h-4 drop-shadow-md" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // CINEMATIC CAROUSEL MODE (Default)
  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={`mb-4 relative group select-none focus:outline-none ${className}`}
    >
      {/* Main Showcase Stage */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-slate-950 shadow-md h-[300px] xs:h-[360px] sm:h-[450px] md:h-[520px] transition-all"
      >
        {/* Dynamic Frosted Ambient Glow Backdrop */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img
            src={currentImg}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover blur-2xl scale-125 opacity-25 dark:opacity-35 transition-all duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/60" />
        </div>

        {/* Primary Interactive Image Frame */}
        <div
          onClick={() => onOpenLightbox && onOpenLightbox(currentIndex)}
          className="relative w-full h-full flex items-center justify-center cursor-pointer p-1"
          style={{
            transform: isSwiping ? `translateX(${dragOffset}px)` : 'translateX(0px)',
            transition: isSwiping ? 'none' : 'transform 0.25s ease-out',
          }}
        >
          <img
            key={currentIndex}
            src={currentImg}
            alt={`${altPrefix} ${currentIndex + 1} of ${total}`}
            onLoad={() => setImageLoaded(true)}
            className={`w-full h-full ${
              fitMode === 'cover' ? 'object-cover' : 'object-contain'
            } transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-90'}`}
            loading="lazy"
          />

          {/* Centered subtle expand hint on hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center justify-center">
            <span className="p-3 rounded-full bg-black/50 backdrop-blur-md text-white/90 shadow-xl border border-white/20 transform transition-transform group-hover:scale-105">
              <ZoomIn className="w-6 h-6" />
            </span>
          </div>
        </div>

        {/* Top Control Bar (Pills & Badges) */}
        <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none z-10">
          {/* Top Left: Mode & Fit Toggles */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            {/* Collage Grid Toggle */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setViewMode('collage');
              }}
              title="Switch to Mosaic Grid"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md text-white text-xs font-bold border border-white/15 shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden xs:inline">Grid View</span>
            </button>

            {/* Fit Mode Toggle */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFitMode((prev) => (prev === 'contain' ? 'cover' : 'contain'));
              }}
              title={fitMode === 'contain' ? 'Fill Frame (Crop)' : 'Fit Whole Image'}
              className="p-1.5 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md text-white border border-white/15 shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-slate-300" />
            </button>
          </div>

          {/* Top Right: Counter Badge & Fullscreen Expand */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            {/* Photo Counter Pill */}
            <div className="px-3 py-1 rounded-full bg-black/65 backdrop-blur-md text-white text-xs font-extrabold border border-white/15 shadow-lg flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
              <span>
                {currentIndex + 1} / {total}
              </span>
            </div>

            {/* Lightbox Direct Trigger */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenLightbox && onOpenLightbox(currentIndex);
              }}
              title="Full Screen Lightbox"
              className="p-1.5 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md text-white border border-white/15 shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Floating Left Navigation Arrow */}
        <button
          type="button"
          onClick={handlePrev}
          title="Previous photo"
          aria-label="Previous photo"
          className="absolute left-2.5 sm:left-3.5 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-full bg-black/55 hover:bg-black/85 text-white backdrop-blur-md border border-white/20 shadow-xl transition-all duration-200 hover:scale-110 active:scale-95 z-10 cursor-pointer opacity-90 sm:opacity-0 sm:group-hover:opacity-100"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Floating Right Navigation Arrow */}
        <button
          type="button"
          onClick={handleNext}
          title="Next photo"
          aria-label="Next photo"
          className="absolute right-2.5 sm:right-3.5 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-full bg-black/55 hover:bg-black/85 text-white backdrop-blur-md border border-white/20 shadow-xl transition-all duration-200 hover:scale-110 active:scale-95 z-10 cursor-pointer opacity-90 sm:opacity-0 sm:group-hover:opacity-100"
        >
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Bottom Bar: Interactive Pagination Dots */}
        <div className="absolute bottom-3 inset-x-0 flex flex-col items-center gap-2 pointer-events-none z-10">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 shadow-lg pointer-events-auto">
            {images.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => handleJumpToIndex(idx, e)}
                title={`Go to photo ${idx + 1}`}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  idx === currentIndex
                    ? 'w-6 h-2 bg-blue-500 shadow-md ring-1 ring-white/50'
                    : 'w-2 h-2 bg-white/40 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Bottom Mini-Thumbnail Filmstrip ("More premium than carousel") */}
      {total > 1 && showThumbnails && (
        <div className="mt-2.5 flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 px-0.5 custom-scrollbar">
          {images.map((thumbUrl, idx) => {
            const isActive = idx === currentIndex;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleJumpToIndex(idx)}
                className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden shrink-0 transition-all duration-200 cursor-pointer border-2 ${
                  isActive
                    ? 'border-blue-500 ring-2 ring-blue-400/40 scale-105 shadow-md'
                    : 'border-transparent opacity-60 hover:opacity-100 hover:scale-100'
                }`}
              >
                <img
                  src={thumbUrl}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {isActive && (
                  <div className="absolute inset-0 bg-blue-500/10 pointer-events-none" />
                )}
                <span className="absolute bottom-0.5 right-0.5 px-1 rounded-sm bg-black/75 text-[9px] font-extrabold text-white leading-tight">
                  {idx + 1}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
