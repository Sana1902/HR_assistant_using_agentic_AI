import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Search, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { agentsService, employeeService } from '@/services/api';

const WORKFLOW_STEPS = [
  {
    id: 'parse_resume',
    name: 'Parse Resume',
    description: 'Extract structured information from resume text',
    api: 'POST /api/v1/agents/resume-screening',
  },
  {
    id: 'score_candidate',
    name: 'Score Candidate',
    description: 'Score candidate against job requirements (0-100)',
    api: 'POST /api/v1/agents/resume-screening',
  },
  {
    id: 'save_result',
    name: 'Save Result',
    description: 'Store screening result in database',
    api: 'Automatic after screening',
  },
  {
    id: 'notify',
    name: 'Notify & Auto-Advance',
    description: 'Auto-advance high scores or notify HR for review',
    api: 'Email Service Integration',
  },
];

export const ResumeScreeningAgentInterface = () => {
  const [resumeText, setResumeText] = useState('');
  const [roleOptions, setRoleOptions] = useState<Array<{ role: string; department?: string; count?: number }>>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [selectedRoleIndex, setSelectedRoleIndex] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchRoles() {
      setRolesLoading(true);
      setRolesError(null);
      try {
        const response = await employeeService.listRoles();
        if (isMounted) {
          setRoleOptions(response?.data ?? []);
        }
      } catch (error: any) {
        if (isMounted) {
          setRolesError(error?.message || 'Failed to load roles');
        }
      } finally {
        if (isMounted) {
          setRolesLoading(false);
        }
      }
    }

    fetchRoles();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleScreenResume = async () => {
    setLoading(true);
    try {
      const selectedRole = selectedRoleIndex ? roleOptions[Number(selectedRoleIndex)] : undefined;
      const response = await agentsService.screenResume(
        resumeText,
        undefined,
        selectedRole?.department,
        selectedRole?.role
      );
      setResult(response);
    } catch (error: any) {
      setResult({ success: false, error: error.message || 'Failed to screen resume' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-3 rounded-lg">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Resume Screening Agent
            </h2>
            <p className="text-slate-600 mt-1">Automatically screen resumes and match to job requirements</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5 text-purple-500" />
              Workflow Steps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {WORKFLOW_STEPS.map((step, index) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-white group-hover:text-black transition-colors">{step.name}</h4>
                    <Badge variant="secondary">Step {index + 1}</Badge>
                  </div>
                  <p className="text-sm text-white group-hover:text-black transition-colors mb-2">{step.description}</p>
                  <div className="bg-slate-100 rounded px-2 py-1 text-xs font-mono text-black">
                    {step.api}
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Screen Resume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Resume Text
                </label>
                <textarea
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste resume text here..."
                  className="w-full min-h-[200px] p-3 border border-slate-300 rounded-lg resize-none text-black"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Select Job Role (optional)
                </label>
                {rolesLoading ? (
                  <div className="text-sm text-slate-500">Loading roles...</div>
                ) : rolesError ? (
                  <div className="text-sm text-red-500">{rolesError}</div>
                ) : roleOptions.length > 0 ? (
                  <select
                    value={selectedRoleIndex}
                    onChange={(e) => setSelectedRoleIndex(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-black bg-white"
                  >
                    <option value="">-- Select a Job Role --</option>
                    {roleOptions.map((option, idx) => (
                      <option key={`${option.role}-${option.department}-${idx}`} value={String(idx)}>
                        {option.role}
                        {option.department && option.department !== 'N/A' ? ` (${option.department})` : ''}
                        {typeof option.count === 'number' && option.count > 1 ? ` • ${option.count}` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-sm text-amber-600">No roles available. Please add employees first.</div>
                )}
              </div>

              <Button
                onClick={handleScreenResume}
                disabled={loading || !resumeText}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white"
              >
                {loading ? 'Screening...' : 'Screen Resume'}
              </Button>

              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-lg bg-slate-50 border border-slate-200"
                >
                  {result.success && result.data?.score ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        {result.data.score.overall_score >= 80 ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : result.data.score.overall_score >= 60 ? (
                          <AlertCircle className="w-5 h-5 text-yellow-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        <span className="font-semibold">
                          Score: {result.data.score.overall_score}/100
                        </span>
                        <Badge
                          className={
                            result.data.score.overall_score >= 80
                              ? 'bg-green-500'
                              : result.data.score.overall_score >= 60
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }
                        >
                          {result.data.score.recommendation?.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-sm space-y-1">
                        <p><strong>Skills Match:</strong> {result.data.score.skills_match}/100</p>
                        <p><strong>Experience Match:</strong> {result.data.score.experience_match}/100</p>
                        {result.data.score.missing_skills?.length > 0 && (
                          <p><strong>Missing Skills:</strong> {result.data.score.missing_skills.join(', ')}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-red-600">{result.error || 'Screening failed'}</p>
                  )}
                </motion.div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

