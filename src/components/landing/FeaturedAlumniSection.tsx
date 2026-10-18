import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  Building2,
  MapPin,
  GraduationCap,
  Award,
  ArrowRight,
  Users,
  Sparkles,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Star,
  ExternalLink,
  Plus,
  Settings,
  Pencil,
  Trash2,
  RotateCcw,
  Check,
  X,
  Database,
  Globe,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { AlumniProfile } from '../../types';
import {
  MagneticWrap,
  ScrollReveal,
  Tilt3DCard,
} from '../motion/CinematicMotion';
import { useAuth } from '../../context/AuthContext';
import {
  loadFeaturedAlumni,
  fetchFeaturedAlumniFromDb,
  addFeaturedAlumnus,
  updateFeaturedAlumnus,
  deleteFeaturedAlumnus,
  resetFeaturedAlumniToDefault,
  INITIAL_FEATURED_ALUMNI,
  EliteCategory,
  isAlumnusAdmin
} from '../../utils/featuredAlumniService';

// Export for backward compatibility
export const FAMOUS_NOTREDAMIANS = INITIAL_FEATURED_ALUMNI;

interface FeaturedAlumniSectionProps {
  alumniList: AlumniProfile[];
  onSelectAlumnus: (alumnus: AlumniProfile) => void;
  onExploreDirectory: () => void;
  onNavigate?: (route: string) => void;
}

export const FeaturedAlumniSection: React.FC<FeaturedAlumniSectionProps> = ({
  alumniList,
  onSelectAlumnus,
  onExploreDirectory,
  onNavigate,
}) => {
  const { currentUser } = useAuth();
  
  // Admin privileges strictly granted to authorized admin profiles whose gmail/role is set as admin
  const isRealAdmin = isAlumnusAdmin(currentUser);
  const isAdminActive = isRealAdmin;

  // Active Category & Scrolling
  const [activeCategory, setActiveCategory] = useState<EliteCategory>('all');
  const [isAutoScrolling, setIsAutoScrolling] = useState<boolean>(true);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Managed Luminaries State
  const [luminaries, setLuminaries] = useState<AlumniProfile[]>(() => loadFeaturedAlumni());
  
  // Admin Management Modal State
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'manage' | 'add' | 'guide'>('manage');
  const [editingItem, setEditingItem] = useState<AlumniProfile | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form Fields State
  const [formName, setFormName] = useState('');
  const [formBatch, setFormBatch] = useState('58');
  const [formSession, setFormSession] = useState('2006-08 (HSC 2008)');
  const [formPosition, setFormPosition] = useState('');
  const [formInstitution, setFormInstitution] = useState('');
  const [formProfession, setFormProfession] = useState('');
  const [formCity, setFormCity] = useState('Dhaka');
  const [formCountry, setFormCountry] = useState('Bangladesh');
  const [formCategory, setFormCategory] = useState<EliteCategory>('tech');
  const [formAvatar, setFormAvatar] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80');
  const [formBadges, setFormBadges] = useState('');
  const [formBio, setFormBio] = useState('');

  // Listen to external service updates and pull from Supabase on mount
  useEffect(() => {
    let isMounted = true;
    fetchFeaturedAlumniFromDb().then((data) => {
      if (isMounted && data && data.length > 0) {
        setLuminaries(data);
      }
    });

    const handleUpdate = (e: Event) => {
      const custom = e as CustomEvent<{ list: AlumniProfile[] }>;
      if (custom.detail?.list) {
        setLuminaries(custom.detail.list);
      }
    };
    window.addEventListener('ndc_featured_luminaries_updated', handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('ndc_featured_luminaries_updated', handleUpdate);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Combine curated luminaries with passed alumniList
  const allProminentAlumni = useMemo(() => {
    const combined = [...luminaries];
    if (alumniList && alumniList.length > 0) {
      alumniList.forEach((userAlumnus, idx) => {
        const sameName = combined.some(
          (p) => p.fullName.toLowerCase() === userAlumnus.fullName.toLowerCase()
        );
        if (!sameName) {
          const hasSameId = combined.some((p) => p.id === userAlumnus.id);
          combined.push(
            hasSameId
              ? { ...userAlumnus, id: 700000 + userAlumnus.id + idx }
              : userAlumnus
          );
        }
      });
    }
    return combined;
  }, [luminaries, alumniList]);

  // Filter based on active career category
  const filteredAlumni = useMemo(() => {
    switch (activeCategory) {
      case 'tech':
        return allProminentAlumni.filter(
          (a) =>
            a.profession?.toLowerCase().includes('software') ||
            a.profession?.toLowerCase().includes('cloud') ||
            a.profession?.toLowerCase().includes('engineer') ||
            a.position?.toLowerCase().includes('architect') ||
            a.position?.toLowerCase().includes('google') ||
            a.position?.toLowerCase().includes('aws') ||
            a.specialty?.some((s) => s.toLowerCase().includes('cloud') || s.toLowerCase().includes('ai'))
        );
      case 'medicine':
        return allProminentAlumni.filter(
          (a) =>
            a.profession?.toLowerCase().includes('surgeon') ||
            a.profession?.toLowerCase().includes('chemist') ||
            a.profession?.toLowerCase().includes('cardio') ||
            a.profession?.toLowerCase().includes('doctor') ||
            a.position?.toLowerCase().includes('surgery') ||
            a.specialty?.some((s) => s.toLowerCase().includes('cardiac') || s.toLowerCase().includes('cancer'))
        );
      case 'governance':
        return allProminentAlumni.filter(
          (a) =>
            a.profession?.toLowerCase().includes('jurist') ||
            a.profession?.toLowerCase().includes('servant') ||
            a.profession?.toLowerCase().includes('economist') ||
            a.profession?.toLowerCase().includes('humanitarian') ||
            a.position?.toLowerCase().includes('commissioner') ||
            a.position?.toLowerCase().includes('governor') ||
            a.position?.toLowerCase().includes('constitution') ||
            a.position?.toLowerCase().includes('chairperson')
        );
      case 'academia':
        return allProminentAlumni.filter(
          (a) =>
            a.profession?.toLowerCase().includes('professor') ||
            a.profession?.toLowerCase().includes('researcher') ||
            a.position?.toLowerCase().includes('professor') ||
            a.position?.toLowerCase().includes('vice-chancellor') ||
            a.position?.toLowerCase().includes('buet')
        );
      case 'global':
        return allProminentAlumni.filter(
          (a) =>
            a.country?.toLowerCase() !== 'bangladesh' ||
            a.position?.toLowerCase().includes('global') ||
            a.institution?.toLowerCase().includes('london') ||
            a.institution?.toLowerCase().includes('california') ||
            a.institution?.toLowerCase().includes('boston') ||
            a.institution?.toLowerCase().includes('seattle')
        );
      default:
        return allProminentAlumni;
    }
  }, [allProminentAlumni, activeCategory]);

  // Smooth continuous auto-scrolling effect
  useEffect(() => {
    const container = carouselRef.current;
    if (!container) return;

    let animationFrameId: number;
    const speed = 0.8; // px per tick

    const step = () => {
      if (isAutoScrolling && !isHovered && container) {
        if (container.scrollLeft >= container.scrollWidth - container.clientWidth - 1) {
          container.scrollLeft = 0;
        } else {
          container.scrollLeft += speed;
        }
      }
      animationFrameId = requestAnimationFrame(step);
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isAutoScrolling, isHovered, filteredAlumni]);

  const handleManualScroll = (direction: 'left' | 'right') => {
    const container = carouselRef.current;
    if (!container) return;
    const scrollAmount = 360;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  // Open Add modal
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormName('');
    setFormBatch('58');
    setFormSession('2006-08 (HSC 2008)');
    setFormPosition('');
    setFormInstitution('');
    setFormProfession('');
    setFormCity('Dhaka');
    setFormCountry('Bangladesh');
    setFormCategory('tech');
    setFormAvatar('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80');
    setFormBadges('Distinguished Leader, NDC Alumnus');
    setFormBio('');
    setModalTab('add');
    setIsManageModalOpen(true);
  };

  // Open Edit modal
  const handleOpenEdit = (item: AlumniProfile, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingItem(item);
    setFormName(item.fullName);
    setFormBatch(String(item.batchYear || 50));
    setFormSession(item.session || `HSC Batch ${item.batchYear}`);
    setFormPosition(item.position || '');
    setFormInstitution(item.institution || '');
    setFormProfession(item.profession || '');
    setFormCity(item.city || 'Dhaka');
    setFormCountry(item.country || 'Bangladesh');
    setFormAvatar(item.avatarUrl || '');
    setFormBadges(item.badges ? item.badges.join(', ') : '');
    setFormBio(item.bio || '');
    setModalTab('add');
    setIsManageModalOpen(true);
  };

  // Handle Delete
  const handleDeleteItem = (id: number, name: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm(`Are you sure you want to remove "${name}" from Featured Luminaries?`)) {
      const ok = deleteFeaturedAlumnus(id);
      if (ok) {
        setLuminaries(loadFeaturedAlumni());
        showToast(`Removed "${name}" from Featured Positions.`);
      }
    }
  };

  // Handle Reset to Default Demo Data
  const handleResetDefaults = () => {
    if (window.confirm('Reset all featured alumni back to the original 12 curated Notredamians?')) {
      const res = resetFeaturedAlumniToDefault();
      setLuminaries(res);
      showToast('Reset back to curated original luminaries.');
    }
  };

  // Save Add/Edit form
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPosition.trim() || !formInstitution.trim()) {
      showToast('Please fill in Name, Position, and Institution.');
      return;
    }

    const badgeArray = formBadges
      .split(',')
      .map((b) => b.trim())
      .filter(Boolean);

    if (editingItem) {
      // Update existing
      updateFeaturedAlumnus(editingItem.id, {
        fullName: formName.trim(),
        batchYear: Number(formBatch) || 50,
        session: formSession.trim(),
        position: formPosition.trim(),
        institution: formInstitution.trim(),
        profession: formProfession.trim() || formPosition.trim(),
        city: formCity.trim(),
        country: formCountry.trim(),
        avatarUrl: formAvatar.trim(),
        badges: badgeArray,
        bio: formBio.trim(),
      });
      showToast(`Updated "${formName.trim()}" successfully.`);
    } else {
      // Add new
      addFeaturedAlumnus({
        fullName: formName.trim(),
        batchYear: Number(formBatch) || 50,
        session: formSession.trim(),
        position: formPosition.trim(),
        institution: formInstitution.trim(),
        profession: formProfession.trim() || formPosition.trim(),
        city: formCity.trim(),
        country: formCountry.trim(),
        avatarUrl: formAvatar.trim(),
        badges: badgeArray,
        bio: formBio.trim(),
      });
      showToast(`Added "${formName.trim()}" to Featured Luminaries.`);
    }

    setLuminaries(loadFeaturedAlumni());
    setIsManageModalOpen(false);
  };

  return (
    <section className="py-5 sm:py-8 lg:py-12 max-w-7xl mx-auto px-4 sm:px-6 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs sm:text-sm font-bold border border-slate-700 dark:border-slate-300 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Section Header */}
      <ScrollReveal>
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-3.5 sm:mb-6 gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600 dark:text-blue-400" />
                <span>HALL OF FAME • PROMINENT NOTREDAMIANS</span>
              </div>

              {/* Admin Management Button - Strictly displayed ONLY for authenticated Admin profiles whose gmail is set as admin */}
              {isRealAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setModalTab('manage');
                    setIsManageModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 dark:bg-amber-400/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-[10px] sm:text-xs font-bold cursor-pointer hover:bg-amber-500/25 transition-all shadow-xs"
                  title="Admin Position Manager: Add, edit, or remove featured alumni positions"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Admin Manager ({luminaries.length} Positions)</span>
                </button>
              )}
            </div>

            <h2 className="text-xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Distinguished Alumni in Top Career Positions
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5 max-w-2xl">
              From Silicon Valley engineering leads to national constitutional architects, chief surgeons, and university chairmen—celebrating Notredamians who lead worldwide.
            </p>
          </div>

          {/* Filter Pills with mobile horizontal scroll */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto max-w-full no-scrollbar pb-1.5 sm:pb-1.5 md:flex-wrap self-start md:self-auto -mx-4 px-4 sm:mx-0 sm:px-1.5">
            {[
              { id: 'all', label: 'All Luminaries' },
              { id: 'tech', label: 'Tech & AI Giants' },
              { id: 'medicine', label: 'Medicine & Surgery' },
              { id: 'governance', label: 'Constitution & Governance' },
              { id: 'academia', label: 'Professors & Scientists' },
              { id: 'global', label: 'Global Diaspora (USA/UK)' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id as EliteCategory)}
                className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activeCategory === tab.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </ScrollReveal>

      {/* Interactive Controls & Admin Action Bar */}
      <div className="flex items-center justify-between mb-3 sm:mb-4 px-1 text-xs">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setIsAutoScrolling(!isAutoScrolling)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
              isAutoScrolling
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
            title={isAutoScrolling ? 'Click to pause auto-scrolling' : 'Click to resume auto-scrolling'}
          >
            {isAutoScrolling ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isAutoScrolling ? 'Auto-Scrolling Active' : 'Auto-Scroll Paused'}</span>
          </button>

          <span className="text-slate-400 text-[11px]">
            {filteredAlumni.length} Leaders
          </span>

          {/* Direct "+ Add Position" Button for Admins */}
          {isAdminActive && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg sm:rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Luminary</span>
            </button>
          )}
        </div>

        {/* Manual Left / Right Navigation Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleManualScroll('left')}
            className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-xs"
            aria-label="Scroll left"
            title="Scroll Left"
          >
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleManualScroll('right')}
            className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-xs"
            aria-label="Scroll right"
            title="Scroll Right"
          >
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      {/* Auto-scrolling Interactive Carousel Container */}
      <div
        ref={carouselRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="flex gap-3 sm:gap-5 overflow-x-auto pb-3 sm:pb-4 pt-1 sm:pt-2 no-scrollbar scroll-smooth cursor-grab active:cursor-grabbing select-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {filteredAlumni.map((alumnus, idx) => (
          <Tilt3DCard
            key={`${alumnus.id}-${idx}`}
            onClick={() => onSelectAlumnus(alumnus)}
            className="w-[82vw] min-[360px]:w-[280px] sm:w-[320px] lg:w-[350px] max-w-[340px] shrink-0 group glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-5 cursor-pointer flex flex-col justify-between relative overflow-hidden"
          >
            <div>
              {/* Profile Picture Header & Badges */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="relative">
                  <img
                    src={alumnus.avatarUrl}
                    alt={alumnus.fullName}
                    loading="lazy"
                    decoding="async"
                    className="avatar-interactive w-18 h-18 rounded-2xl object-cover border-2 border-slate-100 dark:border-slate-800 shadow-md bg-slate-100 dark:bg-slate-800"
                  />
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  <span className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 text-[11px] font-black tracking-tight">
                    Batch {alumnus.batchYear < 10 ? `0${alumnus.batchYear}` : alumnus.batchYear}
                  </span>
                  {alumnus.country && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                      {alumnus.country}
                    </span>
                  )}

                  {/* Admin Quick Action Pills on Card */}
                  {isAdminActive && (
                    <div className="flex items-center gap-1 mt-1 bg-white/90 dark:bg-slate-900/90 p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
                      <button
                        type="button"
                        onClick={(e) => handleOpenEdit(alumnus, e)}
                        className="p-1 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 rounded cursor-pointer transition-colors"
                        title="Edit Luminary"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteItem(alumnus.id, alumnus.fullName, e)}
                        className="p-1 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 rounded cursor-pointer transition-colors"
                        title="Remove Luminary"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Identity & Career Position */}
              <div className="space-y-1.5 mb-3">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-base font-black text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    {alumnus.fullName}
                  </h3>
                  <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                </div>

                {/* Top Carrier Position Badge */}
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 text-xs font-bold leading-tight">
                  <Briefcase className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="line-clamp-1">{alumnus.position}</span>
                </div>

                {/* Institution & Location */}
                <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5 line-clamp-1 font-medium mt-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{alumnus.institution}</span>
                </p>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{[alumnus.city, alumnus.country].filter(Boolean).join(', ')}</span>
                </p>
              </div>

              {/* Career Highlights / Specialties */}
              <div className="flex flex-wrap gap-1 mb-4">
                {alumnus.badges?.slice(0, 2).map((b) => (
                  <span
                    key={b}
                    className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-200/60 dark:border-blue-900/40"
                  >
                    {b}
                  </span>
                ))}
                {alumnus.specialty?.slice(0, 1).map((s) => (
                  <span
                    key={s}
                    className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-medium truncate max-w-[200px]"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Quick Profile View Action */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300">
              <span className="flex items-center gap-1">
                <span>View Full Career Bio</span>
              </span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Tilt3DCard>
        ))}
      </div>

      {/* Directory CTA */}
      <div className="text-center mt-10">
        <MagneticWrap>
          <button
            type="button"
            onClick={onExploreDirectory}
            className="btn-interactive inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-bold rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs transition-all cursor-pointer"
          >
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Search All 35,000+ Alumni in Directory</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </MagneticWrap>
      </div>

      {/* ============================================================ */}
      {/* ADMIN LUMINARY MANAGEMENT MODAL                             */}
      {/* ============================================================ */}
      {isManageModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    Featured Alumni &amp; Positions Management
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Add, edit, or remove distinguished career positions and luminaries
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsManageModalOpen(false);
                      onNavigate('admin');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold transition-all cursor-pointer shadow-xs"
                    title="Open Admin Hub"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden sm:inline">Open Inside Admin Panel</span>
                    <span className="sm:hidden">Admin Panel</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsManageModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 bg-white dark:bg-slate-900 gap-2 text-xs sm:text-sm font-bold">
              <button
                type="button"
                onClick={() => setModalTab('manage')}
                className={`py-3 px-3 border-b-2 cursor-pointer transition-colors ${
                  modalTab === 'manage'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Active Positions ({luminaries.length})
              </button>
              <button
                type="button"
                onClick={handleOpenAdd}
                className={`py-3 px-3 border-b-2 cursor-pointer transition-colors ${
                  modalTab === 'add'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {editingItem ? 'Edit Luminary' : '+ Add New Position'}
              </button>
              <button
                type="button"
                onClick={() => setModalTab('guide')}
                className={`py-3 px-3 border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
                  modalTab === 'guide'
                    ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Supabase &amp; Future Guide</span>
              </button>
            </div>

            {/* Tab 1: Manage Active Luminaries List */}
            {modalTab === 'manage' && (
              <div className="p-4 sm:p-6 max-h-[65vh] overflow-y-auto space-y-3">
                <div className="flex items-center justify-between pb-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Currently displaying <strong>{luminaries.length}</strong> prominent leaders in the carousel.
                  </span>
                  <button
                    type="button"
                    onClick={handleResetDefaults}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset to Defaults</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {luminaries.map((luminary) => (
                    <div
                      key={luminary.id}
                      className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={luminary.avatarUrl}
                          alt={luminary.fullName}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                              {luminary.fullName}
                            </h4>
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold shrink-0">
                              Batch {luminary.batchYear}
                            </span>
                          </div>
                          <p className="text-xs text-amber-700 dark:text-amber-300 font-bold truncate">
                            {luminary.position}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {luminary.institution} • {luminary.city}, {luminary.country}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(luminary)}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Pencil className="w-3 h-3" />
                          <span className="hidden sm:inline">Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(luminary.id, luminary.fullName)}
                          className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-xs font-bold transition-colors cursor-pointer"
                          title="Remove position"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 2: Add / Edit Form */}
            {modalTab === 'add' && (
              <form onSubmit={handleSaveForm} className="p-4 sm:p-6 max-h-[65vh] overflow-y-auto space-y-4 text-xs sm:text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Tanvir Ahmed Chowdhury"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden font-medium"
                    />
                  </div>

                  {/* Batch Year */}
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      HSC Batch *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={100}
                      value={formBatch}
                      onChange={(e) => setFormBatch(e.target.value)}
                      placeholder="e.g. 58"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden font-medium"
                    />
                  </div>

                  {/* Position */}
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Top Career Position / Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={formPosition}
                      onChange={(e) => setFormPosition(e.target.value)}
                      placeholder="e.g. Staff Engineering Lead & Cloud Architect"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden font-medium"
                    />
                  </div>

                  {/* Institution / Company */}
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Organization / Company *
                    </label>
                    <input
                      type="text"
                      required
                      value={formInstitution}
                      onChange={(e) => setFormInstitution(e.target.value)}
                      placeholder="e.g. Google Cloud (Silicon Valley, California)"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden font-medium"
                    />
                  </div>

                  {/* City */}
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={formCity}
                      onChange={(e) => setFormCity(e.target.value)}
                      placeholder="e.g. Mountain View, CA"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden font-medium"
                    />
                  </div>

                  {/* Country */}
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      value={formCountry}
                      onChange={(e) => setFormCountry(e.target.value)}
                      placeholder="e.g. United States or Bangladesh"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden font-medium"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Category
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as EliteCategory)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden font-medium"
                    >
                      <option value="tech">Tech &amp; AI Giants</option>
                      <option value="medicine">Medicine &amp; Surgery</option>
                      <option value="governance">Constitution &amp; Governance</option>
                      <option value="academia">Professors &amp; Scientists</option>
                      <option value="global">Global Diaspora (USA/UK)</option>
                    </select>
                  </div>

                  {/* Badges */}
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Badges (comma separated)
                    </label>
                    <input
                      type="text"
                      value={formBadges}
                      onChange={(e) => setFormBadges(e.target.value)}
                      placeholder="e.g. Google Staff Engineer, Silicon Valley Lead"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden font-medium"
                    />
                  </div>
                </div>

                {/* Avatar URL with Presets */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Photo URL
                  </label>
                  <input
                    type="text"
                    value={formAvatar}
                    onChange={(e) => setFormAvatar(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden font-medium mb-2"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">Presets:</span>
                    {[
                      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
                      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
                      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80',
                    ].map((url, i) => (
                      <button
                        key={url}
                        type="button"
                        onClick={() => setFormAvatar(url)}
                        className="w-6 h-6 rounded-full overflow-hidden border border-slate-300 hover:scale-110 transition-transform cursor-pointer"
                      >
                        <img src={url} alt={`Preset ${i}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Short Bio */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Career Bio / Summary
                  </label>
                  <textarea
                    rows={3}
                    value={formBio}
                    onChange={(e) => setFormBio(e.target.value)}
                    placeholder="Brief career highlights and impact..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden font-medium"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setModalTab('manage')}
                    className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>{editingItem ? 'Save Changes' : 'Publish Luminary'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Tab 3: Supabase & Future Admin Architecture Guide */}
            {modalTab === 'guide' && (
              <div className="p-4 sm:p-6 max-h-[65vh] overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 flex items-start gap-3">
                  <Info className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <div>
                    <h4 className="font-bold text-sm">How an Admin Manages This Now &amp; in the Future</h4>
                    <p className="text-xs mt-1">
                      Right now, your edits are saved instantly to local browser memory and mirrored to Supabase. When Supabase is connected, changes automatically persist in the cloud database for all users!
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    Three Ways Admins Will Manage Positions:
                  </h4>

                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
                      <span>Directly via the Web App UI (Zero Coding)</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 pl-7">
                      Any verified Admin or Moderator sees the <strong>"Admin Manager"</strong> button and quick <strong>[Edit]</strong> / <strong>[Remove]</strong> tools directly on each card. You can add new luminaries, update titles or companies, or delete outdated entries in seconds without opening any database tool.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
                      <span>Supabase Dashboard (Table Editor)</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 pl-7">
                      In your Supabase project, open the <strong>Table Editor</strong> and select the <code>featured_alumni</code> table. You can add new rows, edit columns like a spreadsheet, or change <code>is_active = false</code> to hide someone temporarily.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">3</span>
                      <span>SQL Migration &amp; Automation</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 pl-7">
                      A complete SQL migration file (<code>supabase_featured_alumni_schema.sql</code>) has been prepared with full Row Level Security (RLS) so only admins can modify rows, while all alumni can view them.
                    </p>
                  </div>
                </div>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setModalTab('manage')}
                    className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 font-bold transition-all cursor-pointer text-xs"
                  >
                    Back to Active Positions
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
