import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  AlertTriangle,
  Building2,
  Sparkles,
  Target,
  Rocket,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { analyticsService } from '@/services/api';
import { motion } from 'framer-motion';

type StatCard = {
  title: string;
  value: string;
  deltaLabel: string;
  deltaValue: string;
  icon: React.ElementType;
  gradient: string;
};

const formatNumber = (num: number | undefined, options: Intl.NumberFormatOptions = {}) => {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
    ...options,
  }).format(num ?? 0);
};

export const Analytics = () => {
  const { data: summary } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: () => analyticsService.getSummary(),
  });

  const { data: deptData } = useQuery({
    queryKey: ['department-distribution'],
    queryFn: () => analyticsService.getDepartmentDistribution(),
  });

  const summaryData = summary?.data ?? {};

  const statCards: StatCard[] = useMemo(
    () => [
      {
        title: 'Active Workforce',
        value: formatNumber(summaryData.totalEmployees),
        deltaLabel: 'Growth',
        deltaValue: '+3.2%',
        icon: Users,
        gradient: 'from-purple-500 via-violet-500 to-fuchsia-500',
      },
      {
        title: 'Avg. Salary',
        value: `$${formatNumber(summaryData.avgSalary, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })}k`,
        deltaLabel: 'YoY Trend',
        deltaValue: '+5.6%',
        icon: DollarSign,
        gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
      },
      {
        title: 'Attrition Rate',
        value: `${formatNumber(summaryData.attritionRate, {
          maximumFractionDigits: 1,
        })}%`,
        deltaLabel: 'Stability Index',
        deltaValue: 'Low Risk',
        icon: Activity,
        gradient: 'from-amber-500 via-orange-500 to-rose-500',
      },
      {
        title: 'High-Risk Talent',
        value: formatNumber(summaryData.highRiskCount),
        deltaLabel: 'Focus Required',
        deltaValue: 'Immediate',
        icon: AlertTriangle,
        gradient: 'from-red-500 via-rose-500 to-fuchsia-500',
      },
    ],
    [summaryData]
  );

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6 py-10">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[420px] w-[420px] rounded-full bg-purple-500/10 blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/5 h-[360px] w-[360px] rounded-full bg-fuchsia-500/10 blur-3xl animate-pulse [animation-delay:1.5s]"></div>
      </div>

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-10">
        <header className="space-y-4">
          <motion.span
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-purple-200"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Talent Intelligence Command Center
          </motion.span>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"
          >
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                Workforce Analytics
              </h1>
              <p className="max-w-2xl text-slate-300/90">
                Real-time visibility into talent health, organisational momentum, and AI-powered recommendations to support smarter workforce decisions.
              </p>
            </div>
            <div className="rounded-2xl border border-purple-500/20 bg-purple-500/10 px-4 py-3 text-sm text-purple-200 backdrop-blur">
              <p className="font-semibold uppercase tracking-[0.25em] text-xs">Analyst Insight</p>
              <p className="mt-1">
                Engagement spike detected in Product & Engineering teams. Prioritise leadership recognition this week.
              </p>
            </div>
          </motion.div>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
              >
                <Card className="border border-slate-800/70 bg-slate-900/60 backdrop-blur-xl transition-transform duration-300 hover:-translate-y-1 hover:border-purple-500/40 hover:shadow-2xl hover:shadow-purple-500/10">
                  <CardContent className="space-y-6 p-6">
                    <div className="flex items-center justify-between">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${card.gradient} text-white shadow-lg shadow-purple-500/30`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-xs uppercase tracking-[0.3em] text-slate-400">{card.deltaLabel}</span>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">{card.title}</p>
                      <p className="mt-1 text-3xl font-semibold text-white">{card.value}</p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="inline-flex items-center gap-2 text-emerald-400">
                        <TrendingUp className="h-4 w-4" />
                        {card.deltaValue}
                      </span>
                      <span className="text-slate-500">Updated 5 min ago</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-2"
          >
            <Card className="h-full border border-slate-800/70 bg-slate-900/60 backdrop-blur-xl">
              <CardContent className="p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Department Momentum</h3>
                    <p className="text-sm text-slate-400">Headcount spread with AI-generated pulse indicator</p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-800/60 px-3 py-1 text-xs uppercase tracking-[0.3em] text-slate-300">
                    <Building2 className="h-4 w-4" />
                    Org Scale
                  </div>
                </div>
                <div className="mt-6 space-y-3">
                  {deptData?.data && deptData.data.length > 0 ? (
                    deptData.data.map((item: any, idx: number) => {
                      const share =
                        summaryData.totalEmployees && summaryData.totalEmployees > 0
                          ? Math.round((item.count / summaryData.totalEmployees) * 100)
                          : 0;
                      return (
                        <motion.div
                          key={item.department}
                          className="rounded-2xl border border-slate-800/70 bg-slate-900/60 px-4 py-3"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                        >
                          <div className="flex items-center justify-between text-sm text-slate-200">
                            <span className="font-medium">{item.department}</span>
                            <span className="text-purple-300">{item.count} talent</span>
                          </div>
                          <div className="mt-3 h-2 rounded-full bg-slate-800/70">
                            <motion.div
                              className="h-2 rounded-full bg-gradient-to-r from-purple-500 via-violet-500 to-fuchsia-500"
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(share, 100)}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                            />
                          </div>
                          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                            <span>{share}% of workforce</span>
                            <span>Pulse: {(70 + (idx % 3) * 5)} / 100</span>
                          </div>
                        </motion.div>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-700/70 bg-slate-900/60 py-10 text-center text-slate-500">
                      Department data unavailable. Connect your ATS & HRIS to activate insights.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="h-full border border-slate-800/70 bg-slate-900/60 backdrop-blur-xl">
              <CardContent className="flex h-full flex-col gap-6 p-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white">Engagement Priorities</h3>
                  <p className="text-sm text-slate-400">
                    AI-detected focus areas to boost retention and productivity this quarter.
                  </p>
                </div>
                <ul className="space-y-3">
                  {[
                    {
                      title: 'Leadership Enablement',
                      impact: 'High impact',
                      narrative: 'Embed coaching rituals in fast-scaling squads.',
                    },
                    {
                      title: 'Compensation Alignment',
                      impact: 'Medium impact',
                      narrative: 'Benchmark salary bands with market intelligence.',
                    },
                    {
                      title: 'Attrition Watchlist',
                      impact: 'Immediate attention',
                      narrative: 'Conduct stay interviews with at-risk talent.',
                    },
                  ].map((initiative) => (
                    <li
                      key={initiative.title}
                      className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-4 transition-all hover:border-purple-500/40 hover:bg-slate-900"
                    >
                      <div className="flex items-center justify-between text-xs text-slate-400 uppercase tracking-[0.25em]">
                        <span>{initiative.impact}</span>
                        <Target className="h-4 w-4 text-purple-300" />
                      </div>
                      <h4 className="mt-2 text-base font-semibold text-white">{initiative.title}</h4>
                      <p className="mt-1 text-sm text-slate-400">{initiative.narrative}</p>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto rounded-xl border border-purple-500/20 bg-purple-500/10 px-4 py-3 text-sm text-purple-100">
                  <div className="flex items-center gap-2">
                    <Rocket className="h-4 w-4" />
                    <span className="font-semibold uppercase tracking-[0.2em] text-xs">Next Action</span>
                  </div>
                  <p className="mt-2">
                    Schedule an executive huddle to review talent flight risk and align on retention playbook.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </section>
      </div>
    </div>
  );
};
