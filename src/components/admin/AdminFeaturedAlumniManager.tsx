import React, { useState, useEffect, useMemo } from 'react';
import {
  Award,
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  Search,
  Building2,
  MapPin,
  GraduationCap,
  Briefcase,
  ExternalLink,
  ShieldCheck,
  Check,
  X,
  Database,
  Filter,
  Eye,
  Copy,
  Info
} from 'lucide-react';
import { AlumniProfile } from '../../types';
import {
  loadFeaturedAlumni,
  fetchFeaturedAlumniFromDb,
  addFeaturedAlumnus,
  updateFeaturedAlumnus,
  deleteFeaturedAlumnus,
  resetFeaturedAlumniToDefault,
  subscribeToFeaturedAlumni,
  EliteCategory,
  ADMIN_EMAILS
} from '../../utils/featuredAlumniService';
import campusHeroImg from '../../assets/images/ndc_campus_hero_1790233370828.jpg';

const SAMPLE_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80',
  '/ndc-logo.png',
];

interface AdminFeaturedAlumniManagerProps {
  onViewProfile?: (profileId: number) => void;
}

export const AdminFeaturedAlumniManager: React.FC<AdminFeaturedAlumniManagerProps> = ({
  onViewProfile,
}) => {
  const [luminaries, setLuminaries] = useState<AlumniProfile[]>(() => loadFeaturedAlumni());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<EliteCategory>('all');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Modal State for Add / Edit
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingAlumnus, setEditingAlumnus] = useState<AlumniProfile | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formBatch, setFormBatch] = useState('58');
  const [formSession, setFormSession] = useState('');
  const [formPosition, setFormPosition] = useState('');
  const [formInstitution, setFormInstitution] = useState('');
  const [formCategory, setFormCategory] = useState<EliteCategory>('tech');
  const [formCity, setFormCity] = useState('Dhaka');
  const [formCountry, setFormCountry] = useState('Bangladesh');
  const [formAvatar, setFormAvatar] = useState(SAMPLE_AVATARS[0]);
  const [formBio, setFormBio] = useState('');
  const [formAchievements, setFormAchievements] = useState('');

  // SQL Guide Modal State
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Listen to updates from other tabs / storage and sync from Supabase on mount
  useEffect(() => {
    let isMounted = true;
    fetchFeaturedAlumniFromDb().then((data) => {
      if (isMounted && data && data.length > 0) {
        setLuminaries(data);
      }
    });

    const unsubscribe = subscribeToFeaturedAlumni((updatedList) => {
      setLuminaries(updatedList);
    });
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const openAddModal = () => {
    setEditingAlumnus(null);
    setFormName('');
    setFormBatch('58');
    setFormSession('2006-08');
    setFormPosition('');
    setFormInstitution('');
    setFormCategory('tech');
    setFormCity('Dhaka');
    setFormCountry('Bangladesh');
    setFormAvatar(SAMPLE_AVATARS[0]);
    setFormBio('');
    setFormAchievements('');
    setIsEditorOpen(true);
  };

  const openEditModal = (alumnus: AlumniProfile) => {
    setEditingAlumnus(alumnus);
    setFormName(alumnus.fullName);
    setFormBatch(String(alumnus.batchYear || 50));
    setFormSession(alumnus.session || `HSC Batch ${alumnus.batchYear}`);
    setFormPosition(alumnus.position || alumnus.profession);
    setFormInstitution(alumnus.institution || '');
    
    // Deduce category
    const pos = (alumnus.position + ' ' + alumnus.profession).toLowerCase();
    if (pos.includes('health') || pos.includes('dr.') || pos.includes('surgeon') || pos.includes('doctor')) {
      setFormCategory('medicine');
    } else if (pos.includes('minister') || pos.includes('law') || pos.includes('governance') || pos.includes('constitution')) {
      setFormCategory('governance');
    } else if (pos.includes('professor') || pos.includes('research') || pos.includes('vice-chancellor')) {
      setFormCategory('academia');
    } else if (pos.includes('global') || pos.includes('un ') || pos.includes('world bank')) {
      setFormCategory('global');
    } else {
      setFormCategory('tech');
    }

    setFormCity(alumnus.city || 'Dhaka');
    setFormCountry(alumnus.country || 'Bangladesh');
    setFormAvatar(alumnus.avatarUrl || SAMPLE_AVATARS[0]);
    setFormBio(alumnus.bio || '');
    setFormAchievements((alumnus.specialty || []).join(', '));
    setIsEditorOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Please enter the alumnus full name', 'error');
      return;
    }
    if (!formPosition.trim()) {
      showToast('Please enter their position or leadership title', 'error');
      return;
    }

    const achievementsArray = formAchievements
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload: Partial<AlumniProfile> = {
      fullName: formName.trim(),
      batchYear: parseInt(formBatch, 10) || 50,
      session: formSession.trim() || `HSC Batch ${formBatch}`,
      position: formPosition.trim(),
      profession: formPosition.trim(),
      institution: formInstitution.trim() || 'Distinguished Organization',
      city: formCity.trim() || 'Dhaka',
      country: formCountry.trim() || 'Bangladesh',
      avatarUrl: formAvatar.trim() || SAMPLE_AVATARS[0],
      bio: formBio.trim() || `${formPosition} at ${formInstitution}. Notable Notredamian leader.`,
      specialty: achievementsArray.length > 0 ? achievementsArray : ['Leadership', 'Innovation'],
      badges: ['Prominent Leader', 'Notre Dame Hall of Fame'],
      coverUrl: campusHeroImg,
    };

    if (editingAlumnus) {
      updateFeaturedAlumnus(editingAlumnus.id, payload);
      showToast(`Updated "${formName}" successfully!`, 'success');
    } else {
      addFeaturedAlumnus(payload);
      showToast(`Added "${formName}" to Distinguished Positions!`, 'success');
    }

    setLuminaries(loadFeaturedAlumni());
    setIsEditorOpen(false);
  };

  const handleDelete = (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to remove "${name}" from Featured Positions?`)) {
      deleteFeaturedAlumnus(id);
      setLuminaries(loadFeaturedAlumni());
      showToast(`Removed "${name}" from featured positions`, 'info');
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset all featured positions to the Notre Dame official roster defaults?')) {
      const reset = resetFeaturedAlumniToDefault();
      setLuminaries(reset);
      showToast('Reset featured positions to default official roster!', 'success');
    }
  };

  // Filtered list
  const filteredList = useMemo(() => {
    return luminaries.filter((alumnus) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        alumnus.fullName.toLowerCase().includes(q) ||
        (alumnus.position || '').toLowerCase().includes(q) ||
        (alumnus.institution || '').toLowerCase().includes(q) ||
        (alumnus.session || '').toLowerCase().includes(q) ||
        String(alumnus.batchYear).includes(q) ||
        (alumnus.city || '').toLowerCase().includes(q) ||
        (alumnus.country || '').toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (selectedCategory === 'all') return true;

      const fullText = `${alumnus.position} ${alumnus.profession} ${alumnus.institution} ${(alumnus.specialty || []).join(' ')}`.toLowerCase();
      if (selectedCategory === 'tech') {
        return (
          fullText.includes('software') ||
          fullText.includes('engineer') ||
          fullText.includes('tech') ||
          fullText.includes('ai') ||
          fullText.includes('systems') ||
          fullText.includes('silicon')
        );
      }
      if (selectedCategory === 'medicine') {
        return (
          fullText.includes('medicine') ||
          fullText.includes('health') ||
          fullText.includes('surgeon') ||
          fullText.includes('physician') ||
          fullText.includes('dr.') ||
          fullText.includes('clinical')
        );
      }
      if (selectedCategory === 'governance') {
        return (
          fullText.includes('minister') ||
          fullText.includes('law') ||
          fullText.includes('governance') ||
          fullText.includes('constitution') ||
          fullText.includes('policy') ||
          fullText.includes('adviser')
        );
      }
      if (selectedCategory === 'academia') {
        return (
          fullText.includes('professor') ||
          fullText.includes('chancellor') ||
          fullText.includes('university') ||
          fullText.includes('research') ||
          fullText.includes('buet')
        );
      }
      if (selectedCategory === 'global') {
        return (
          fullText.includes('global') ||
          fullText.includes('world') ||
          fullText.includes('un ') ||
          fullText.includes('international') ||
          fullText.includes('pioneer')
        );
      }
      return true;
    });
  }, [luminaries, searchQuery, selectedCategory]);

  // Statistics
  const techCount = luminaries.filter((l) =>
    `${l.position} ${l.profession}`.toLowerCase().match(/tech|software|engineer|ai/)
  ).length;
  const medicineCount = luminaries.filter((l) =>
    `${l.position} ${l.profession}`.toLowerCase().match(/medicine|health|surgeon|dr\./)
  ).length;
  const govCount = luminaries.filter((l) =>
    `${l.position} ${l.profession}`.toLowerCase().match(/minister|law|governance|constitution|policy/)
  ).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 text-xs sm:text-sm font-bold backdrop-blur-md transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-500/90 text-white border-emerald-400'
              : toastMessage.type === 'error'
              ? 'bg-rose-500/90 text-white border-rose-400'
              : 'bg-slate-900/90 text-white border-slate-700'
          }`}
        >
          <span>{toastMessage.text}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-white/80 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-linear-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 dark:border-amber-500/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Award className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Admin Control Panel • Hall of Fame Governance</span>
          </div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Distinguished Positions &amp; Luminaries
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Curate top career positions, national figures, and global leaders displayed on the portal. Access is strictly authorized for verified Notre Dame administrative profiles.
          </p>
          <div className="flex items-center gap-2 mt-3 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Admin Accounts: <span className="font-mono text-slate-700 dark:text-slate-300">{ADMIN_EMAILS.join(', ')}</span></span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-slate-950" />
            <span>Add Luminary Position</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold transition-all cursor-pointer"
            title="Reset positions to default roster"
          >
            <RotateCcw className="w-4 h-4 text-slate-400" />
            <span>Reset Roster</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSqlModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold transition-all cursor-pointer"
            title="View Supabase SQL schema"
          >
            <Database className="w-4 h-4 text-blue-500" />
            <span>SQL Schema</span>
          </button>
        </div>
      </div>

      {/* Key Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Positions</div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
            {luminaries.length}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Active Hall of Fame</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-blue-500">Tech &amp; AI</div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
            {techCount}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Silicon Valley &amp; Engg</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-500">Medicine &amp; Health</div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
            {medicineCount}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Surgeons &amp; Pioneers</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-500">Governance &amp; Law</div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
            {govCount}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">State &amp; Judiciary</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, position, institution, or batch..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
          />
        </div>

        {/* Categories */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs font-bold">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'tech', label: 'Tech & AI' },
              { id: 'medicine', label: 'Medicine' },
              { id: 'governance', label: 'Governance' },
              { id: 'academia', label: 'Academia' },
              { id: 'global', label: 'Global' },
            ] as { id: EliteCategory; label: string }[]
          ).map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Luminaries List / Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredList.map((alumnus) => (
          <div
            key={alumnus.id}
            className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:border-amber-400/60 dark:hover:border-amber-500/40 hover:shadow-md transition-all flex flex-col justify-between group relative"
          >
            <div>
              <div className="flex items-start gap-3.5 mb-3.5">
                <img
                  src={alumnus.avatarUrl}
                  alt={alumnus.fullName}
                  className="w-14 h-14 rounded-2xl object-cover ring-2 ring-slate-100 dark:ring-slate-800 shadow-xs shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                      Batch {alumnus.batchYear}
                    </span>
                    {alumnus.country && (
                      <span className="text-[10px] font-medium text-slate-400 flex items-center gap-0.5">
                        <MapPin className="w-2.5 h-2.5" />
                        {alumnus.city ? `${alumnus.city}, ` : ''}{alumnus.country}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white mt-1 truncate">
                    {alumnus.fullName}
                  </h3>
                  <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 truncate mt-0.5">
                    {alumnus.position || alumnus.profession}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {alumnus.institution}
                  </div>
                </div>
              </div>

              {/* Bio snippet */}
              {alumnus.bio && (
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed mb-3">
                  {alumnus.bio}
                </p>
              )}

              {/* Key specialties */}
              {alumnus.specialty && alumnus.specialty.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {alumnus.specialty.slice(0, 3).map((spec, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Admin Action Buttons */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono text-slate-400">
                ID: #{alumnus.id}
              </span>

              <div className="flex items-center gap-1.5">
                {onViewProfile && (
                  <button
                    type="button"
                    onClick={() => onViewProfile(alumnus.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors"
                    title="View Profile"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => openEditModal(alumnus)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-xs font-bold transition-colors cursor-pointer"
                  title="Edit details"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(alumnus.id, alumnus.fullName)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 text-xs font-bold transition-colors cursor-pointer"
                  title="Remove from Hall of Fame"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredList.length === 0 && (
          <div className="col-span-full py-16 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <Award className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              No matching distinguished positions found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Try adjusting your search criteria or add a new luminary position.
            </p>
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs mt-4 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Luminary Position</span>
            </button>
          </div>
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      {isEditorOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsEditorOpen(false);
          }}
        >
          <div className="relative max-w-2xl w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    {editingAlumnus ? `Edit: ${editingAlumnus.fullName}` : 'Add New Distinguished Luminary'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Notre Dame Hall of Fame &amp; Top Executive Leadership Positions
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="col-span-full">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name &amp; Honors *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Prof. Dr. Jamilur Reza Choudhury"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white"
                  />
                </div>

                {/* Batch & Session */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Batch Year (Numeric) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="80"
                    required
                    value={formBatch}
                    onChange={(e) => setFormBatch(e.target.value)}
                    placeholder="58"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Session Label (e.g. 1954-56 or HSC 2008)
                  </label>
                  <input
                    type="text"
                    value={formSession}
                    onChange={(e) => setFormSession(e.target.value)}
                    placeholder="e.g. 1959-61"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white"
                  />
                </div>

                {/* Position Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Leadership Title / Position *
                  </label>
                  <input
                    type="text"
                    required
                    value={formPosition}
                    onChange={(e) => setFormPosition(e.target.value)}
                    placeholder="e.g. Founder &amp; Chairperson / Chief Medical Officer"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white"
                  />
                </div>

                {/* Organization / Institution */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Organization / Institution *
                  </label>
                  <input
                    type="text"
                    required
                    value={formInstitution}
                    onChange={(e) => setFormInstitution(e.target.value)}
                    placeholder="e.g. BRAC / University of Asia Pacific"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white"
                  />
                </div>

                {/* Sector Category */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Sector Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as EliteCategory)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white"
                  >
                    <option value="tech">Tech &amp; AI (Silicon Valley / Engineering)</option>
                    <option value="medicine">Medicine &amp; Healthcare (Surgeons / Clinical)</option>
                    <option value="governance">Governance &amp; Public Policy (National Service)</option>
                    <option value="academia">Academia &amp; Higher Education (Chancellors)</option>
                    <option value="global">Global Leadership (Humanitarian / Multinationals)</option>
                  </select>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Location (City &amp; Country)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={formCity}
                      onChange={(e) => setFormCity(e.target.value)}
                      placeholder="Dhaka"
                      className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                    />
                    <input
                      type="text"
                      value={formCountry}
                      onChange={(e) => setFormCountry(e.target.value)}
                      placeholder="Bangladesh"
                      className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Photo URL & Presets */}
                <div className="col-span-full">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Photo URL
                  </label>
                  <input
                    type="url"
                    value={formAvatar}
                    onChange={(e) => setFormAvatar(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white mb-2"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Quick Avatars:</span>
                    {SAMPLE_AVATARS.map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setFormAvatar(url)}
                        className={`w-7 h-7 rounded-full overflow-hidden border-2 transition-all cursor-pointer ${
                          formAvatar === url ? 'border-amber-500 scale-110 shadow-xs' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={url} alt={`Preset ${i}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Key Achievements */}
                <div className="col-span-full">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Key Specialties &amp; Honors (comma separated)
                  </label>
                  <input
                    type="text"
                    value={formAchievements}
                    onChange={(e) => setFormAchievements(e.target.value)}
                    placeholder="e.g. Padma Bridge Chief Expert, Ekushey Padak, National Professor"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white"
                  />
                </div>

                {/* Short Bio */}
                <div className="col-span-full">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Bio &amp; Impact Summary
                  </label>
                  <textarea
                    rows={3}
                    value={formBio}
                    onChange={(e) => setFormBio(e.target.value)}
                    placeholder="Brief description of their journey, contributions, and leadership..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
                >
                  {editingAlumnus ? 'Save Changes' : 'Add to Hall of Fame'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SQL GUIDE MODAL */}
      {showSqlModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSqlModal(false);
          }}
        >
          <div className="relative max-w-3xl w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-white">
            <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    Supabase Schema: public.featured_alumni
                  </h3>
                  <p className="text-xs text-slate-400">
                    File: <code className="text-amber-400 font-mono">/supabase_featured_alumni_schema.sql</code>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`-- Run in Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS public.featured_alumni (
    id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
    full_name TEXT NOT NULL,
    avatar_url TEXT NOT NULL DEFAULT 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    cover_url TEXT DEFAULT '',
    batch_year INT NOT NULL CHECK (batch_year >= 1 AND batch_year <= 2100),
    session TEXT,
    academic_group TEXT DEFAULT 'Science',
    college_roll TEXT,
    profession TEXT NOT NULL,
    position TEXT NOT NULL,
    institution TEXT NOT NULL,
    city TEXT DEFAULT 'Dhaka',
    country TEXT DEFAULT 'Bangladesh',
    category TEXT DEFAULT 'all' CHECK (category IN ('all', 'tech', 'medicine', 'governance', 'academia', 'global')),
    specialties TEXT[] DEFAULT '{}',
    degrees TEXT[] DEFAULT '{}',
    badges TEXT[] DEFAULT '{}',
    bio TEXT,
    career_history TEXT[] DEFAULT '{}',
    display_order INT DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);`);
                    setCopiedSql(true);
                    setTimeout(() => setCopiedSql(false), 2000);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Copied' : 'Copy SQL'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSqlModal(false)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs font-mono bg-slate-950 text-slate-300">
              <p className="text-slate-400 font-sans text-xs">
                The application saves changes directly into local persistent state and automatically syncs to Supabase whenever connection is active. Only designated admins can perform write/update/delete operations.
              </p>
              <pre className="p-4 rounded-2xl bg-slate-900 border border-slate-800 overflow-x-auto text-[11px] leading-relaxed text-blue-300">
{`-- Public read, Admin write RLS Policies:
ALTER TABLE public.featured_alumni ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view featured alumni"
    ON public.featured_alumni FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins can insert featured alumni"
    ON public.featured_alumni FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.alumni_profiles
            WHERE alumni_profiles.auth_user_id = auth.uid()
              AND alumni_profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can update featured alumni"
    ON public.featured_alumni FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.alumni_profiles
            WHERE alumni_profiles.auth_user_id = auth.uid()
              AND alumni_profiles.role = 'admin'
        )
    );`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
