import React from 'react';
import {
  Globe,
  MapPin,
  Building2,
  ArrowRight
} from 'lucide-react';

interface GlobalPresenceSectionProps {
  onOpenMap: () => void;
}

const GLOBAL_HUBS = [
  {
    country: 'Bangladesh',
    alumniCount: '28,000+',
    flag: '🇧🇩',
    cities: 'Dhaka, Chittagong, Sylhet, Rajshahi, Khulna',
    keyInstitutions: 'BUET, DU, IBA, Bangladesh Bank, Supreme Court, BEXIMCO, Grameenphone',
    badge: 'National Alma Mater',
  },
  {
    country: 'United States',
    alumniCount: '3,200+',
    flag: '🇺🇸',
    cities: 'San Francisco, New York, Boston, Seattle, Austin',
    keyInstitutions: 'Google, Microsoft, Harvard, MIT, Stanford, World Bank, Meta, Amazon',
    badge: 'North America Chapter',
  },
  {
    country: 'United Kingdom & Europe',
    alumniCount: '1,400+',
    flag: '🇬🇧',
    cities: 'London, Oxford, Cambridge, Manchester, Berlin',
    keyInstitutions: 'Oxford, Cambridge, LSE, Imperial College, Bloomberg, DeepMind',
    badge: 'UK & Europe Chapter',
  },
  {
    country: 'Canada',
    alumniCount: '950+',
    flag: '🇨🇦',
    cities: 'Toronto, Vancouver, Montreal, Ottawa, Calgary',
    keyInstitutions: 'University of Toronto, McGill, Waterloo, RBC, Shopify, NRC Canada',
    badge: 'Canada Chapter',
  },
  {
    country: 'Australia & New Zealand',
    alumniCount: '720+',
    flag: '🇦🇺',
    cities: 'Sydney, Melbourne, Brisbane, Perth, Auckland',
    keyInstitutions: 'Univ of Melbourne, UNSW, Sydney Univ, Atlassian, CSIRO, Monash',
    badge: 'Australia Chapter',
  },
  {
    country: 'Singapore & Asia-Pacific',
    alumniCount: '480+',
    flag: '🇸🇬',
    cities: 'Singapore, Tokyo, Kuala Lumpur, Seoul',
    keyInstitutions: 'National University of Singapore (NUS), NTU, Grab, Sea Group, Tokyo Tech',
    badge: 'Asia-Pacific Chapter',
  },
];

export const GlobalPresenceSection: React.FC<GlobalPresenceSectionProps> = ({
  onOpenMap,
}) => {
  return (
    <section id="map-section" className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Globe className="w-3.5 h-3.5" />
            <span>Worldwide Footprint</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Where Notredamians Make an Impact
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-xl">
            From the classrooms of Motijheel to world-renowned technology hubs, universities, research centers, and civic leadership across 30+ nations.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenMap}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer self-start md:self-auto"
        >
          <span>Open Interactive World Map</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Country Hub Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {GLOBAL_HUBS.map((hub) => (
          <div
            key={hub.country}
            onClick={onOpenMap}
            className="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/5 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{hub.flag}</span>
                  <div>
                    <h3 className="font-black text-base text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {hub.country}
                    </h3>
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      {hub.alumniCount} Notredamians
                    </span>
                  </div>
                </div>

                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {hub.badge}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                  <span className="font-medium">{hub.cities}</span>
                </div>

                <div className="flex items-start gap-2 text-slate-500 dark:text-slate-400 text-[11px]">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-2">{hub.keyInstitutions}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400">
              <span>View Alumni on Map</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
