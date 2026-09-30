import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  Link as LinkIcon,
  Check,
  RotateCcw,
  Camera,
  AlertCircle
} from 'lucide-react';
import { saveMediaFile, formatFileSize } from '../utils/mediaStorage';

export type PhotoType = 'avatar' | 'cover';

interface PhotoChangeModalProps {
  isOpen: boolean;
  type: PhotoType;
  currentUrl: string;
  fullName?: string;
  onClose: () => void;
  onSave: (newUrl: string) => void;
}

// Curated high quality professional presets
const AVATAR_PRESETS = [
  {
    label: 'Corporate Professional',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
  },
  {
    label: 'Tech & Engineering Lead',
    url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80',
  },
  {
    label: 'Executive Leader',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
  },
  {
    label: 'Academic & Researcher',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  },
  {
    label: 'Business Strategist',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
  },
  {
    label: 'Innovation Specialist',
    url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80',
  },
  {
    label: 'Senior Consultant',
    url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&auto=format&fit=crop&q=80',
  },
  {
    label: 'Young Graduate',
    url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80',
  },
];

const COVER_PRESETS = [
  {
    label: 'Notre Dame College Campus & Grounds',
    url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&auto=format&fit=crop&q=80',
  },
  {
    label: 'Academic Building & Quadrangle',
    url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&auto=format&fit=crop&q=80',
  },
  {
    label: 'Science Laboratory & Research Desk',
    url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=1200&auto=format&fit=crop&q=80',
  },
  {
    label: 'College Library & Study Hall',
    url: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1200&auto=format&fit=crop&q=80',
  },
  {
    label: 'Auditorium & Cultural Hall',
    url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1200&auto=format&fit=crop&q=80',
  },
  {
    label: 'Notre Dame Classic Blue & Gold Gradient',
    url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&auto=format&fit=crop&q=80',
  },
];

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80';
const DEFAULT_COVER = 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=1200&auto=format&fit=crop&q=80';

export const PhotoChangeModal: React.FC<PhotoChangeModalProps> = ({
  isOpen,
  type,
  currentUrl,
  fullName = 'Alumnus',
  onClose,
  onSave,
}) => {
  const [activeSourceTab, setActiveSourceTab] = useState<'upload' | 'preset' | 'url'>('upload');
  const [previewUrl, setPreviewUrl] = useState<string>(currentUrl || (type === 'avatar' ? DEFAULT_AVATAR : DEFAULT_COVER));
  const [urlInput, setUrlInput] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const isAvatar = type === 'avatar';
  const title = isAvatar ? 'Change Profile Picture' : 'Change Cover Photo';
  const description = isAvatar
    ? 'Upload a photo, choose an avatar, or paste an image link.'
    : 'Upload a banner, choose a Notre Dame campus preset, or paste an image link.';

  const handleFileProcess = async (file: File) => {
    setFileError(null);
    if (!file.type.startsWith('image/')) {
      setFileError('Please select a valid image file (JPG, PNG, WEBP, GIF, SVG, BMP, RAW).');
      return;
    }

    try {
      // Store in high-capacity IndexedDB storage - supports ANY size without quota limits
      const saved = await saveMediaFile(file);
      setPreviewUrl(saved.url);
    } catch {
      // Fallback to object URL
      if (typeof window !== 'undefined' && window.URL) {
        setPreviewUrl(window.URL.createObjectURL(file));
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result && typeof e.target.result === 'string') {
            setPreviewUrl(e.target.result);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleApplyUrl = () => {
    if (!urlInput.trim()) return;
    setPreviewUrl(urlInput.trim());
    setFileError(null);
  };

  const handleResetDefault = () => {
    const defaultUrl = isAvatar ? DEFAULT_AVATAR : DEFAULT_COVER;
    setPreviewUrl(defaultUrl);
    setUrlInput('');
    setFileError(null);
  };

  const handleConfirmSave = () => {
    if (!previewUrl) return;
    onSave(previewUrl);
    onClose();
  };

  const presets = isAvatar ? AVATAR_PRESETS : COVER_PRESETS;

  return (
    <div
      id="photo-change-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="photo-change-modal-card"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                {title}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {description}
              </p>
            </div>
          </div>
          <button
            type="button"
            id="close-photo-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {/* Live Preview Box */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Preview
            </label>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex flex-col items-center justify-center">
              {isAvatar ? (
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={previewUrl}
                      alt={fullName}
                      onError={() => {
                        setFileError('Unable to load this image. Please verify the URL or choose another image.');
                      }}
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover ring-4 ring-white dark:ring-slate-800 shadow-md bg-white"
                    />
                    <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-800" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {fullName}
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                      Notre Dame Alumni Network
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Live profile photo preview
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full">
                  <div
                    className="w-full h-32 sm:h-40 rounded-xl bg-cover bg-center border border-slate-200 dark:border-slate-700 overflow-hidden relative shadow-inner"
                    style={{
                      backgroundImage: `url(${previewUrl})`,
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute bottom-3 left-3 text-white text-xs font-bold drop-shadow-sm">
                      Cover Banner Preview
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {fileError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{fileError}</span>
            </div>
          )}

          {/* Source Tabs */}
          <div>
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-3">
              <button
                type="button"
                id="photo-tab-upload"
                onClick={() => setActiveSourceTab('upload')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeSourceTab === 'upload'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload File</span>
              </button>

              <button
                type="button"
                id="photo-tab-preset"
                onClick={() => setActiveSourceTab('preset')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeSourceTab === 'preset'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Professional Presets</span>
              </button>

              <button
                type="button"
                id="photo-tab-url"
                onClick={() => setActiveSourceTab('url')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeSourceTab === 'url'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Image Link</span>
              </button>
            </div>

            {/* TAB 1: UPLOAD LOCAL FILE */}
            {activeSourceTab === 'upload' && (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 bg-slate-50/50 dark:bg-slate-800/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Click to browse or drag & drop photo here
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Supports any image format & any file size without restriction
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="mt-3.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose Photo from Device</span>
                </button>
              </div>
            )}

            {/* TAB 2: PRESET GALLERY */}
            {activeSourceTab === 'preset' && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-48 overflow-y-auto p-1">
                  {presets.map((item, idx) => {
                    const isSelected = previewUrl === item.url;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setPreviewUrl(item.url);
                          setFileError(null);
                        }}
                        className={`relative rounded-xl overflow-hidden border-2 text-left group transition-all p-0.5 ${
                          isSelected
                            ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div
                          className={`w-full ${
                            isAvatar ? 'h-20 sm:h-22' : 'h-16'
                          } bg-cover bg-center rounded-lg relative overflow-hidden`}
                          style={{ backgroundImage: `url(${item.url})` }}
                        >
                          {isSelected && (
                            <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                        <div className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 px-1 py-1 truncate">
                          {item.label}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: IMAGE LINK / URL */}
            {activeSourceTab === 'url' && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      placeholder="Paste image web address (https://...)"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyUrl}
                    disabled={!urlInput.trim()}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Preview
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Tip: You can use direct image links from Unsplash, Imgur, or cloud storage.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            id="reset-photo-default-btn"
            onClick={handleResetDefault}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-xl transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Default</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="cancel-photo-modal-btn"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              id="apply-save-photo-btn"
              onClick={handleConfirmSave}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Apply & Save</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
