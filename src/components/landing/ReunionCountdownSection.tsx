import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  Ticket,
  ArrowRight,
  Music,
  Award,
  BookOpen
} from 'lucide-react';

interface ReunionCountdownSectionProps {
  onRegisterPrompt: () => void;
}

export const ReunionCountdownSection: React.FC<ReunionCountdownSectionProps> = ({
  onRegisterPrompt,
}) => {
  // Target date: December 25, 2026
  const targetDate = new Date('2026-12-25T09:00:00');

  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date().getTime();
      const difference = targetDate.getTime() - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6">
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white p-8 sm:p-12 lg:p-14 border border-blue-900/40 shadow-2xl">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Event details */}
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold mb-4 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Upcoming Signature Milestone Event</span>
            </div>

            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight mb-4">
              Notre Dame Grand Reunion & Platinum Jubilee Gala
            </h2>

            <p className="text-xs sm:text-sm text-blue-100/80 leading-relaxed max-w-xl mb-6">
              The grandest congregation of Notre Dame College graduates. Rekindle cherished memories with mentors, Holy Cross fathers, seniors, batchmates, and juniors under the historic campus sky of Motijheel.
            </p>

            <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-xs text-blue-200 mb-8">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span>December 25–26, 2026</span>
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-amber-400" />
                <span>Notre Dame College Campus Grounds, Motijheel, Dhaka</span>
              </span>
            </div>

            {/* Event Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                <BookOpen className="w-4 h-4 text-blue-300 mb-1.5" />
                <div className="font-bold text-xs text-white">Scientific Symposium</div>
                <div className="text-[10px] text-blue-200">Keynotes & Research Papers</div>
              </div>

              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                <Award className="w-4 h-4 text-amber-300 mb-1.5" />
                <div className="font-bold text-xs text-white">Lifetime Honors</div>
                <div className="text-[10px] text-blue-200">Pioneer Batch & Teacher Awards</div>
              </div>

              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                <Music className="w-4 h-4 text-rose-300 mb-1.5" />
                <div className="font-bold text-xs text-white">Gala Dinner & Concert</div>
                <div className="text-[10px] text-blue-200">Cultural Performances & Feast</div>
              </div>
            </div>

            {/* Action */}
            <button
              type="button"
              onClick={onRegisterPrompt}
              className="px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg shadow-blue-600/30 transition-all cursor-pointer inline-flex items-center gap-2 group"
            >
              <Ticket className="w-4 h-4" />
              <span>Reserve Your Reunion Passes</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Right Column: Live Countdown Clock */}
          <div className="lg:col-span-5">
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-white/20 text-center">
              <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-200 mb-4">
                <Clock className="w-4 h-4 text-blue-400" />
                <span>Countdown to the Gathering</span>
              </div>

              <div className="grid grid-cols-4 gap-2.5 sm:gap-3 mb-6">
                {/* Days */}
                <div className="p-3 sm:p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col items-center">
                  <span className="text-2xl sm:text-4xl font-black text-white">
                    {timeLeft.days}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-blue-300 mt-1">Days</span>
                </div>

                {/* Hours */}
                <div className="p-3 sm:p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col items-center">
                  <span className="text-2xl sm:text-4xl font-black text-white">
                    {String(timeLeft.hours).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-blue-300 mt-1">Hours</span>
                </div>

                {/* Minutes */}
                <div className="p-3 sm:p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col items-center">
                  <span className="text-2xl sm:text-4xl font-black text-white">
                    {String(timeLeft.minutes).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-blue-300 mt-1">Mins</span>
                </div>

                {/* Seconds */}
                <div className="p-3 sm:p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col items-center">
                  <span className="text-2xl sm:text-4xl font-black text-amber-400">
                    {String(timeLeft.seconds).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-blue-300 mt-1">Secs</span>
                </div>
              </div>

              <p className="text-xs text-blue-200/90 leading-relaxed font-medium">
                Over <b className="text-white">1,500+ alumni</b> already pre-registered across batches. Make sure your batch is represented in full strength!
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
