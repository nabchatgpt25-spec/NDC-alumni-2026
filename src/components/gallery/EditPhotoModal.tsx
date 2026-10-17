/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  X,
  Edit3,
  Trash2,
  Upload,
  Link2,
  Check,
  AlertTriangle,
  Sparkles,
  Camera,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { GalleryPhoto } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { isMainAdmin } from '../../utils/galleryPermissions';
import { saveMediaFile, isVideoFile, isVideoUrl } from '../../utils/mediaStorage';

interface EditPhotoModalProps {
  photo: GalleryPhoto | null;
  albumId: number;
  isOpen: boolean;
  onClose: () => void;
  onSave: (albumId: number, photoId: string, updates: Partial<GalleryPhoto>) => Promise<void> | void;
  onDelete?: (albumId: number, photoId: string) => Promise<void> | void;
}

export const EditPhotoModal: React.FC<EditPhotoModalProps> = ({
  photo,
  albumId,
  isOpen,
  onClose,
  onSave,
  onDelete,
}) => {
  const { currentUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [caption, setCaption] = useState(photo?.caption || '');
  const [batchYear, setBatchYear] = useState<string>(
    photo?.batchYear ? String(photo.batchYear) : ''
  );
  const [tags, setTags] = useState<string>(photo?.tags?.join(', ') || '');
  const [imageUrl, setImageUrl] = useState<string>(photo?.url || '');
  const [isUploadingReplacement, setIsUploadingReplacement] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync state when photo changes
  React.useEffect(() => {
    if (photo) {
      setCaption(photo.caption || '');
      setBatchYear(photo.batchYear ? String(photo.batchYear) : '');
      setTags(photo.tags?.join(', ') || '');
      setImageUrl(photo.url || '');
      setShowDeleteConfirm(false);
      setErrorMsg(null);
    }
  }, [photo]);

  if (!isOpen || !photo) return null;

  const isAdmin = isMainAdmin(currentUser);
  const isOwner =
    (photo.uploaderId && Number(photo.uploaderId) === Number(currentUser.id)) ||
    (photo.uploaderName && currentUser.fullName && photo.uploaderName.trim().toLowerCase() === currentUser.fullName.trim().toLowerCase());

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingReplacement(true);
      setErrorMsg(null);
      const saved = await saveMediaFile(file);
      setImageUrl(saved.url);
    } catch (err: any) {
      console.warn('File replacement failed, using blob fallback', err);
      setImageUrl(URL.createObjectURL(file));
    } finally {
      setIsUploadingReplacement(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photo) return;

    try {
      setIsSaving(true);
      setErrorMsg(null);

      const parsedBatch = batchYear.trim() ? parseInt(batchYear.trim(), 10) : undefined;
      const parsedTags = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const updates: Partial<GalleryPhoto> = {
        caption: caption.trim(),
        batchYear: !isNaN(parsedBatch as number) ? parsedBatch : undefined,
        tags: parsedTags,
        url: imageUrl.trim() || photo.url,
      };

      await onSave(albumId, photo.id, updates);
      onClose();
    } catch (err: any) {
      console.error('Failed to save photo updates:', err);
      setErrorMsg(err.message || 'Failed to update photo details. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!photo || !onDelete) return;
    try {
      setIsDeleting(true);
      setErrorMsg(null);
      await onDelete(albumId, photo.id);
      onClose();
    } catch (err: any) {
      console.error('Failed to delete photo:', err);
      setErrorMsg(err.message || 'Failed to delete photo. Please try again.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Edit Photograph
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Update picture details, batch tag, or replace photo asset
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Permission Banner */}
        <div className="px-5 py-2.5 bg-blue-50/70 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/50 flex items-center gap-2 text-xs">
          {isAdmin ? (
            <>
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="font-semibold text-blue-900 dark:text-blue-200">
                <span className="font-bold">Main Admin Full Access:</span> You can edit or delete this picture and all archive memories.
              </span>
            </>
          ) : (
            <>
              <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-semibold text-emerald-900 dark:text-emerald-200">
                <span className="font-bold">Photo Owner Access:</span> You uploaded this picture. Only you and administrators can edit or delete it.
              </span>
            </>
          )}
        </div>

        {errorMsg && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="p-5 space-y-4">
          {/* Image Preview & Replacement */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Photo Asset Preview &amp; Replacement
            </label>
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800 aspect-video flex items-center justify-center group">
              <img
                src={imageUrl}
                alt="Photo preview"
                className="w-full h-full object-contain"
              />
              {isUploadingReplacement && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white gap-2">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-semibold">Processing image replacement...</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-interactive inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-blue-600" />
                <span>Upload New Image</span>
              </button>

              <div className="flex-1 relative">
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Or paste external image URL..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Link2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>

          {/* Caption */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Caption / Description
            </label>
            <textarea
              rows={2}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="e.g. Science club exhibition at Father Timm building..."
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Batch Year & Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Batch Year
              </label>
              <input
                type="number"
                min="1949"
                max="2035"
                value={batchYear}
                onChange={(e) => setBatchYear(e.target.value)}
                placeholder="e.g. 78, 88, 2026"
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Campus, Reunion, Motijheel"
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Delete confirmation section */}
          {showDeleteConfirm && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Confirm Permanent Deletion</span>
              </div>
              <p className="text-xs text-rose-600 dark:text-rose-400">
                Are you sure you want to delete this photo from the gallery? This action cannot be undone.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>Yes, Delete Photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200/80 dark:border-slate-800">
            {onDelete && !showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Photo</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl shadow-md shadow-blue-900/20 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSaving ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
