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
  ExternalLink
} from 'lucide-react';
import { AlumniProfile } from '../../types';
import {
  MagneticWrap,
  ScrollReveal,
  Tilt3DCard,
} from '../motion/CinematicMotion';
import campusHeroImg from '../../assets/images/ndc_campus_hero_1790233370828.jpg';

interface FeaturedAlumniSectionProps {
  alumniList: AlumniProfile[];
  onSelectAlumnus: (alumnus: AlumniProfile) => void;
  onExploreDirectory: () => void;
}

type EliteCategory = 'all' | 'tech' | 'medicine' | 'governance' | 'academia' | 'global';

// Famous Notredamians holding top career positions worldwide
export const FAMOUS_NOTREDAMIANS: AlumniProfile[] = [
  {
    id: 1001,
    userId: 1001,
    fullName: 'Sir Fazle Hasan Abed KCMG',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    coverUrl: campusHeroImg,
    batchYear: 6,
    session: '1954-56 (Pioneer)',
    group: 'Science',
    collegeRoll: 'NDC-06-001',
    profession: 'Global Humanitarian & Social Pioneer',
    position: 'Founder & Chairperson Emeritus',
    institution: 'BRAC (World’s Largest Development Org)',
    city: 'Dhaka',
    country: 'Bangladesh',
    specialty: ['Global Social Enterprise', 'Poverty Alleviation', 'Public Health Infrastructure'],
    degree: ['HSC (Notre Dame College)', 'Cost Management Accounting (Glasgow)', 'Honorary Doctorates from Oxford, Columbia, Princeton'],
    badges: ['Pioneer Notredamian', 'Knight Commander (KCMG)', 'World Food Prize Laureate'],
    bio: 'Pioneer Notredamian who transformed global social development by founding BRAC. Dedicated his life to education, healthcare, and human dignity.',
    careerHistory: [
      'Founder and Chairperson, BRAC (1972–2019)',
      'Chancellor, BRAC University',
      'Knight Commander of the Most Distinguished Order of Saint Michael and Saint George (KCMG)',
      'World Food Prize Laureate (2015)'
    ],
    isPublic: true,
    online: false,
    postsCount: 18,
  },
  {
    id: 1002,
    userId: 1002,
    fullName: 'Prof. Dr. Jamilur Reza Choudhury',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    coverUrl: campusHeroImg,
    batchYear: 11,
    session: '1959-61',
    group: 'Science',
    collegeRoll: 'NDC-11-042',
    profession: 'Civil Engineer & National Professor',
    position: 'National Professor & Vice-Chancellor',
    institution: 'University of Asia Pacific & Ex-BUET / Adviser to Caretaker Govt',
    city: 'Dhaka',
    country: 'Bangladesh',
    specialty: ['Structural Engineering', 'Mega Infrastructure (Padma Bridge & Bangabandhu Bridge)', 'Earthquake Engineering'],
    degree: ['HSC (Notre Dame College)', 'BSc Civil Engg (BUET)', 'MSc & PhD (University of Southampton, UK)'],
    badges: ['National Professor', 'Ekushey Padak', 'Padma Bridge Chief Expert'],
    bio: 'One of the most prominent civil engineers in Asia. Chaired the International Panel of Experts for the Padma Multipurpose Bridge and Jamuna Bridge.',
    careerHistory: [
      'Chairman, Panel of Experts, Padma Multipurpose Bridge Project',
      'Vice-Chancellor, University of Asia Pacific & BRAC University',
      'Professor and Head of Civil Engineering, BUET',
      'Adviser to the Caretaker Government of Bangladesh (1996)'
    ],
    isPublic: true,
    online: false,
    postsCount: 14,
  },
  {
    id: 1003,
    userId: 1003,
    fullName: 'Dr. Kamal Hossain',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80',
    coverUrl: campusHeroImg,
    batchYear: 4,
    session: '1952-54',
    group: 'Humanities',
    collegeRoll: 'NDC-04-003',
    profession: 'Senior Jurist & Constitutional Lawyer',
    position: 'Chairman, Constitution Drafting Committee & Senior Advocate',
    institution: 'Supreme Court of Bangladesh & United Nations Rapporteur',
    city: 'Dhaka',
    country: 'Bangladesh',
    specialty: ['Constitutional Law', 'International Arbitration', 'Human Rights'],
    degree: ['HSC (Notre Dame College)', 'BA Jurisprudence & BCL (University of Oxford)', 'D.Phil (Oxford)'],
    badges: ['Author of Bangladesh Constitution', 'Father of Constitution', 'Oxford Fellow'],
    bio: 'Principal architect of the 1972 Constitution of Bangladesh. Senior Advocate of the Supreme Court, former Law Minister, Foreign Minister, and UN Special Rapporteur.',
    careerHistory: [
      'Chairman of the Constitution Drafting Committee of Bangladesh (1972)',
      'Minister of Law, Justice and Parliamentary Affairs (1972–1973)',
      'Minister of Foreign Affairs of Bangladesh (1973–1975)',
      'Member of the UN Human Rights Committee & International Arbitrator'
    ],
    isPublic: true,
    online: false,
    postsCount: 22,
  },
  {
    id: 1004,
    userId: 1004,
    fullName: 'Tanvir Ahmed Chowdhury',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    coverUrl: campusHeroImg,
    batchYear: 58,
    session: '2006-08 (HSC 2008)',
    group: 'Science',
    collegeRoll: '108112',
    profession: 'Staff Software & Systems Lead',
    position: 'Staff Engineering Lead & Cloud Architect',
    institution: 'Google Cloud (Silicon Valley, California)',
    city: 'Mountain View, CA',
    country: 'United States',
    specialty: ['Distributed Systems', 'Hyper-Scale Cloud Infrastructure', 'Generative AI Workloads'],
    degree: ['HSC (Notre Dame College)', 'BSc CSE (BUET)', 'MSc Computer Science (Stanford University)'],
    badges: ['Silicon Valley Chapter Lead', 'Google Staff Engineer', 'Top 1% Global Tech'],
    bio: 'Staff Engineering Lead at Google Cloud Silicon Valley designing hyper-scale distributed storage and next-gen AI inference platforms. Active mentor to younger Notredamians.',
    careerHistory: [
      'Staff Software Engineer & Tech Lead, Google Cloud (2020–Present)',
      'Senior Infrastructure Engineer, AWS Systems (2015–2020)',
      'Founding Member, Notre Dame Silicon Valley Alumni Circle'
    ],
    isPublic: true,
    online: true,
    postsCount: 31,
  },
  {
    id: 1005,
    userId: 1005,
    fullName: 'Dr. Faisal Kabir, MD, FACS',
    avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80',
    coverUrl: campusHeroImg,
    batchYear: 49,
    session: '1997-99 (HSC 1999)',
    group: 'Science',
    collegeRoll: '199045',
    profession: 'Cardiothoracic & Vascular Surgeon',
    position: 'Chief of Cardiovascular Surgery & Clinical Professor',
    institution: 'Global Heart Institute / Harvard Medical Affiliate',
    city: 'Boston, MA',
    country: 'United States',
    specialty: ['Minimally Invasive Cardiac Surgery', 'Aortic Valve Reconstruction', 'Heart Transplantation'],
    degree: ['HSC (Notre Dame College)', 'MBBS (Dhaka Medical College)', 'Fellow of the American College of Surgeons (FACS)'],
    badges: ['Chief Cardiac Surgeon', 'Harvard Medical Fellow', 'Global Healer Award'],
    bio: 'World-renowned cardiothoracic surgeon pioneering minimally invasive valve surgeries. Conducted over 4,500 open-heart procedures with leading survival outcomes.',
    careerHistory: [
      'Chief of Cardiovascular Surgery, Global Heart Institute (2018–Present)',
      'Clinical Associate Professor of Surgery, Harvard Medical School Teaching Hospitals',
      'Gold Medalist, Dhaka Medical College'
    ],
    isPublic: true,
    online: true,
    postsCount: 16,
  },
  {
    id: 1006,
    userId: 1006,
    fullName: 'Prof. Dr. Mahfuzur Rahman',
    avatarUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&auto=format&fit=crop&q=80',
    coverUrl: campusHeroImg,
    batchYear: 45,
    session: '1993-95 (HSC 1995)',
    group: 'Science',
    collegeRoll: '195021',
    profession: 'Computer Science Professor & AI Researcher',
    position: 'Professor & Department Chairman of CSE',
    institution: 'Bangladesh University of Engineering & Technology (BUET)',
    city: 'Dhaka',
    country: 'Bangladesh',
    specialty: ['Artificial Intelligence', 'Natural Language Processing for Bangla', 'Algorithm Engineering'],
    degree: ['HSC (Notre Dame College)', 'BSc CSE (BUET)', 'PhD in CS (National University of Singapore)'],
    badges: ['BUET CSE Chairman', 'National ICT Awardee', 'IEEE Senior Member'],
    bio: 'Distinguished Professor and Chair of CSE at BUET. Mentored generations of software engineers who now lead global tech and spearheaded national AI policy.',
    careerHistory: [
      'Chairman & Professor, Dept. of CSE, BUET (2016–Present)',
      'Advisor to National Digital Framework & ICT Division',
      'Principal Investigator, Bangla Language Computing Initiative'
    ],
    isPublic: true,
    online: false,
    postsCount: 29,
  },
  {
    id: 1007,
    userId: 1007,
    fullName: 'Dr. Atiur Rahman',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80',
    coverUrl: campusHeroImg,
    batchYear: 24,
    session: '1972-74',
    group: 'Humanities',
    collegeRoll: 'NDC-24-012',
    profession: 'Economist & Former Central Banker',
    position: 'Former Governor & Bangabandhu Chair Professor',
    institution: 'Bangladesh Bank & University of Dhaka',
    city: 'Dhaka',
    country: 'Bangladesh',
    specialty: ['Central Banking', 'Green Financial Policy', 'Financial Inclusion & Rural Banking'],
    degree: ['HSC (Notre Dame College)', 'BA & MA Economics (University of Dhaka)', 'PhD Economics (SOAS University of London)'],
    badges: ['Central Bank Governor of the Year', 'Bangabandhu Chair Professor', 'Green Banker Award'],
    bio: 'Served as the 10th Governor of Bangladesh Bank (2009–2016). Globally recognized as "The Green Governor" for pioneering financial inclusion, mobile money, and eco-banking.',
    careerHistory: [
      'Governor, Bangladesh Bank (2009–2016)',
      'Bangabandhu Chair Professor, Dept. of Development Studies, University of Dhaka',
      'Central Bank Governor of the Year for Asia-Pacific (The Banker Magazine, 2015)'
    ],
    isPublic: true,
    online: false,
    postsCount: 25,
  },
  {
    id: 1008,
    userId: 1008,
    fullName: 'Dr. Tariqul Islam',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80',
    coverUrl: campusHeroImg,
    batchYear: 52,
    session: '2000-02 (HSC 2002)',
    group: 'Science',
    collegeRoll: '102088',
    profession: 'Principal Cloud & Systems Architect',
    position: 'Principal Cloud Solutions Architect',
    institution: 'Amazon Web Services (AWS) Systems',
    city: 'Seattle, WA',
    country: 'United States',
    specialty: ['Cloud Infrastructure', 'Enterprise Security', 'Fault-Tolerant Architectures'],
    degree: ['HSC (Notre Dame College)', 'BSc EEE (BUET)', 'MSc Cloud Computing (Carnegie Mellon University)'],
    badges: ['AWS Principal Architect', 'CMU Alumnus', 'Batch 52 Secretary'],
    bio: 'Principal Cloud Architect at AWS designing resilient enterprise cloud frameworks for Fortune 500 organizations. Active organizer of North American Notredamian reunions.',
    careerHistory: [
      'Principal Cloud Solutions Architect, AWS (2019–Present)',
      'Lead Infrastructure Architect, Microsoft Azure (2014–2019)',
      'Organizing Secretary, Batch 52 Global Brotherhood'
    ],
    isPublic: true,
    online: true,
    postsCount: 20,
  },
  {
    id: 1009,
    userId: 1009,
    fullName: 'A.M.M. Nasir Uddin',
    avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop&q=80',
    coverUrl: campusHeroImg,
    batchYear: 21,
    session: '1969-71',
    group: 'Humanities',
    collegeRoll: 'NDC-21-008',
    profession: 'Constitutional Leader & Civil Servant',
    position: 'Chief Election Commissioner of Bangladesh',
    institution: 'Bangladesh Election Commission & Former Secretary to Govt',
    city: 'Dhaka',
    country: 'Bangladesh',
    specialty: ['Public Administration', 'Electoral Governance', 'State Institution Building'],
    degree: ['HSC (Notre Dame College)', 'BA & MA (University of Dhaka)', 'Public Policy Diploma (Harvard Kennedy School)'],
    badges: ['Chief Election Commissioner', 'Former Secretary to Govt', 'Constitutional Head'],
    bio: 'Chief Election Commissioner of Bangladesh and retired Senior Secretary to the Government. A veteran administrator dedicated to upholding electoral integrity and rule of law.',
    careerHistory: [
      'Chief Election Commissioner of Bangladesh (2024–Present)',
      'Secretary, Ministry of Information & Ministry of Health and Family Welfare',
      'Distinguished Member of Bangladesh Civil Service (BCS 1979)'
    ],
    isPublic: true,
    online: false,
    postsCount: 12,
  },
  {
    id: 1010,
    userId: 1010,
    fullName: 'Tahmidur Rahman',
    avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&auto=format&fit=crop&q=80',
    coverUrl: campusHeroImg,
    batchYear: 68,
    session: '2016-18 (HSC 2018)',
    group: 'Business Studies',
    collegeRoll: '218042',
    profession: 'Fintech Executive & Founder',
    position: 'Head of Fintech & Digital Banking',
    institution: 'Pathao Pay & Ex-IBA Innovator',
    city: 'Dhaka',
    country: 'Bangladesh',
    specialty: ['Fintech Product Architecture', 'Venture Growth', 'Digital Wallets & Payments'],
    degree: ['HSC (Notre Dame College)', 'BBA (Institute of Business Administration - IBA, University of Dhaka)'],
    badges: ['Fintech Leader', 'Ex-IBA Champion', 'Batch 68 Representative'],
    bio: 'Product leader driving digital payments infrastructure in South Asia. Co-architected wallet rails used by millions daily. Active mentor for youth entrepreneurship.',
    careerHistory: [
      'Head of Product & Fintech, Pathao (2022–Present)',
      'Growth Strategy Lead, Digital Commerce Ventures (2020–2022)',
      'President, Notre Dame Business Club (2017–2018)'
    ],
    isPublic: true,
    online: true,
    postsCount: 38,
  },
  {
    id: 1011,
    userId: 1011,
    fullName: 'Prof. Dr. K. M. Rahman',
    avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&auto=format&fit=crop&q=80',
    coverUrl: campusHeroImg,
    batchYear: 55,
    session: '2003-05 (HSC 2005)',
    group: 'Science',
    collegeRoll: '105104',
    profession: 'Medicinal Chemist & Cancer Drug Innovator',
    position: 'Professor of Medicinal Chemistry',
    institution: 'King’s College London (London, UK)',
    city: 'London',
    country: 'United Kingdom',
    specialty: ['Cancer Therapeutics', 'DNA-Targeted Drug Discovery', 'Antimicrobial Resistance'],
    degree: ['HSC (Notre Dame College)', 'BPharm (University of Dhaka)', 'PhD in Chemical Biology (University of London)'],
    badges: ['King’s College London Professor', 'Royal Society of Chemistry Fellow', 'Cancer Drug Innovator'],
    bio: 'Professor at King’s College London heading groundbreaking research into DNA-interactive anti-cancer therapeutics and novel antibiotic resistance solutions.',
    careerHistory: [
      'Professor of Medicinal Chemistry, King’s College London (2021–Present)',
      'Fellow of the Royal Society of Chemistry (FRSC)',
      'Inventor on 12 International Drug Discovery Patents'
    ],
    isPublic: true,
    online: false,
    postsCount: 19,
  },
  {
    id: 1012,
    userId: 1012,
    fullName: 'Engr. Masud Alam',
    avatarUrl: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&auto=format&fit=crop&q=80',
    coverUrl: campusHeroImg,
    batchYear: 40,
    session: '1988-90 (HSC 1990)',
    group: 'Science',
    collegeRoll: '190018',
    profession: 'Renewable Power Systems VP',
    position: 'Vice President of Global Grid Infrastructure',
    institution: 'GreenGrid Systems International',
    city: 'London',
    country: 'United Kingdom',
    specialty: ['Offshore Wind Grids', 'Renewable High Voltage Transmission', 'Smart Grid Automation'],
    degree: ['HSC (Notre Dame College)', 'BSc EEE (BUET)', 'MSc Power Systems (Imperial College London)'],
    badges: ['VP of Engineering', 'Imperial College Alumnus', 'Clean Energy Pioneer'],
    bio: 'Global power engineer heading multi-gigawatt offshore wind integration across Europe and Asia. Committed to sustainable energy transitions and technical education.',
    careerHistory: [
      'VP of Global Grid Infrastructure, GreenGrid Systems (2017–Present)',
      'Technical Director, Siemens Energy Transmission (2010–2017)',
      'Patron, Notre Dame Science Club (NDSC) Endowment'
    ],
    isPublic: true,
    online: true,
    postsCount: 15,
  }
];

export const FeaturedAlumniSection: React.FC<FeaturedAlumniSectionProps> = ({
  alumniList,
  onSelectAlumnus,
  onExploreDirectory,
}) => {
  const [activeCategory, setActiveCategory] = useState<EliteCategory>('all');
  const [isAutoScrolling, setIsAutoScrolling] = useState<boolean>(true);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Combine famous Notredamians with any registered high-ranking profiles
  const allProminentAlumni = useMemo(() => {
    const combined = [...FAMOUS_NOTREDAMIANS];
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
  }, [alumniList]);

  // Filter based on active career category
  const filteredAlumni = useMemo(() => {
    switch (activeCategory) {
      case 'tech':
        return allProminentAlumni.filter(
          (a) =>
            a.profession?.toLowerCase().includes('software') ||
            a.profession?.toLowerCase().includes('cloud') ||
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
            a.position?.toLowerCase().includes('surgery') ||
            a.specialty?.some((s) => s.toLowerCase().includes('cardiac') || s.toLowerCase().includes('cancer'))
        );
      case 'governance':
        return allProminentAlumni.filter(
          (a) =>
            a.profession?.toLowerCase().includes('jurist') ||
            a.profession?.toLowerCase().includes('servant') ||
            a.profession?.toLowerCase().includes('economist') ||
            a.position?.toLowerCase().includes('commissioner') ||
            a.position?.toLowerCase().includes('governor') ||
            a.position?.toLowerCase().includes('constitution')
        );
      case 'academia':
        return allProminentAlumni.filter(
          (a) =>
            a.profession?.toLowerCase().includes('professor') ||
            a.position?.toLowerCase().includes('professor') ||
            a.position?.toLowerCase().includes('vice-chancellor') ||
            a.position?.toLowerCase().includes('buet')
        );
      case 'global':
        return allProminentAlumni.filter(
          (a) =>
            a.country && a.country.toLowerCase() !== 'bangladesh'
        );
      case 'all':
      default:
        return allProminentAlumni;
    }
  }, [activeCategory, allProminentAlumni]);

  // Smooth continuous auto-scrolling effect
  useEffect(() => {
    const container = carouselRef.current;
    if (!container) return;

    let animationFrameId: number;
    const speed = 0.8; // px per tick

    const step = () => {
      if (isAutoScrolling && !isHovered && container) {
        // If reached end, smoothly loop back to start
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
    const scrollAmount = 360; // Card width approx
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <section className="py-5 sm:py-8 lg:py-12 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Section Header */}
      <ScrollReveal>
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-3.5 sm:mb-6 gap-3 sm:gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1.5">
              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600 dark:text-blue-400" />
              <span>HALL OF FAME • PROMINENT NOTREDAMIANS</span>
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

      {/* Interactive Auto-Scroll Controls & Status Bar */}
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
            className="w-[275px] sm:w-[320px] lg:w-[350px] shrink-0 group glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-5 cursor-pointer flex flex-col justify-between"
          >
            <div>
              {/* Profile Picture Header & Badges */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="relative">
                  <img
                    src={alumnus.avatarUrl}
                    alt={alumnus.fullName}
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
    </section>
  );
};

