import React, { useState } from 'react';
import {
  X,
  Plus,
  Image as ImageIcon,
  FolderPlus,
  Calendar,
  MapPin,
  Tag,
  Check,
  UploadCloud,
  Link2
} from 'lucide-react';
import { GalleryAlbum } from '../../types';

interface CreateAlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateAlbum: (album: GalleryAlbum) => void;
}

const PRESET_COVERS = [
  {
    label: 'Grand Banquet',
    url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1000&auto=format&fit=crop&q=80',
  },
  {
    label: 'Professional Conference',
    url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1000&auto=format&fit=crop&q=80',
  },
  {
    label: 'Campus Quad',
    url: 'https://images.unsplash.com/photo-1562774053-701939374585?w=1000&auto=format&fit=crop&q=80',
  },
  {
    label: 'Convocation Gowns',
    url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1000&auto=format&fit=crop&q=80',
  },
  {
    label: 'Sports Stadium',
    url: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=1000&auto=format&fit=crop&q=80',
  },
  {
    label: 'Library & Study',
    url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1000&auto=format&fit=crop&q=80',
  },
];

export const CreateAlbumModal: React.FC<CreateAlbumModalProps> = ({
  isOpen,
  onClose,
  onCreateAlbum,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<GalleryAlbum['category']>('reunion');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('NDC Campus, Motijheel, Dhaka');
  const [batchYear, setBatchYear] = useState<number>(0);
  const [selectedCover, setSelectedCover] = useState<string>(PRESET_COVERS[0].url);
  const [customCoverUrl, setCustomCoverUrl] = useState('');
  const [coverSourceMode, setCoverSourceMode] = useState<'preset' | 'custom' | 'file'>('preset');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        if (result) {
          setSelectedCover(result);
          setCoverSourceMode('file');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const finalCover =
      coverSourceMode === 'custom' && customCoverUrl.trim()
        ? customCoverUrl.trim()
        : selectedCover;

    const newAlbum: GalleryAlbum = {
      id: Date.now(),
      title: title.trim(),
      description: description.trim() || 'A cherished collection of Notre Dame alumni memories.',
      category,
      date: date.trim() || 'Recent Collection',
      location: location.trim() || 'NDC Campus, Motijheel, Dhaka',
      batchYear,
      photosCount: 1,
      coverUrl: finalCover,
      createdBy: 'You (Alumni Member)',
      createdDate: 'Just now',
      photos: [
        {
          id: `p-${Date.now()}`,
          url: finalCover,
          caption: `${title.trim()} - Album Cover Photo`,
          uploaderName: 'Dr. Nurul Anam Bashir',
          uploaderAvatar:
            'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&auto=format&fit=crop&q=80',
          batchYear: 34,
          uploadedAt: 'Today',
          likesCount: 1,
          likedByMe: true,
          tags: ['Cover', category],
        },
      ],
    };

    onCreateAlbum(newAlbum);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
                Create New Gallery Album
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Organize reunion photographs, batch tours, or campus events into a shared album.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Album Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Album Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Batch 24 Silver Jubilee Reunion & Campus Walk"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Category & Date Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as GalleryAlbum['category'])}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              >
                <option value="reunion">Reunions & Batch Meets</option>
                <option value="academic">Academic & Industry Conferences</option>
                <option value="campus">Campus Life & College Nostalgia</option>
                <option value="convocation">Graduation & College Ceremonies</option>
                <option value="sports">Sports & Cultural Festivals</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Event Date / Period
              </label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="e.g., January 2026 or Spring 2025"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Location & Batch */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Ganguly Hall or College Grounds, Motijheel"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Target Batch
              </label>
              <select
                value={batchYear}
                onChange={(e) => setBatchYear(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              >
                <option value={0}>All Batches (General Archive)</option>
                {Array.from({ length: 38 }, (_, i) => i + 1).map((b) => (
                  <option key={b} value={b}>
                    Batch {b}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Album Story & Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell the story behind these photographs, who attended, and memorable moments..."
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
            />
          </div>

          {/* Cover Photo Chooser */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Choose Cover Photo
              </label>
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setCoverSourceMode('preset')}
                  className={`px-2 py-0.5 rounded-lg font-semibold cursor-pointer ${
                    coverSourceMode === 'preset'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Presets
                </button>
                <button
                  type="button"
                  onClick={() => setCoverSourceMode('custom')}
                  className={`px-2 py-0.5 rounded-lg font-semibold cursor-pointer ${
                    coverSourceMode === 'custom'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Web URL
                </button>
                <button
                  type="button"
                  onClick={() => setCoverSourceMode('file')}
                  className={`px-2 py-0.5 rounded-lg font-semibold cursor-pointer ${
                    coverSourceMode === 'file'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Upload File
                </button>
              </div>
            </div>

            {/* Presets Grid */}
            {coverSourceMode === 'preset' && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {PRESET_COVERS.map((preset) => {
                  const isSelected = selectedCover === preset.url;
                  return (
                    <div
                      key={preset.label}
                      onClick={() => setSelectedCover(preset.url)}
                      className={`group relative h-16 rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                        isSelected
                          ? 'border-blue-600 ring-2 ring-blue-500/20'
                          : 'border-transparent hover:opacity-80'
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.label}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-1 text-center">
                        <span className="text-[9px] font-bold text-white leading-tight">
                          {preset.label}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* URL Input */}
            {coverSourceMode === 'custom' && (
              <div className="relative">
                <Link2 className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="url"
                  value={customCoverUrl}
                  onChange={(e) => setCustomCoverUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            )}

            {/* File Upload Zone */}
            {coverSourceMode === 'file' && (
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-2xl cursor-pointer bg-slate-50 dark:bg-slate-800/50 transition-colors">
                <UploadCloud className="w-6 h-6 text-blue-600 mb-1" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Click to choose cover photograph from device
                </span>
                <span className="text-[10px] text-slate-400">PNG, JPG, or WEBP up to 10MB</span>
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Album</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
