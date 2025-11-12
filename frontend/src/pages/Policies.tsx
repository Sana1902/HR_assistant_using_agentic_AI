import { useState } from 'react';
import {
  Briefcase,
  UserCheck,
  Clock3,
  Calendar,
  Coins,
  TrendingUp,
  Shield,
  HeartPulse,
  Laptop2,
  LogOut,
  Scale,
  Bot,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { AnimatePresence, motion } from 'framer-motion';

type PolicySection = {
  title: string;
  description: string;
  icon: React.ElementType;
  accent: string;
  policies: string[];
};

const policySections: PolicySection[] = [
  {
    title: 'Employment & Hiring Policies',
    description:
      'Guidelines covering recruitment, selection, verification, and employment classifications across the organisation.',
    icon: Briefcase,
    accent: 'from-purple-500 via-violet-500 to-fuchsia-500',
    policies: [
      'Recruitment and Selection Policy',
      'Equal Employment Opportunity (EEO) Policy',
      'Background Verification Policy',
      'Employee Classification Policy (Full-time, Intern, Contract, etc.)',
      'Offer Letter and Appointment Policy',
      'Probation and Confirmation Policy',
    ],
  },
  {
    title: 'Employee Conduct & Workplace Ethics',
    description:
      'Policies that uphold professional behaviour, integrity, and respectful collaboration in every interaction.',
    icon: UserCheck,
    accent: 'from-rose-500 via-pink-500 to-fuchsia-500',
    policies: [
      'Code of Conduct Policy',
      'Anti-Harassment and Anti-Discrimination Policy',
      'Workplace Behavior and Discipline Policy',
      'Professional Ethics and Integrity Policy',
      'Conflict of Interest Policy',
      'Dress Code and Personal Appearance Policy',
      'Workplace Bullying and Grievance Redressal Policy',
    ],
  },
  {
    title: 'Attendance & Working Hours',
    description:
      'Frameworks for attendance tracking, scheduling flexibility, and productive work routines.',
    icon: Clock3,
    accent: 'from-cyan-500 via-sky-500 to-blue-500',
    policies: [
      'Attendance and Time Tracking Policy',
      'Working Hours and Break Policy',
      'Overtime Policy',
      'Work-from-Home / Remote Work Policy',
      'Flexible Working Hours Policy',
    ],
  },
  {
    title: 'Leave & Holidays',
    description:
      'Comprehensive leave structures, statutory entitlements, and company-wide holiday governance.',
    icon: Calendar,
    accent: 'from-emerald-500 via-green-500 to-teal-500',
    policies: [
      'Leave Policy (Casual, Sick, Earned, etc.)',
      'Maternity Leave Policy',
      'Paternity Leave Policy',
      'Compensatory Off Policy',
      'Public Holidays Policy',
      'Bereavement Leave Policy',
    ],
  },
  {
    title: 'Compensation & Benefits',
    description:
      'Structures that reward contribution, safeguard well-being, and ensure transparent payroll practices.',
    icon: Coins,
    accent: 'from-amber-500 via-orange-500 to-yellow-500',
    policies: [
      'Salary Structure Policy',
      'Incentive and Bonus Policy',
      'Payroll and Deductions Policy',
      'Reimbursement and Expense Policy',
      'Employee Benefits Policy (Health Insurance, PF, etc.)',
      'Gratuity and Retirement Benefits Policy',
    ],
  },
  {
    title: 'Performance & Growth',
    description:
      'Enablement programmes focused on capability building, career advancement, and performance culture.',
    icon: TrendingUp,
    accent: 'from-indigo-500 via-blue-500 to-purple-500',
    policies: [
      'Performance Appraisal Policy',
      'Promotion and Career Progression Policy',
      'Training and Development Policy',
      'Skill Enhancement / Upskilling Policy',
      'Performance Improvement Plan (PIP) Policy',
    ],
  },
  {
    title: 'IT, Security & Data Policies',
    description:
      'Protocols guarding digital infrastructure, information assets, and responsible technology use.',
    icon: Shield,
    accent: 'from-slate-500 via-slate-600 to-slate-700',
    policies: [
      'IT and Internet Usage Policy',
      'Data Protection and Privacy Policy',
      'Cybersecurity and Confidentiality Policy',
      'Social Media and Communication Policy',
      'Use of Company Assets Policy',
    ],
  },
  {
    title: 'Health, Safety & Well-being',
    description:
      'Initiatives that prioritise physical safety, mental wellness, and emergency readiness for all employees.',
    icon: HeartPulse,
    accent: 'from-red-500 via-rose-500 to-orange-500',
    policies: [
      'Workplace Health and Safety Policy',
      'Fire Safety and Emergency Response Policy',
      'Mental Health and Well-being Policy',
      'Ergonomics and Office Safety Policy',
    ],
  },
  {
    title: 'Remote & Hybrid Work',
    description:
      'Guidance for distributed teams on collaboration, communication, and remote-first effectiveness.',
    icon: Laptop2,
    accent: 'from-teal-500 via-cyan-500 to-blue-500',
    policies: [
      'Work-from-Home Policy',
      'Hybrid Work Policy',
      'Remote Team Collaboration Policy',
      'Digital Communication Policy',
    ],
  },
  {
    title: 'Separation & Exit',
    description:
      'Processes managing employee transitions, knowledge transfer, and compliant offboarding.',
    icon: LogOut,
    accent: 'from-purple-500 via-indigo-500 to-blue-500',
    policies: [
      'Resignation Policy',
      'Exit Interview Policy',
      'Clearance and Handover Policy',
      'Termination and Disciplinary Action Policy',
      'Final Settlement Policy',
    ],
  },
  {
    title: 'Legal & Compliance',
    description:
      'Mandatory policies aligned with statutory, ethical, and regulatory obligations worldwide.',
    icon: Scale,
    accent: 'from-slate-500 via-gray-500 to-zinc-500',
    policies: [
      'Whistleblower Policy',
      'Anti-Bribery and Corruption Policy',
      'Equal Opportunity and Diversity Policy',
      'POSH (Prevention of Sexual Harassment) Policy',
      'Non-Disclosure Agreement (NDA) Policy',
      'Employment Contract Policy',
    ],
  },
  {
    title: 'Modern & AI-Driven Policies',
    description:
      'Forward-looking guardrails supporting responsible AI, innovation, and inclusive growth mindsets.',
    icon: Bot,
    accent: 'from-fuchsia-500 via-purple-500 to-indigo-500',
    policies: [
      'AI Ethics and Data Handling Policy',
      'Remote Collaboration and Productivity Policy',
      'Diversity, Equity & Inclusion (DEI) Policy',
      'Innovation and Research Policy',
      'Intellectual Property Rights (IPR) Policy',
    ],
  },
];

const listItemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: 0.05 * i,
      duration: 0.25,
      ease: 'easeOut',
    },
  }),
};

export const Policies = () => {
  const [openSection, setOpenSection] = useState<string | null>(policySections[0]?.title ?? null);

  const toggleSection = (title: string) => {
    setOpenSection(prev => (prev === title ? null : title));
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 px-6 py-10">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 right-1/4 h-[430px] w-[430px] rounded-full bg-purple-500/10 blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-32 left-1/5 h-[360px] w-[360px] rounded-full bg-fuchsia-500/10 blur-3xl animate-pulse [animation-delay:1.5s]"></div>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl space-y-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="space-y-3"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-purple-200">
            <Sparkles className="h-3.5 w-3.5" />
            TalentFlow Policy Hub
          </span>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            Policies & Governance Framework
          </h1>
          <p className="max-w-3xl text-base md:text-lg text-slate-300/90 leading-relaxed">
            Explore the complete catalogue of TalentFlow HR policies spanning hiring, conduct,
            compensation, compliance, and our modern AI-first operating ethos. Each section offers
            ready-to-reference guidelines for employees, managers, and partners.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {policySections.map((section, index) => {
            const Icon = section.icon;
            const isOpen = openSection === section.title;
            return (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ delay: 0.05 * index, duration: 0.45, ease: 'easeOut' }}
              >
                <Card className="group h-full border border-slate-800/70 bg-slate-900/60 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-purple-500/40 hover:shadow-2xl hover:shadow-purple-500/10">
                  <button
                    type="button"
                    onClick={() => toggleSection(section.title)}
                    className="flex w-full items-start gap-4 rounded-2xl px-5 py-6 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60"
                    aria-expanded={isOpen}
                    aria-controls={`${section.title}-policies`}
                  >
                    <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${section.accent} text-white shadow-lg shadow-purple-500/30`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <h2 className="text-lg font-semibold text-white md:text-xl">
                            {section.title}
                          </h2>
                          <p className="text-sm text-slate-400 leading-relaxed">
                            {section.description}
                          </p>
                        </div>
                        <div className="mt-1 rounded-full border border-slate-700/60 bg-slate-800/60 p-2 text-slate-300 transition-transform duration-200 group-hover:border-purple-500/50 group-hover:text-white">
                          <ChevronDown
                            className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                          />
                        </div>
                      </div>
                    </div>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        id={`${section.title}-policies`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                      >
                        <CardContent className="pt-0 pb-6">
                          <motion.ul
                            initial="hidden"
                            animate="visible"
                            className="space-y-2.5"
                          >
                            {section.policies.map((policy, policyIndex) => (
                              <motion.li
                                key={policy}
                                custom={policyIndex}
                                variants={listItemVariants}
                                className="group/policy relative flex items-start gap-3 rounded-xl border border-slate-800/70 bg-slate-900/60 px-4 py-3 text-sm text-slate-200/90 transition-all hover:border-purple-500/40 hover:bg-slate-900"
                              >
                                <span className="mt-1 inline-flex h-2.5 w-2.5 flex-shrink-0 rounded-full bg-gradient-to-r from-purple-500 via-violet-500 to-fuchsia-500 transition-all duration-200 group-hover/policy:scale-125"></span>
                                <span className="leading-relaxed">{policy}</span>
                              </motion.li>
                            ))}
                          </motion.ul>
                        </CardContent>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

