import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Image as ImageIcon,
  Upload,
  RefreshCw,
  Check,
  Eye,
  Megaphone,
  Calendar,
  Building2,
  Sliders,
  ShieldAlert,
  Download,
  FileUp,
  RotateCcw,
  Plus,
  Trash2,
  Edit2,
  X,
  Layers,
  Palette,
  ExternalLink,
  Smartphone,
  Globe,
  Radio,
  Clock,
  MapPin,
  Ticket,
} from 'lucide-react';
import {
  useSiteSettings,
} from '../../hooks/useSiteSettings';
import {
  PRESET_LOGOS,
  PRESET_HERO_BACKGROUNDS,
  PortalSiteSettings,
  exportSiteSettingsAsJson,
  importSiteSettingsFromJson,
} from '../../services/siteSettingsService';
import { OfficialNotice } from '../../data/noticesData';
import { NDCLogo } from '../NDCLogo';

interface AdminSiteCustomizerProps {
  onShowToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

type CustomizerTab =
  | 'branding'
  | 'background'
  | 'announcements'
  | 'reunion'
  | 'notices'
  | 'contacts'
  | 'system';

export const AdminSiteCustomizer: React.FC<AdminSiteCustomizerProps> = ({ onShowToast }) => {
  const { settings, updateSettings, resetSettings } = useSiteSettings();
  const [activeTab, setActiveTab] = useState<CustomizerTab>('branding');

  // Form states initialized from settings
  const [formData, setFormData] = useState<PortalSiteSettings>(settings);
  const [isSaved, setIsSaved] = useState(false);

  // File upload refs
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const jsonImportFileRef = useRef<HTMLInputElement>(null);

  // Notice editing / creation modal state
  const [editingNotice, setEditingNotice] = useState<OfficialNotice | null>(null);
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);

  // Sync state when external settings change
  React.useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleSave = (customSettings?: Partial<PortalSiteSettings>) => {
    const toSave = customSettings ? { ...formData, ...customSettings } : formData;
    updateSettings(toSave);
    setIsSaved(true);
    onShowToast('Institutional changes saved and broadcast live!', 'success');
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleResetToDefault = () => {
    if (window.confirm('Are you sure you want to restore all institutional settings to College Defaults?')) {
      const def = resetSettings();
      setFormData(def);
      onShowToast('Settings successfully reset to official college defaults.', 'info');
    }
  };

  // Image Upload handler (converts file to base64 Data URL)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onShowToast('Please select a valid image file (SVG, PNG, JPG, WebP).', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      onShowToast('Logo file size exceeds 2MB limit. Please choose a smaller asset.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const next = {
        ...formData,
        branding: { ...formData.branding, logoUrl: dataUrl },
      };
      setFormData(next);
      handleSave(next);
      onShowToast('New custom logo uploaded and active live!', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onShowToast('Please select a valid image file.', 'error');
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      onShowToast('Background image size exceeds 4MB. Please optimize before upload.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const next = {
        ...formData,
        heroAndBackground: {
          ...formData.heroAndBackground,
          heroBackgroundUrl: dataUrl,
          bgTexture: 'campus-photo' as const,
        },
      };
      setFormData(next);
      handleSave(next);
      onShowToast('Custom campus background uploaded successfully!', 'success');
    };
    reader.readAsDataURL(file);
  };

  // JSON Export / Import
  const handleExportBackup = () => {
    const jsonStr = exportSiteSettingsAsJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ndc-portal-settings-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onShowToast('Configuration backup JSON exported successfully.', 'success');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importSiteSettingsFromJson(content);
      if (res.success) {
        onShowToast('Configuration successfully restored from backup JSON!', 'success');
      } else {
        onShowToast(`Failed to restore: ${res.error}`, 'error');
      }
    };
    reader.readAsText(file);
  };

  // Notice CRUD handlers
  const handleSaveNotice = (notice: OfficialNotice) => {
    const existingIndex = formData.notices.findIndex((n) => n.id === notice.id);
    let updatedNotices: OfficialNotice[];
    if (existingIndex >= 0) {
      updatedNotices = [...formData.notices];
      updatedNotices[existingIndex] = notice;
    } else {
      updatedNotices = [notice, ...formData.notices];
    }

    const next = { ...formData, notices: updatedNotices };
    setFormData(next);
    handleSave(next);
    setIsNoticeModalOpen(false);
    setEditingNotice(null);
    onShowToast(`Notice "${notice.title}" updated successfully!`, 'success');
  };

  const handleDeleteNotice = (id: string) => {
    if (window.confirm('Are you sure you want to delete this official circular?')) {
      const updated = formData.notices.filter((n) => n.id !== id);
      const next = { ...formData, notices: updated };
      setFormData(next);
      handleSave(next);
      onShowToast('Notice removed from public board.', 'info');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Sliders className="w-3.5 h-3.5" />
            <span>No-Code Administrative Control Hub</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Institutional Customization &amp; Portal Studio
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Change the college crest logo, campus background artwork, reunion countdown, official announcements, bank accounts, and portal headlines instantly without touching any code.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => handleSave()}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer ${
              isSaved
                ? 'bg-emerald-600 text-white'
                : 'bg-blue-600 hover:bg-blue-500 active:scale-95 text-white shadow-blue-600/25'
            }`}
          >
            {isSaved ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            <span>{isSaved ? 'Changes Published Live!' : 'Save & Publish Live'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportBackup}
            title="Download full portal settings as JSON"
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleResetToDefault}
            title="Reset to official college defaults"
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-950 text-slate-700 hover:text-rose-600 dark:text-slate-200 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200 dark:border-slate-800 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('branding')}
          className={`px-4 py-2.5 rounded-2xl flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'branding'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Logo &amp; Brand Identity</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('background')}
          className={`px-4 py-2.5 rounded-2xl flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'background'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Hero &amp; Campus Background</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('announcements')}
          className={`px-4 py-2.5 rounded-2xl flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'announcements'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>Broadcast Ticker</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reunion')}
          className={`px-4 py-2.5 rounded-2xl flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'reunion'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Reunion &amp; Event Countdown</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('notices')}
          className={`px-4 py-2.5 rounded-2xl flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'notices'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Notice Board Circulars ({formData.notices.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('contacts')}
          className={`px-4 py-2.5 rounded-2xl flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'contacts'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Bank Accounts &amp; Secretariat</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('system')}
          className={`px-4 py-2.5 rounded-2xl flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'system'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Maintenance &amp; Security</span>
        </button>
      </div>

      {/* =======================================================================
          TAB 1: LOGO & BRAND IDENTITY
          ======================================================================= */}
      {activeTab === 'branding' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Live Logo Preview Card */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4">
                Active Logo Live Preview
              </h3>

              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Light Mode Preview */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Light Theme</span>
                  <div className="w-20 h-20 p-2 rounded-2xl bg-white shadow-xs border border-slate-100 flex items-center justify-center overflow-hidden">
                    <img
                      src={formData.branding.logoUrl || '/ndc-logo.svg'}
                      alt={formData.branding.logoAlt}
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                {/* Dark Mode Preview */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center gap-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Dark Theme</span>
                  <div className="w-20 h-20 p-2 rounded-2xl bg-slate-900 shadow-xs border border-slate-800 flex items-center justify-center overflow-hidden">
                    <img
                      src={formData.branding.logoUrl || '/ndc-logo.svg'}
                      alt={formData.branding.logoAlt}
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              </div>

              {/* Header Miniature Bar Preview */}
              <div className="bg-slate-100 dark:bg-slate-800/80 p-3 rounded-2xl flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 p-1 flex items-center justify-center shadow-xs overflow-hidden shrink-0">
                  <img
                    src={formData.branding.logoUrl || '/ndc-logo.svg'}
                    alt="Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                    {formData.branding.siteTitle}
                  </div>
                  <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold truncate">
                    {formData.branding.shortTagline}
                  </div>
                </div>
              </div>

              {/* Upload New Logo Button */}
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                <input
                  type="file"
                  ref={logoFileInputRef}
                  onChange={handleLogoUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => logoFileInputRef.current?.click()}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload Custom Logo File (PNG / SVG / JPG)</span>
                </button>
                <p className="text-[11px] text-slate-400">
                  Direct upload from computer. Max 2MB file size.
                </p>
              </div>
            </div>

            {/* Presets Grid */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3">
                Official College Logo Presets
              </h3>
              <div className="space-y-2.5">
                {PRESET_LOGOS.map((preset) => {
                  const isSelected = formData.branding.logoUrl === preset.url;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        const next = {
                          ...formData,
                          branding: { ...formData.branding, logoUrl: preset.url },
                        };
                        setFormData(next);
                        handleSave(next);
                      }}
                      className={`w-full p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 flex items-center justify-center shrink-0">
                        <img src={preset.url} alt={preset.name} className="w-full h-full object-contain" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {preset.name}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {preset.description}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Portal Titles, Mottos, and Text Controls */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Identity &amp; Institutional Text
            </h3>

            <div className="space-y-4 text-xs">
              {/* Custom Logo URL */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Logo URL or Static Asset Path
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.branding.logoUrl}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        branding: { ...formData.branding, logoUrl: e.target.value },
                      })
                    }
                    placeholder="/ndc-logo.svg or https://..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => handleSave()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  You can type any valid image URL, choose a preset, or click &ldquo;Upload Custom Logo File&rdquo;.
                </p>
              </div>

              {/* Portal Name / Title */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Official Portal Name
                </label>
                <input
                  type="text"
                  value={formData.branding.siteTitle}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      branding: { ...formData.branding, siteTitle: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Short Tagline / Header Acronym */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Short Header Subtitle / Latin Acronym
                </label>
                <input
                  type="text"
                  value={formData.branding.shortTagline}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      branding: { ...formData.branding, shortTagline: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Traditional College Motto */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Institutional College Motto
                </label>
                <input
                  type="text"
                  value={formData.branding.collegeMotto}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      branding: { ...formData.branding, collegeMotto: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Established Year & Total Batches */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    College Established Year
                  </label>
                  <input
                    type="number"
                    value={formData.branding.establishedYear}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        branding: { ...formData.branding, establishedYear: Number(e.target.value) },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Total Active Batches Count
                  </label>
                  <input
                    type="number"
                    value={formData.branding.totalBatchesCount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        branding: { ...formData.branding, totalBatchesCount: Number(e.target.value) },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => handleSave()}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Save Brand Settings</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================================
          TAB 2: HERO & CAMPUS BACKGROUND
          ======================================================================= */}
      {activeTab === 'background' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Background Preview & Presets */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3">
                Background Visual Miniature
              </h3>

              {/* Miniature Hero Preview Container */}
              <div className="relative h-44 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 mb-4 bg-slate-900 flex items-center justify-center p-4">
                <img
                  src={formData.heroAndBackground.heroBackgroundUrl}
                  alt="Background preview"
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ opacity: formData.heroAndBackground.bgOverlayOpacity }}
                />
                <div className="relative z-10 text-center text-white">
                  <div className="w-8 h-8 mx-auto mb-1 rounded-full overflow-hidden bg-white/20 p-1 backdrop-blur-xs flex items-center justify-center">
                    <NDCLogo className="w-full h-full" />
                  </div>
                  <div className="font-black text-xs">
                    {formData.heroAndBackground.heroHeadlinePrefix}{' '}
                    <span className="text-amber-300">Notre Dame</span>
                  </div>
                  <div className="text-[10px] text-blue-200 mt-0.5 line-clamp-1">
                    {formData.heroAndBackground.heroMottoQuote}
                  </div>
                </div>
              </div>

              {/* Upload New Background Image File */}
              <input
                type="file"
                ref={bgFileInputRef}
                onChange={handleBgUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => bgFileInputRef.current?.click()}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Campus Background Photo (File)</span>
              </button>
            </div>

            {/* Presets List */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3">
                Curated NDC Campus Artworks
              </h3>
              <div className="space-y-2.5">
                {PRESET_HERO_BACKGROUNDS.map((bg) => {
                  const isSelected = formData.heroAndBackground.heroBackgroundUrl === bg.url;
                  return (
                    <button
                      key={bg.id}
                      type="button"
                      onClick={() => {
                        const next = {
                          ...formData,
                          heroAndBackground: {
                            ...formData.heroAndBackground,
                            heroBackgroundUrl: bg.url,
                            bgTexture: 'campus-photo' as const,
                          },
                        };
                        setFormData(next);
                        handleSave(next);
                      }}
                      className={`w-full p-2.5 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <img
                        src={bg.url}
                        alt={bg.name}
                        className="w-14 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {bg.name}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {bg.description}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Hero Content & Texture Settings */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Hero Section Copy &amp; Opacity
            </h3>

            <div className="space-y-4 text-xs">
              {/* Opacity Slider */}
              <div>
                <div className="flex justify-between items-center mb-1 font-bold text-slate-700 dark:text-slate-300">
                  <span>Background Image Opacity</span>
                  <span className="font-mono text-blue-600 dark:text-blue-400">
                    {Math.round(formData.heroAndBackground.bgOverlayOpacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.85"
                  step="0.05"
                  value={formData.heroAndBackground.bgOverlayOpacity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      heroAndBackground: {
                        ...formData.heroAndBackground,
                        bgOverlayOpacity: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Headline Prefix */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Headline Line 1 (Intro)
                </label>
                <input
                  type="text"
                  value={formData.heroAndBackground.heroHeadlinePrefix}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      heroAndBackground: {
                        ...formData.heroAndBackground,
                        heroHeadlinePrefix: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                />
              </div>

              {/* Motto Quote */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Motto Subheading Banner
                </label>
                <input
                  type="text"
                  value={formData.heroAndBackground.heroMottoQuote}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      heroAndBackground: {
                        ...formData.heroAndBackground,
                        heroMottoQuote: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                />
              </div>

              {/* Subtitle Description */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Hero Paragraph / Description
                </label>
                <textarea
                  rows={3}
                  value={formData.heroAndBackground.heroSubtitle}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      heroAndBackground: {
                        ...formData.heroAndBackground,
                        heroSubtitle: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs leading-relaxed"
                />
              </div>

              {/* Live Status Pill Toggle & Text */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Live Online &amp; Batch Status Pill
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.heroAndBackground.showLiveOnlinePill}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          heroAndBackground: {
                            ...formData.heroAndBackground,
                            showLiveOnlinePill: e.target.checked,
                          },
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <input
                  type="text"
                  value={formData.heroAndBackground.liveOnlinePillText}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      heroAndBackground: {
                        ...formData.heroAndBackground,
                        liveOnlinePillText: e.target.value,
                      },
                    })
                  }
                  placeholder="340+ Online • 76 Batches • 42 Countries"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => handleSave()}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Publish Hero &amp; Background</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================================
          TAB 3: BROADCAST TICKER
          ======================================================================= */}
      {activeTab === 'announcements' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Global Header Broadcast Strip
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Displays the animated marquee across the top of the portal for urgent notices or custom alerts.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.announcement.enabled}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    announcement: {
                      ...formData.announcement,
                      enabled: e.target.checked,
                    },
                  })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Badge Label Text
              </label>
              <input
                type="text"
                value={formData.announcement.badgeText}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    announcement: {
                      ...formData.announcement,
                      badgeText: e.target.value,
                    },
                  })
                }
                placeholder="OFFICIAL NOTICE"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Urgency Level &amp; Styling
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['standard', 'urgent', 'emergency'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        announcement: { ...formData.announcement, urgency: lvl },
                      })
                    }
                    className={`py-2 px-3 rounded-xl border font-bold capitalize transition-all cursor-pointer ${
                      formData.announcement.urgency === lvl
                        ? lvl === 'emergency'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : lvl === 'urgent'
                          ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                          : 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Custom Broadcast Message Override (Optional)
              </label>
              <textarea
                rows={2}
                value={formData.announcement.customTickerOverride}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    announcement: {
                      ...formData.announcement,
                      customTickerOverride: e.target.value,
                    },
                  })
                }
                placeholder="Leave blank to automatically scroll through active official notices, or type a custom alert here."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white leading-relaxed"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                If provided, this custom text will immediately display on the global ticker.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="button"
              onClick={() => handleSave()}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Publish Ticker Changes</span>
            </button>
          </div>
        </div>
      )}

      {/* =======================================================================
          TAB 4: REUNION & COUNTDOWN
          ======================================================================= */}
      {activeTab === 'reunion' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm max-w-3xl mx-auto space-y-6">
          <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Signature Grand Reunion &amp; Event Countdown Manager
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Control the countdown date, event venue, registration fee, and pass reservations.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Reunion Event Title
              </label>
              <input
                type="text"
                value={formData.reunion.eventTitle}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    reunion: { ...formData.reunion, eventTitle: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Countdown Target Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.reunion.targetDate.slice(0, 16)}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      reunion: {
                        ...formData.reunion,
                        targetDate: new Date(e.target.value).toISOString(),
                      },
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Registration Status
                </label>
                <select
                  value={formData.reunion.registrationStatus}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      reunion: {
                        ...formData.reunion,
                        registrationStatus: e.target.value as any,
                      },
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white capitalize"
                >
                  <option value="open">Registration Open</option>
                  <option value="closing_soon">Closing Soon</option>
                  <option value="closed">Registration Closed</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Event Venue &amp; Campus Location
              </label>
              <input
                type="text"
                value={formData.reunion.venue}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    reunion: { ...formData.reunion, venue: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Ticket / Pass Fee Structure
              </label>
              <input
                type="text"
                value={formData.reunion.ticketFee}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    reunion: { ...formData.reunion, ticketFee: e.target.value },
                  })
                }
                placeholder="BDT 2,500 / $30 (Includes Souvenir Crest & Gala Banquet)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Event Summary &amp; Description
              </label>
              <textarea
                rows={3}
                value={formData.reunion.description}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    reunion: { ...formData.reunion, description: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white leading-relaxed"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="button"
              onClick={() => handleSave()}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Update Reunion Details</span>
            </button>
          </div>
        </div>
      )}

      {/* =======================================================================
          TAB 5: NOTICES & CIRCULARS
          ======================================================================= */}
      {activeTab === 'notices' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Official Notices &amp; Circulars Board
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Publish, edit, or remove official circulars, AGM agendas, and scholarship announcements.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingNotice({
                  id: `notice-${Date.now()}`,
                  refNo: `NDCAA/PUB-${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`,
                  title: '',
                  category: 'General',
                  publishedDate: new Date().toISOString().slice(0, 10),
                  isUrgent: false,
                  summary: '',
                  fullContent: '',
                  pdfUrl: '#',
                  fileSize: '1.0 MB',
                  signatory: {
                    name: 'General Secretary',
                    designation: 'Executive Committee',
                    organization: 'Notre Dame College Alumni Association',
                  },
                });
                setIsNoticeModalOpen(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Publish New Notice</span>
            </button>
          </div>

          {/* Notices Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {formData.notices.map((notice) => (
                <div
                  key={notice.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400">
                        {notice.refNo}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {notice.category}
                      </span>
                      {notice.isUrgent && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                          URGENT
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400">
                        Published {notice.publishedDate}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      {notice.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                      {notice.summary}
                    </p>
                    <div className="text-[11px] text-slate-400 italic">
                      Signatory: {notice.signatory.name} ({notice.signatory.designation})
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingNotice(notice);
                        setIsNoticeModalOpen(true);
                      }}
                      className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Edit Notice"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteNotice(notice.id)}
                      className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Delete Notice"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =======================================================================
          TAB 6: BANK ACCOUNTS & CONTACTS
          ======================================================================= */}
      {activeTab === 'contacts' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bank Accounts Form */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
              Official Bank Donation &amp; Subscription Accounts
            </h3>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Bank Name &amp; Branch
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={formData.contactAndBank.bankName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contactAndBank: { ...formData.contactAndBank, bankName: e.target.value },
                    })
                  }
                  placeholder="The City Bank Limited"
                  className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
                <input
                  type="text"
                  value={formData.contactAndBank.branch}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contactAndBank: { ...formData.contactAndBank, branch: e.target.value },
                    })
                  }
                  placeholder="Motijheel Branch, Dhaka"
                  className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Account Title
              </label>
              <input
                type="text"
                value={formData.contactAndBank.accountTitle}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    contactAndBank: { ...formData.contactAndBank, accountTitle: e.target.value },
                  })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Account Number
              </label>
              <input
                type="text"
                value={formData.contactAndBank.accountNumber}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    contactAndBank: { ...formData.contactAndBank, accountNumber: e.target.value },
                  })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-blue-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Routing Number
                </label>
                <input
                  type="text"
                  value={formData.contactAndBank.routingNumber}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contactAndBank: { ...formData.contactAndBank, routingNumber: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  SWIFT Code
                </label>
                <input
                  type="text"
                  value={formData.contactAndBank.swiftCode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contactAndBank: { ...formData.contactAndBank, swiftCode: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Mobile Financial Services (MFS) Merchant Numbers
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[10px] text-pink-600 font-bold block mb-0.5">bKash</span>
                  <input
                    type="text"
                    value={formData.contactAndBank.bKashMerchant}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contactAndBank: { ...formData.contactAndBank, bKashMerchant: e.target.value },
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[11px]"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-amber-600 font-bold block mb-0.5">Nagad</span>
                  <input
                    type="text"
                    value={formData.contactAndBank.nagadMerchant}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contactAndBank: { ...formData.contactAndBank, nagadMerchant: e.target.value },
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[11px]"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-indigo-600 font-bold block mb-0.5">Rocket</span>
                  <input
                    type="text"
                    value={formData.contactAndBank.rocketAccount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contactAndBank: { ...formData.contactAndBank, rocketAccount: e.target.value },
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[11px]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Secretariat & Social Links Form */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
              Secretariat Address &amp; Official Helplines
            </h3>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Secretariat Physical Address
              </label>
              <textarea
                rows={2}
                value={formData.contactAndBank.secretariatAddress}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    contactAndBank: { ...formData.contactAndBank, secretariatAddress: e.target.value },
                  })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Emergency Helplines
              </label>
              <input
                type="text"
                value={formData.contactAndBank.helpline}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    contactAndBank: { ...formData.contactAndBank, helpline: e.target.value },
                  })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Official Association Email
              </label>
              <input
                type="email"
                value={formData.contactAndBank.email}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    contactAndBank: { ...formData.contactAndBank, email: e.target.value },
                  })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div className="pt-2 space-y-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300">
                Official Social Media Channels
              </label>
              <input
                type="text"
                value={formData.contactAndBank.facebookUrl}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    contactAndBank: { ...formData.contactAndBank, facebookUrl: e.target.value },
                  })
                }
                placeholder="Facebook page / group URL"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
              <input
                type="text"
                value={formData.contactAndBank.linkedinUrl}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    contactAndBank: { ...formData.contactAndBank, linkedinUrl: e.target.value },
                  })
                }
                placeholder="LinkedIn group URL"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => handleSave()}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Save Contacts &amp; Banking</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================================
          TAB 7: SYSTEM CONTROLS & BACKUP
          ======================================================================= */}
      {activeTab === 'system' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm max-w-3xl mx-auto space-y-6">
          <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              System Operations &amp; Portability Controls
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage maintenance mode, user registration gates, and full configuration backups.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            {/* Maintenance Mode Toggle */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900 dark:text-white">
                  Maintenance Mode
                </div>
                <div className="text-[11px] text-slate-500">
                  When enabled, shows an institutional maintenance banner to all non-admin visitors.
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.systemControls.maintenanceMode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      systemControls: {
                        ...formData.systemControls,
                        maintenanceMode: e.target.checked,
                      },
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>

            {/* Allow Registration Toggle */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900 dark:text-white">
                  Public Alumni Registration
                </div>
                <div className="text-[11px] text-slate-500">
                  Allow new alumni from any batch to submit self-registration requests.
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.systemControls.allowPublicRegistration}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      systemControls: {
                        ...formData.systemControls,
                        allowPublicRegistration: e.target.checked,
                      },
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Backup & Restore Studio */}
            <div className="p-5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 space-y-3">
              <div className="font-bold text-slate-900 dark:text-white">
                One-Click Configuration Backup &amp; Restore
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Download a complete JSON snapshot of all portal branding, logos, background choices, notices, and contact info, or restore a previous snapshot instantly.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Backup JSON</span>
                </button>

                <input
                  type="file"
                  ref={jsonImportFileRef}
                  onChange={handleImportBackup}
                  accept="application/json"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => jsonImportFileRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold text-xs flex items-center gap-2 cursor-pointer"
                >
                  <FileUp className="w-4 h-4" />
                  <span>Restore from Backup JSON</span>
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="button"
              onClick={() => handleSave()}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Save System Settings</span>
            </button>
          </div>
        </div>
      )}

      {/* =======================================================================
          NOTICE EDIT / CREATE MODAL
          ======================================================================= */}
      {isNoticeModalOpen && editingNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 bg-blue-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-black text-base">
                  {editingNotice.title ? 'Edit Official Circular' : 'Create New Official Circular'}
                </h3>
                <p className="text-xs text-blue-200">
                  Published directly to the alumni notice board and ticker.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsNoticeModalOpen(false);
                  setEditingNotice(null);
                }}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Reference Number
                  </label>
                  <input
                    type="text"
                    value={editingNotice.refNo}
                    onChange={(e) =>
                      setEditingNotice({ ...editingNotice, refNo: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Notice Category
                  </label>
                  <select
                    value={editingNotice.category}
                    onChange={(e) =>
                      setEditingNotice({ ...editingNotice, category: e.target.value as any })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  >
                    <option value="General">General</option>
                    <option value="Reunion">Reunion</option>
                    <option value="Membership">Membership</option>
                    <option value="Scholarship">Scholarship</option>
                    <option value="AGM">AGM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Circular Title
                </label>
                <input
                  type="text"
                  value={editingNotice.title}
                  onChange={(e) =>
                    setEditingNotice({ ...editingNotice, title: e.target.value })
                  }
                  placeholder="e.g. Schedule for Grand Reunion 2026 Badge Distribution"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="notice-urgent-check"
                  checked={editingNotice.isUrgent}
                  onChange={(e) =>
                    setEditingNotice({ ...editingNotice, isUrgent: e.target.checked })
                  }
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="notice-urgent-check"
                  className="font-bold text-rose-600 dark:text-rose-400 cursor-pointer"
                >
                  Mark as Urgent Circular (Highlights in Red)
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Brief Summary
                </label>
                <textarea
                  rows={2}
                  value={editingNotice.summary}
                  onChange={(e) =>
                    setEditingNotice({ ...editingNotice, summary: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Content / Circular Text
                </label>
                <textarea
                  rows={4}
                  value={editingNotice.fullContent}
                  onChange={(e) =>
                    setEditingNotice({ ...editingNotice, fullContent: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 leading-relaxed font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Signatory Name
                  </label>
                  <input
                    type="text"
                    value={editingNotice.signatory.name}
                    onChange={(e) =>
                      setEditingNotice({
                        ...editingNotice,
                        signatory: { ...editingNotice.signatory, name: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={editingNotice.signatory.designation}
                    onChange={(e) =>
                      setEditingNotice({
                        ...editingNotice,
                        signatory: { ...editingNotice.signatory, designation: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsNoticeModalOpen(false);
                  setEditingNotice(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveNotice(editingNotice)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Check className="w-4 h-4" />
                <span>Save &amp; Publish Notice</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
