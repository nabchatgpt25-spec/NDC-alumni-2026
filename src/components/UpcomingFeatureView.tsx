import React, { useState } from 'react';
import {
  Building2,
  GraduationCap,
  Newspaper,
  Calendar,
  Briefcase,
  HeartHandshake,
  Clock,
  BellRing,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Users
} from 'lucide-react';

export type UpcomingFeatureType =
  | 'institutions'
  | 'mentorship'
  | 'news'
  | 'events'
  | 'careers'
  | 'emergency';

interface UpcomingFeatureViewProps {
  type: UpcomingFeatureType;
  onNavigate?: (tab: string) => void;
}

interface FeatureMeta {
  title: string;
  subtitle: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  highlights: { title: string; desc: string; icon: string }[];
  timeline: string;
  targetAudience: string;
}

const INSTITUTIONS_CONFIG: FeatureMeta = {
  title: 'Institutions & Corporate Directory',
  subtitle: 'Alumni-led universities, tech firms, research laboratories & multinational enterprises',
  badge: 'SOON',
  icon: Building2,
  description:
    'A verified registry of premier universities, tech enterprises, research institutes, financial centers, and multinational organizations where Notre Dame College alumni serve in leadership and executive positions.',
  timeline: 'Q3 2026',
  targetAudience: 'Alumni seeking industry connections, corporate partnerships, and academic research collaboration',
  highlights: [
    {
      title: 'Executive & Department Leadership',
      desc: 'Direct contact info of Notredamians leading engineering, academic, financial, and strategic enterprise divisions.',
      icon: '🏛️',
    },
    {
      title: 'Global Chapter Connect',
      desc: 'Find alumni at Google, Microsoft, MIT, Harvard, World Bank, BUET, and top institutions globally.',
      icon: '🌍',
    },
    {
      title: 'Industry Partnerships',
      desc: 'Facilitating collaborative tech projects, research fellowships, and university faculty exchange.',
      icon: '🤝',
    },
    {
      title: 'Alumni Privileges & Discounts',
      desc: 'Exclusive corporate and educational benefits provided by alumni-owned enterprises.',
      icon: '💳',
    },
  ],
};

const FEATURE_CONFIGS: Record<UpcomingFeatureType, FeatureMeta> = {
  institutions: INSTITUTIONS_CONFIG,
  mentorship: {
    title: 'Notre Dame Global Mentorship Network',
    subtitle: 'Guiding the next generation of Notredamians from college to global careers',
    badge: 'SOON',
    icon: GraduationCap,
    description:
      'Connect fresh HSC graduates and university students with senior alumni professors, Silicon Valley engineers, civil servants, entrepreneurs, and business leaders for higher education and career guidance.',
    timeline: 'Launching Soon',
    targetAudience: 'College students, undergraduate Notredamians, and early-career professionals',
    highlights: [
      {
        title: '1-on-1 Mentorship Matching',
        desc: 'Pair with experienced alumni based on your targeted field (Engineering, Technology, Business, Law, Finance, etc.).',
        icon: '🤝',
      },
      {
        title: 'Global Grad School Admissions',
        desc: 'GRE, TOEFL, research SOP reviews, and university application masterclasses by alumni in USA, UK, and Canada.',
        icon: '✈️',
      },
      {
        title: 'BUET & Top University Admission Guidance',
        desc: 'Proven entrance exam tips, study tracks, and problem-solving workshops led by recent top rankers.',
        icon: '📚',
      },
      {
        title: 'Research & Innovation Fellowships',
        desc: 'Co-author journal publications with alumni researchers published in IEEE, ACM, arXiv, and Nature.',
        icon: '🔬',
      },
    ],
  },
  news: {
    title: 'Notre Dame Alumni Gazette & News',
    subtitle: 'Campus milestones, academic publications & Notredamian triumphs',
    badge: 'SOON',
    icon: Newspaper,
    description:
      'The central publication hub for Notre Dame College Alumni. Read official announcements, campus developments, club festivals, alumni achievements, and inspiring life reflections.',
    timeline: 'Next Release',
    targetAudience: 'All Notredamian batches, faculty members, and global well-wishers',
    highlights: [
      {
        title: 'Campus Highlights & Updates',
        desc: 'Academic milestones, club achievements (NDSC, NDDC, NDITC), and Father Principal bulletins.',
        icon: '📰',
      },
      {
        title: 'Alumni Spotlight & Honors',
        desc: 'In-depth interviews with Notredamians achieving national awards, innovations, and civic leadership.',
        icon: '🌟',
      },
      {
        title: 'Perspectives & Reflections',
        desc: 'Essays by alumni on science, culture, ethical leadership, and fond memories of college days.',
        icon: '✍️',
      },
      {
        title: 'Annual Souvenir & Gazette Archive',
        desc: 'Downloadable PDF versions of Blue & Gold yearbooks, reunion souvenirs, and historical college gazettes.',
        icon: '📑',
      },
    ],
  },
  events: {
    title: 'Alumni Events & Grand Reunions',
    subtitle: 'Platinum Jubilee celebrations, club reunions, sports fests & chapter dinners',
    badge: 'SOON',
    icon: Calendar,
    description:
      'Stay updated on upcoming Grand Reunions, Platinum Jubilee commemorations, regional chapter galas (Dhaka, North America, UK, Australia), batch addas, and national club festivals.',
    timeline: 'Annual Calendar 2026',
    targetAudience: 'All registered Notredamians from Batch 01 to the newest graduating class',
    highlights: [
      {
        title: 'NDC Grand Reunion 2026',
        desc: 'Early bird registration, souvenir bookings, and campus festival passes on the Motijheel grounds.',
        icon: '🎉',
      },
      {
        title: 'NDSC National Science Festival',
        desc: 'Alumni participation and judging at the annual pioneer science club extravaganza.',
        icon: '🔬',
      },
      {
        title: 'Global Chapter Gatherings',
        desc: 'Regional dinners and meetups organized by North America, UK, Europe, Australia, and Asia chapters.',
        icon: '📍',
      },
      {
        title: 'Inter-Batch Sports Tournament',
        desc: 'Annual football and basketball championships on the legendary Notre Dame sports fields.',
        icon: '🏆',
      },
    ],
  },
  careers: {
    title: 'Notredamian Career & Opportunities Portal',
    subtitle: 'Job openings, internships, fellowships & overseas professional placements',
    badge: 'SOON',
    icon: Briefcase,
    description:
      'An exclusive career board for the Notre Dame fraternity. Discover openings across software engineering, corporate finance, academic research, civil service consultancy, and international organizations.',
    timeline: 'Q3 2026',
    targetAudience: 'Graduated Notredamians seeking top career placements and leadership transitions',
    highlights: [
      {
        title: 'Corporate & Tech Job Board',
        desc: 'Verified openings from alumni-founded tech firms, multinationals, banks, and consultancies.',
        icon: '💼',
      },
      {
        title: 'Undergraduate Internships',
        desc: 'Fast-track internship opportunities for junior Notredamians studying at top universities.',
        icon: '🎓',
      },
      {
        title: 'Direct Alumni Referrals',
        desc: 'Get recommended directly by alumni working inside hiring organizations.',
        icon: '⭐',
      },
      {
        title: 'Startup & Angel Network',
        desc: 'Pitch decks and funding connect for Notredamian entrepreneurs building impactful startups.',
        icon: '🚀',
      },
    ],
  },
  emergency: {
    title: 'Alumni Mutual Aid & Fraternal Welfare Network',
    subtitle: 'Fraternal mutual aid, disaster relief & alumni emergency welfare fund',
    badge: 'SOON',
    icon: HeartHandshake,
    description:
      'A fraternal mutual aid network designed to assist Notredamians and their families in times of unexpected crisis, natural disasters, and hardship.',
    timeline: 'Emergency Desk Active',
    targetAudience: 'Any Notre Dame alumnus or family member needing urgent fraternal assistance',
    highlights: [
      {
        title: 'Fraternal Emergency Registry',
        desc: 'Rapid emergency support network among verified alumni chapters worldwide.',
        icon: '⚡',
      },
      {
        title: 'Legal & Advisory Assistance Desk',
        desc: 'Connect with senior alumni advocates, legal consultants, and administrative experts during family emergencies.',
        icon: '⚖️',
      },
      {
        title: 'Fr. Timm Alumni Welfare Fund',
        desc: 'Discretionary emergency assistance for alumni facing hardship or distress.',
        icon: '🛡️',
      },
      {
        title: 'Disaster Relief Cell',
        desc: 'Coordinating emergency relief mobilization during national flood and humanitarian crises.',
        icon: '🤝',
      },
    ],
  },
};

export const UpcomingFeatureView: React.FC<UpcomingFeatureViewProps> = ({ type, onNavigate }) => {
  const meta = FEATURE_CONFIGS[type];
  const Icon = meta.icon;

  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleNotifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
    setTimeout(() => {
      setEmail('');
    }, 4000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Banner Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-900 text-white p-6 sm:p-8 shadow-lg border border-blue-500/20">
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{meta.badge}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-white text-xs font-semibold">
              <Clock className="w-3.5 h-3.5 text-blue-200" />
              <span>Target: {meta.timeline}</span>
            </span>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shrink-0 shadow-inner">
              <Icon className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{meta.title}</h1>
              <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                {meta.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
      </div>

      {/* Description & Overview */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div>
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            About This Upcoming Feature
          </h2>
          <p className="text-sm text-slate-700 dark:text-slate-300 mt-2 leading-relaxed">
            {meta.description}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-3">
          <Users className="w-5 h-5 text-blue-600 shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-slate-900 dark:text-slate-100">Intended For: </span>
            <span className="text-slate-600 dark:text-slate-400">{meta.targetAudience}</span>
          </div>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div>
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 px-1">
          Planned Capabilities & Modules
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {meta.highlights.map((item, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2"
            >
              <div className="text-2xl mb-1">{item.icon}</div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{item.title}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Email Notification Call-to-Action */}
      <div className="p-6 sm:p-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800/80 dark:to-slate-800/40 rounded-3xl border border-blue-100 dark:border-slate-700 space-y-4">
        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-bold text-xs uppercase tracking-wider">
          <BellRing className="w-4 h-4" />
          <span>Stay Updated</span>
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
            Be Notified When This Module Launches
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Sign up to get early access notifications and contribute as a volunteer or chapter coordinator.
          </p>
        </div>

        {subscribed ? (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>Thank you! You will be notified as soon as this feature goes live.</span>
          </div>
        ) : (
          <form onSubmit={handleNotifySubmit} className="flex flex-col sm:flex-row gap-2.5 max-w-md">
            <input
              type="email"
              required
              placeholder="Enter your email address..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer whitespace-nowrap"
            >
              Notify Me
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
