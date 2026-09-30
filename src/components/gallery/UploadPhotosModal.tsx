import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  Video,
  FolderPlus,
  Trash2,
  CheckCircle2,
  Link2,
  Sparkles,
  Layers,
  ArrowRight,
  Film,
  Play
} from 'lucide-react';
import { GalleryAlbum, GalleryPhoto } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { saveMediaFile, isVideoFile, isVideoUrl, formatFileSize } from '../../utils/mediaStorage';

interface UploadPhotosModalProps {
  isOpen: boolean;
  onClose: () => void;
  albums: GalleryAlbum[];
  selectedAlbumId?: number;
  onUploadPhotos: (albumId: number, photos: GalleryPhoto[]) => void;
  onRequestCreateAlbum: () => void;
}

interface PendingUpload {
  id: string;
  url: string;
  caption: string;
  tags: string;
  isVideo: boolean;
  formattedSize: string;
}

export const UploadPhotosModal: React.FC<UploadPhotosModalProps> = ({
  isOpen,
  onClose,
  albums,
  selectedAlbumId,
  onUploadPhotos,
  onRequestCreateAlbum,
}) => {
  const { currentUser } = useAuth();
  const [targetAlbumId, setTargetAlbumId] = useState<number>(
    selectedAlbumId || (albums[0] ? albums[0].id : 1)
  );
  const [pendingPhotos, setPendingPhotos] = useState<PendingUpload[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [contributorName, setContributorName] = useState<string>(
    currentUser?.fullName || 'Notre Dame Alumnus'
  );
  const [contributorBatch, setContributorBatch] = useState<number>(
    currentUser?.batchYear || 58
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      try {
        const isVideo = isVideoFile(file);
        const saved = await saveMediaFile(file);
        setPendingPhotos((prev) => [
          ...prev,
          {
            id: saved.id,
            url: saved.url,
            caption: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
            tags: isVideo ? 'Video, Memories, NDC' : 'Alumni, Campus, Photo',
            isVideo,
            formattedSize: saved.formattedSize,
          },
        ]);
      } catch (err) {
        console.warn('Failed to process file, fallback to blob URL', err);
        const isVideo = isVideoFile(file);
        const url = URL.createObjectURL(file);
        setPendingPhotos((prev) => [
          ...prev,
          {
            id: `media-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            url,
            caption: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
            tags: isVideo ? 'Video, Campus' : 'Alumni, Photo',
            isVideo,
            formattedSize: formatFileSize(file.size),
          },
        ]);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleAddUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    const isVideo = isVideoUrl(urlInput.trim());
    setPendingPhotos((prev) => [
      ...prev,
      {
        id: `url-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        url: urlInput.trim(),
        caption: isVideo ? 'Alumni Video Memory' : 'Alumni photograph contribution',
        tags: isVideo ? 'Video, Reunion' : 'Reunion, Batch',
        isVideo,
        formattedSize: 'External Link',
      },
    ]);
    setUrlInput('');
  };

  const handleRemovePending = (id: string) => {
    setPendingPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const handleUpdateCaption = (id: string, newCaption: string) => {
    setPendingPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, caption: newCaption } : p))
    );
  };

  const handleUploadSubmit = () => {
    if (pendingPhotos.length === 0) return;

    setIsUploading(true);
    setUploadProgress(15);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          setTimeout(() => {
            const formattedPhotos: GalleryPhoto[] = pendingPhotos.map((p) => ({
              id: p.id,
              url: p.url,
              caption: p.caption.trim() || (p.isVideo ? 'Notre Dame Video Memory' : 'Notre Dame Alumni Memory'),
              uploaderName: contributorName.trim() || currentUser?.fullName || 'Notre Dame Alumnus',
              uploaderAvatar:
                currentUser?.avatarUrl ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
              batchYear: contributorBatch || currentUser?.batchYear || 58,
              uploadedAt: 'Just now',
              likesCount: 1,
              likedByMe: true,
              mediaType: p.isVideo ? 'video' : 'image',
              fileSize: p.formattedSize,
              tags: p.tags
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean),
            }));

            onUploadPhotos(targetAlbumId, formattedPhotos);
            setIsUploading(false);
            setPendingPhotos([]);
            setUploadProgress(0);
            onClose();
          }, 300);
          return 100;
        }
        return prev + 25;
      });
    }, 120);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Upload Photos & Videos</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-extrabold uppercase">
                  Any Size
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Anyone can contribute high-resolution photos and video clips of any size to alumni albums.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Target Album Selection */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/40">
            <div className="min-w-0 flex-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Destination Album:
              </label>
              <select
                value={targetAlbumId}
                onChange={(e) => setTargetAlbumId(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {albums.map((album) => (
                  <option key={album.id} value={album.id}>
                    📁 {album.title} ({album.photosCount} items)
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onRequestCreateAlbum();
              }}
              className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-blue-600 hover:text-white border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors shrink-0 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>+ New Album</span>
            </button>
          </div>

          {/* Contributor Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/70 dark:border-slate-800">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Contributor Name
              </label>
              <input
                type="text"
                value={contributorName}
                onChange={(e) => setContributorName(e.target.value)}
                placeholder="Your Name (Alumni or Guest)"
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Batch Year
              </label>
              <input
                type="number"
                value={contributorBatch}
                onChange={(e) => setContributorBatch(Number(e.target.value))}
                placeholder="e.g. 58"
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Drag & Drop Upload Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 scale-101'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 hover:border-blue-400'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <ImageIcon className="w-6 h-6" />
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Video className="w-6 h-6" />
              </div>
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Drag & Drop your photos and videos here
            </p>
            <p className="text-xs text-slate-400 mt-1">
              or <span className="text-blue-600 dark:text-blue-400 font-semibold underline">browse from your computer</span> (Photos, Videos — Any Size, No Limit)
            </p>
            <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-full bg-slate-200/70 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                JPG, PNG, WEBP, GIF, RAW
              </span>
              <span className="px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                MP4, WEBM, MOV, MKV, AVI
              </span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                Unlimited Size
              </span>
            </div>
          </div>

          {/* Direct URL Input Tab */}
          <div className="pt-2">
            <div className="flex items-center gap-2 mb-1.5">
              <Link2 className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                Or paste direct image or video URL
              </span>
            </div>
            <form onSubmit={handleAddUrl} className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://... photo or video link"
                className="flex-1 px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="submit"
                disabled={!urlInput.trim()}
                className="px-4 py-2 bg-slate-800 hover:bg-black text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-40 cursor-pointer"
              >
                Add Link
              </button>
            </form>
          </div>

          {/* Pending Photos/Videos Preview List */}
          {pendingPhotos.length > 0 && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Ready to Upload ({pendingPhotos.length} item{pendingPhotos.length === 1 ? '' : 's'})
                </span>
                <button
                  type="button"
                  onClick={() => setPendingPhotos([])}
                  className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                >
                  Clear All
                </button>
              </div>

              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {pendingPhotos.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70"
                  >
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 bg-black flex items-center justify-center">
                      {item.isVideo ? (
                        <>
                          <video
                            src={item.url}
                            className="w-full h-full object-cover"
                            muted
                            playsInline
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Film className="w-5 h-5 text-white drop-shadow" />
                          </div>
                        </>
                      ) : (
                        <img
                          src={item.url}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      )}
                      <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 bg-black/75 rounded text-[8px] font-bold text-white uppercase">
                        {item.isVideo ? 'VID' : 'PIC'}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <input
                        type="text"
                        value={item.caption}
                        onChange={(e) => handleUpdateCaption(item.id, e.target.value)}
                        placeholder="Add caption or memory note..."
                        className="w-full px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                      />
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span>{item.formattedSize}</span>
                        <span>•</span>
                        <span>{item.isVideo ? 'Video Clip' : 'Photograph'}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemovePending(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-100 dark:border-blue-900/40 space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-blue-700 dark:text-blue-300">
                <span>Saving & Optimizing Media to Persistent Storage...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-blue-200 dark:bg-blue-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-200 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUploadSubmit}
              disabled={pendingPhotos.length === 0 || isUploading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>
                {isUploading
                  ? 'Publishing...'
                  : `Publish ${pendingPhotos.length > 0 ? `(${pendingPhotos.length})` : ''} to Album`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
