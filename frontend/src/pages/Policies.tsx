import { FileText, BookOpen, Shield, Users, Clock, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';

export const Policies = () => {
  const policies = [
    {
      title: 'Code of Conduct',
      description: 'Guidelines for professional behavior and ethical standards',
      icon: Shield,
      color: 'from-purple-500 to-violet-600',
    },
    {
      title: 'Leave Policy',
      description: 'Rules and regulations regarding employee leave and time off',
      icon: Clock,
      color: 'from-emerald-500 to-teal-600',
    },
    {
      title: 'Performance Review',
      description: 'Process and criteria for employee performance evaluations',
      icon: Award,
      color: 'from-amber-500 to-orange-600',
    },
    {
      title: 'Employee Handbook',
      description: 'Comprehensive guide to company policies and procedures',
      icon: BookOpen,
      color: 'from-indigo-500 to-blue-600',
    },
    {
      title: 'Diversity & Inclusion',
      description: 'Commitment to creating an inclusive workplace environment',
      icon: Users,
      color: 'from-fuchsia-500 to-pink-600',
    },
    {
      title: 'Documentation',
      description: 'All official HR documents and policy updates',
      icon: FileText,
      color: 'from-cyan-500 to-blue-600',
    },
  ];

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 min-h-screen relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent mb-2">Policies</h1>
          <p className="text-slate-400">HR policies and procedures</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {policies.map((policy, index) => {
            const Icon = policy.icon;
            return (
              <motion.div
                key={policy.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="border border-slate-700 bg-slate-800/50 backdrop-blur-xl hover:shadow-lg hover:shadow-purple-500/20 transition-all cursor-pointer hover:scale-105">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className={`bg-gradient-to-br ${policy.color} p-3 rounded-xl shadow-lg`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <CardTitle className="text-white">{policy.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-300">{policy.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

