import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Plus,
  Play,
  Share2,
  Download,
  Heart,
  Grid3X3,
  LayoutGrid,
  Film,
  Sparkles,
  Check,
  Tag,
  Maximize2,
  Eye,
  Camera,
  Layers
} from 'lucide-react';
import { GalleryAlbum, GalleryPhoto } from '../../types';

interface AlbumShowcaseViewProps {
  album: GalleryAlbum;
  onBack: () => void;
  onOpenLightbox: (index: number) => void;
  onToggleLike: (photoId: string) => void;
  onRequestUpload: (albumId: number) => void;
  onStartSlideshow: () => void;
}

export const AlbumShowcaseView: React.FC<AlbumShowcaseViewProps> = ({
  album,
  onBack,
  onOpenLightbox,
  onToggleLike,
  onRequestUpload,
  onStartSlideshow,
}) => {
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [viewLayout, setViewLayout] = useState<'masonry' | 'grid' | 'filmstrip'>('masonry');
  const [filmstripIndex, setFilmstripIndex] = useState<number>(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Extract all unique tags in this album's photos
  const availableTags = useMemo(() => {
    const tagsSet = new Set<string>();
    album.photos.forEach((photo) => {
      photo.tags?.forEach((t) => tagsSet.add(t));
    });
    return ['All', ...Array.from(tagsSet)];
  }, [album.photos]);

  // Filtered photos by tag
  const displayedPhotos = useMemo(() => {
    if (selectedTag === 'All') return album.photos;
    return album.photos.filter((p) => p.tags?.includes(selectedTag));
  }, [album.photos, selectedTag]);

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleDownloadAll = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      alert(`Downloading ${album.photos.length} high-resolution photographs from "${album.title}"`);
    }, 1200);
  };

  const categoryBadgeColors: Record<string, string> = {
    reunion: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    academic: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    campus: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    convocation: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    sports: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    cultural: 'bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300 border-pink-200 dark:border-pink-800',
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* 1. Breadcrumb & Navigation Bar */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-blue-600" />
          <span>Back to All Albums</span>
        </button>

        <div className="flex items-center gap-2">
          <span
            className={`text-[11px] font-extrabold uppercase px-3 py-1 rounded-full border ${
              categoryBadgeColors[album.category] ||
              'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200'
            }`}
          >
            {album.category}
          </span>
          <span className="text-xs font-bold text-slate-400">
            {album.photos.length} Photographs
          </span>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. Cinematic Showcase Hero Header */}
      {/* ------------------------------------------------------------- */}
      <div className="relative rounded-3xl overflow-hidden shadow-lg border border-slate-200/80 dark:border-slate-800 bg-slate-900 text-white min-h-[340px] flex flex-col justify-end">
        {/* Background Cover Image with Rich Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src={album.coverUrl}
            alt={album.title}
            className="w-full h-full object-cover opacity-60 scale-102 filter blur-0 brightness-85"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/40 to-transparent" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 p-6 sm:p-8 md:p-10 max-w-4xl space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-blue-300">
            <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>{album.date}</span>
            </div>

            {album.location && (
              <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                <span>{album.location}</span>
              </div>
            )}

            {album.batchYear && album.batchYear > 0 ? (
              <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>Batch {album.batchYear} Dedicated</span>
              </div>
            ) : null}
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
            {album.title}
          </h1>

          {album.description && (
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              {album.description}
            </p>
          )}

          {/* Action Toolbar */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onStartSlideshow}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold rounded-2xl shadow-md transition-all flex items-center gap-2 cursor-pointer scale-100 hover:scale-102"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Play Slideshow</span>
            </button>

            <button
              type="button"
              onClick={() => onRequestUpload(album.id)}
              className="px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white backdrop-blur-md border border-white/20 text-xs font-bold rounded-2xl transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Contribute Photos</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-colors cursor-pointer border border-white/10"
              title="Share album link"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={handleDownloadAll}
              disabled={downloading}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-colors cursor-pointer border border-white/10"
              title="Download album zip"
            >
              <Download className="w-4 h-4" />
            </button>

            {copiedLink && (
              <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-xl border border-emerald-800">
                Link copied to clipboard!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. Showcase Controls & Tag Filters */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        {/* Tag Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-1 flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-blue-500" />
            <span>Tags:</span>
          </span>
          {availableTags.map((tag) => {
            const active = selectedTag === tag;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(tag)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                  active
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>

        {/* View Layout Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl shrink-0 self-end sm:self-center">
          <button
            type="button"
            onClick={() => setViewLayout('masonry')}
            title="Masonry Grid"
            className={`p-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewLayout === 'masonry'
                ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewLayout('grid')}
            title="Square Mosaic Grid"
            className={`p-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewLayout === 'grid'
                ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewLayout('filmstrip')}
            title="Filmstrip Stage"
            className={`p-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewLayout === 'filmstrip'
                ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Film className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. Filmstrip Stage Mode (Optional) */}
      {/* ------------------------------------------------------------- */}
      {viewLayout === 'filmstrip' && displayedPhotos.length > 0 && (
        <div className="bg-slate-900 rounded-3xl p-4 sm:p-6 text-white space-y-4 shadow-xl border border-slate-800">
          <div className="relative h-[380px] sm:h-[480px] rounded-2xl overflow-hidden bg-black flex items-center justify-center">
            <img
              src={displayedPhotos[filmstripIndex]?.url}
              alt={displayedPhotos[filmstripIndex]?.caption}
              className="max-h-full max-w-full object-contain cursor-pointer"
              onClick={() => {
                const origIndex = album.photos.findIndex(
                  (p) => p.id === displayedPhotos[filmstripIndex]?.id
                );
                onOpenLightbox(origIndex >= 0 ? origIndex : 0);
              }}
            />
            {displayedPhotos[filmstripIndex]?.caption && (
              <div className="absolute bottom-3 inset-x-4 p-3 bg-black/60 backdrop-blur-md rounded-xl text-xs font-medium text-slate-200 text-center">
                {displayedPhotos[filmstripIndex]?.caption}
              </div>
            )}
          </div>

          {/* Filmstrip Strip */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {displayedPhotos.map((photo, idx) => {
              const active = idx === filmstripIndex;
              return (
                <div
                  key={photo.id}
                  onClick={() => setFilmstripIndex(idx)}
                  className={`relative w-20 h-20 rounded-xl overflow-hidden shrink-0 cursor-pointer border-2 transition-all ${
                    active
                      ? 'border-blue-500 scale-105 ring-2 ring-blue-500/30'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={photo.url} alt="Thumbnail" className="w-full h-full object-cover" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. Masonry & Square Mosaic Photography Wall */}
      {/* ------------------------------------------------------------- */}
      {viewLayout !== 'filmstrip' && (
        <div
          className={`grid gap-4 sm:gap-5 ${
            viewLayout === 'grid'
              ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {displayedPhotos.map((photo, index) => {
            const originalIndex = album.photos.findIndex((p) => p.id === photo.id);
            return (
              <div
                key={photo.id}
                className="group relative bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col"
              >
                {/* Photo Image Container */}
                <div
                  className={`relative overflow-hidden cursor-pointer ${
                    viewLayout === 'grid' ? 'aspect-square' : 'h-64 sm:h-72'
                  }`}
                  onClick={() => onOpenLightbox(originalIndex >= 0 ? originalIndex : index)}
                >
                  <img
                    src={photo.url}
                    alt={photo.caption || 'Notre Dame Memory'}
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                    loading="lazy"
                  />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent opacity-80 group-hover:opacity-95 transition-opacity" />

                  {/* Zoom hint on hover */}
                  <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 className="w-4 h-4" />
                  </div>

                  {/* Caption & Uploader on Card Bottom */}
                  <div className="absolute bottom-3 left-3 right-3 text-white space-y-1">
                    {photo.caption && (
                      <p className="text-xs font-bold leading-snug line-clamp-2">
                        {photo.caption}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1 text-[11px] text-slate-300">
                      <div className="flex items-center gap-1.5 truncate">
                        {photo.uploaderAvatar && (
                          <img
                            src={photo.uploaderAvatar}
                            alt={photo.uploaderName}
                            className="w-4 h-4 rounded-full object-cover shrink-0 border border-white/40"
                          />
                        )}
                        <span className="truncate">{photo.uploaderName || 'Alumnus'}</span>
                      </div>
                      {photo.batchYear && (
                        <span className="px-1.5 py-0.2 rounded bg-blue-600/80 text-white text-[9px] font-bold shrink-0">
                          B{photo.batchYear}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Interaction Footer */}
                <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {photo.tags?.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-semibold"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {/* Like Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleLike(photo.id);
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      photo.likedByMe
                        ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/40'
                        : 'text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${
                        photo.likedByMe ? 'fill-current text-rose-600' : ''
                      }`}
                    />
                    <span>{photo.likesCount || 0}</span>
                  </button>
                </div>
              </div>
            );
          })}

          {/* Add Photos Prompt Card */}
          <div
            onClick={() => onRequestUpload(album.id)}
            className="group rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50/70 dark:bg-slate-900/40 p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:scale-101 min-h-[260px]"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Camera className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Have Photos From This Event?
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-[220px]">
              Contribute your snaps to enrich the batch memory wall.
            </p>
            <span className="mt-3 px-3 py-1 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xs">
              + Upload to Album
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
