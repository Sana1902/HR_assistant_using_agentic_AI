import { useState } from 'react';
import { Bot, FileText, Calendar, UserCheck, FileCheck, ArrowLeft, Database, Sparkles, Zap, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { OnboardingAgentInterface } from '@/components/agents/OnboardingAgentInterface';
import { ResumeScreeningAgentInterface } from '@/components/agents/ResumeScreeningAgentInterface';
import { MeetingSchedulerAgentInterface } from '@/components/agents/MeetingSchedulerAgentInterface';
import { InterviewCoordinatorAgentInterface } from '@/components/agents/InterviewCoordinatorAgentInterface';
import { DocumentGenerationAgentInterface } from '@/components/agents/DocumentGenerationAgentInterface';
import { DatabaseManagerAgentInterface } from '@/components/agents/DatabaseManagerAgentInterface';

type AgentType = 
  | 'onboarding' 
  | 'resume-screening' 
  | 'meeting-scheduler' 
  | 'interview-coordinator' 
  | 'document-generation' 
  | 'database-manager' 
  | null;

const AGENTS = [
  {
    id: 'onboarding' as AgentType,
    name: 'Onboarding Automation',
    description: 'Automated onboarding workflows, document generation, and task management',
    icon: UserCheck,
    color: 'from-violet-500 to-purple-600',
    glowColor: 'rgba(139, 92, 246, 0.3)',
    category: 'Automation',
  },
  {
    id: 'resume-screening' as AgentType,
    name: 'Resume Screening',
    description: 'Automatically screens resumes and matches candidates to job requirements',
    icon: FileText,
    color: 'from-fuchsia-500 to-pink-600',
    glowColor: 'rgba(217, 70, 239, 0.3)',
    category: 'AI Analysis',
  },
  {
    id: 'meeting-scheduler' as AgentType,
    name: 'Meeting Scheduler',
    description: 'Automated interview scheduling with conflict resolution',
    icon: Calendar,
    color: 'from-emerald-500 to-teal-600',
    glowColor: 'rgba(16, 185, 129, 0.3)',
    category: 'Scheduling',
  },
  {
    id: 'interview-coordinator' as AgentType,
    name: 'Interview Coordinator',
    description: 'Coordinates multi-round interviews, sends reminders, collects feedback',
    icon: UserCheck,
    color: 'from-amber-500 to-orange-600',
    glowColor: 'rgba(245, 158, 11, 0.3)',
    category: 'Coordination',
  },
  {
    id: 'document-generation' as AgentType,
    name: 'Document Generation',
    description: 'Auto-generates offer letters, contracts, certificates',
    icon: FileCheck,
    color: 'from-indigo-500 to-blue-600',
    glowColor: 'rgba(99, 102, 241, 0.3)',
    category: 'Generation',
  },
  {
    id: 'database-manager' as AgentType,
    name: 'Database Manager',
    description: 'Natural language database queries and operations (find, insert, update, delete)',
    icon: Database,
    color: 'from-cyan-500 to-blue-600',
    glowColor: 'rgba(6, 182, 212, 0.3)',
    category: 'Data Management',
  },
];

export const AgentDashboard = () => {
  const [selectedAgent, setSelectedAgent] = useState<AgentType>(null);

  if (selectedAgent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="p-6 space-y-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Button
              variant="ghost"
              onClick={() => setSelectedAgent(null)}
              className="mb-4 text-slate-300 hover:text-white hover:bg-slate-700/50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Agents
            </Button>
          </motion.div>

          <AnimatePresence mode="wait">
            {selectedAgent === 'onboarding' && <OnboardingAgentInterface />}
            {selectedAgent === 'resume-screening' && <ResumeScreeningAgentInterface />}
            {selectedAgent === 'meeting-scheduler' && <MeetingSchedulerAgentInterface />}
            {selectedAgent === 'interview-coordinator' && <InterviewCoordinatorAgentInterface />}
            {selectedAgent === 'document-generation' && <DocumentGenerationAgentInterface />}
            {selectedAgent === 'database-manager' && <DatabaseManagerAgentInterface />}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 p-6 md:p-8 lg:p-12 space-y-8">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-4"
        >
          <div className="flex items-center justify-center gap-4 mb-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-violet-600 rounded-2xl blur-xl opacity-50 animate-glow"></div>
              <div className="relative bg-gradient-to-br from-purple-600 via-violet-600 to-fuchsia-600 p-4 rounded-2xl shadow-2xl">
                <Bot className="w-10 h-10 text-white" />
              </div>
            </motion.div>
            <div>
              <h1 className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-purple-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                Agent Dashboard
              </h1>
              <p className="text-slate-400 mt-2 text-lg">Intelligent HR Automation Platform</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto mt-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-slate-800/50 backdrop-blur-lg border border-slate-700 rounded-xl p-4 hover:border-purple-500/50 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{AGENTS.length}</p>
                  <p className="text-sm text-slate-400">AI Agents</p>
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-slate-800/50 backdrop-blur-lg border border-slate-700 rounded-xl p-4 hover:border-violet-500/50 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-500/20 rounded-lg">
                  <Zap className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">100%</p>
                  <p className="text-sm text-slate-400">Automated</p>
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-slate-800/50 backdrop-blur-lg border border-slate-700 rounded-xl p-4 hover:border-fuchsia-500/50 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-fuchsia-500/20 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-fuchsia-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">24/7</p>
                  <p className="text-sm text-slate-400">Available</p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Agent Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {AGENTS.map((agent, index) => {
            const Icon = agent.icon;
            return (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ 
                  delay: 0.6 + index * 0.1,
                  type: "spring",
                  stiffness: 100
                }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="group"
              >
                <Card
                  className="relative bg-slate-800/40 backdrop-blur-xl border-2 border-slate-700/50 hover:border-purple-500/50 transition-all duration-300 cursor-pointer overflow-hidden h-full"
                  onClick={() => setSelectedAgent(agent.id)}
                  style={{
                    boxShadow: `0 8px 32px 0 ${agent.glowColor}`,
                  }}
                >
                  {/* Gradient overlay on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${agent.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                  
                  {/* Shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>

                  <CardHeader className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`bg-gradient-to-br ${agent.color} p-4 rounded-xl shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-xs font-semibold text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                        {agent.category}
                      </span>
                    </div>
                    <CardTitle className="text-xl text-white group-hover:text-purple-300 transition-colors">
                      {agent.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                      {agent.description}
                    </p>
                    <Button
                      className={`w-full bg-gradient-to-r ${agent.color} text-white hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-300 border-0`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAgent(agent.id);
                      }}
                    >
                      <span className="flex items-center justify-center gap-2">
                        Launch Agent
                        <ArrowLeft className="w-4 h-4 rotate-[-90deg] group-hover:translate-y-[-2px] transition-transform" />
                      </span>
                    </Button>
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
