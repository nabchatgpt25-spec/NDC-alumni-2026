import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ArrowRight
} from 'lucide-react';
import { ScrollReveal } from '../motion/CinematicMotion';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    question: 'How do you verify that someone is a real Notre Dame College student?',
    answer:
      'We use a 3-tier trust model: First, you sign up with your NDC roll number and batch year. To unlock full posting rights, you either get vouched by two already-verified classmates from your batch, or you upload a quick photo of your old NDC student ID card, library card, or batch souvenir page. This ensures zero outsiders and 100% authentic Notredamian brotherhood.',
  },
  {
    question: 'How does this network relate to the official College Authority lifetime membership?',
    answer:
      'The College Authority maintains official lifetime records. However, because those records are kept offline, this social platform was founded by alumni to connect our 35,000+ brothers daily in an active digital quad. As our verified member directory grows, our representatives will coordinate with the College Secretariat to synchronize and assist brothers in obtaining official lifetime membership cards.',
  },
  {
    question: 'What if I do not remember my exact college roll number?',
    answer:
      'No worries! You can enter your estimated roll or leave it to be verified via the "2-Brother Vouch" method. If two of your confirmed classmates from your batch confirm you were in their class, your profile will be approved without needing paperwork.',
  },
  {
    question: 'Are discussions in my Batch Lounge private from the public?',
    answer:
      'Yes. Batch Lounges are completely private to members of that specific batch. Outsiders, search engines, and members of other batches cannot view or access your private batch wall discussions.',
  },
  {
    question: 'How does the Brotherhood Mentorship program work?',
    answer:
      'Senior Notredamians working as software architects at Google/Microsoft, technology leaders, university professors at BUET/IBA, and overseas researchers actively post guidance and open their inboxes for junior college brothers. You can filter mentors by industry, city, or batch and connect directly.',
  },
];

interface FAQSectionProps {
  onOpenRegister: () => void;
}

const INITIAL_VISIBLE_COUNT = 2;

export const FAQSection: React.FC<FAQSectionProps> = ({ onOpenRegister }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [showAll, setShowAll] = useState<boolean>(false);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  const prefersReducedMotion = useReducedMotion();
  const visibleFaqs = showAll ? FAQS : FAQS.slice(0, INITIAL_VISIBLE_COUNT);

  return (
    <section className="py-5 sm:py-8 lg:py-10 max-w-4xl mx-auto px-4 sm:px-6">
      <ScrollReveal>
        <div className="text-center mb-3.5 sm:mb-5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1.5">
            <HelpCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Trust &amp; Verification</span>
          </div>
          <h2 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5 max-w-lg mx-auto">
            Key information on peer verification, batch lounge security, and membership.
          </p>
        </div>
      </ScrollReveal>

      <div className="space-y-2.5">
        {visibleFaqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <motion.div
              key={idx}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.4, delay: idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-blue-400/50 dark:hover:border-blue-500/40 overflow-hidden transition-all shadow-xs"
            >
              <button
                type="button"
                onClick={() => toggle(idx)}
                className="w-full p-3.5 sm:p-4 text-left flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors"
              >
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  {faq.question}
                </span>
                <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center flex-shrink-0">
                  {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={prefersReducedMotion ? { opacity: 1 } : { height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="px-3.5 pb-4 sm:px-4 sm:pb-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* See More / Show Less Toggle Button */}
      {FAQS.length > INITIAL_VISIBLE_COUNT && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer shadow-xs"
          >
            <span>
              {showAll
                ? 'Show Fewer Questions'
                : `See More Questions (${FAQS.length - INITIAL_VISIBLE_COUNT} more)`}
            </span>
            {showAll ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      <div className="mt-5 text-center">
        <button
          type="button"
          onClick={onOpenRegister}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
        >
          <span>Ready to join your batch? Register now</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </section>
  );
};
