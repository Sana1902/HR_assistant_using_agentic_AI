import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, FileText, Calendar, CheckCircle, AlertCircle, TrendingUp, UserPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { agentsService, employeeService, jobsService } from '@/services/api';
import { motion } from 'framer-motion';

interface ScreeningResult {
  score: {
    overall_score: number;
    recommendation: string;
    strengths: string[];
    weaknesses: string[];
    missing_skills: string[];
    reason: string;
  };
  candidate_data: {
    name: string;
    email: string;
    skills: string[];
    experience_years: number;
  };
}

export const HireEmployee = () => {
  const queryClient = useQueryClient();
  const [resumeText, setResumeText] = useState('');
  const [jobId, setJobId] = useState('');
  const [selectedRoleIndex, setSelectedRoleIndex] = useState('');
  const [jobInfo, setJobInfo] = useState<any | null>(null);
  const [screeningResult, setScreeningResult] = useState<ScreeningResult | null>(null);
  const [isScreening, setIsScreening] = useState(false);
  const [scheduleQuery, setScheduleQuery] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);
  const [meetingResult, setMeetingResult] = useState<any>(null);

  // Fetch available jobs
  const { data: jobsData, isLoading: jobsLoading } = useQuery({
    queryKey: ['jobs-list'],
    queryFn: () => jobsService.listIds(),
  });

  const {
    data: rolesData,
    isLoading: rolesLoading,
    error: rolesError,
  } = useQuery({
    queryKey: ['employee-roles'],
    queryFn: () => employeeService.listRoles(),
  });

  const jobs = jobsData?.data || [];
  const roleOptions: Array<{ role: string; department?: string; count?: number }> = rolesData?.data || [];
  const rolesErrorMessage =
    rolesError instanceof Error ? rolesError.message : rolesError ? 'Failed to load roles' : null;
  const selectedRole =
    selectedRoleIndex !== '' ? roleOptions[Number(selectedRoleIndex)] : undefined;

  useEffect(() => {
    const selected = jobs.find((j: any) => j.job_id === jobId);
    setJobInfo(selected || null);
    let cancelled = false;
    async function fetchDetails() {
      try {
        if (jobId) {
          const resp = await jobsService.getById(jobId);
          if (!cancelled && resp?.data) {
            setJobInfo({ ...(selected || {}), ...resp.data });
          }
        }
      } catch (_) {
        // ignore; fallback to list info
      }
    }
    if (jobId) fetchDetails();
    return () => { cancelled = true; };
  }, [jobId, jobs]);

  useEffect(() => {
    if (!roleOptions.length || selectedRoleIndex === '') {
      setJobId('');
      setJobInfo(null);
      return;
    }

    const role = roleOptions[Number(selectedRoleIndex)];
    if (!role) {
      setJobId('');
      setJobInfo(null);
      return;
    }

    const matchingJob = jobs.find((job: any) => {
      const normalized = (value: any) => (typeof value === 'string' ? value.trim().toLowerCase() : '');
      const roleName = normalized(role.role);
      const candidates = [
        job.job_id,
        job.JobID,
        job.Position,
        job.position,
        job.role,
        job.JobTitle,
      ];
      return candidates.some((candidate) => normalized(candidate) === roleName);
    });

    if (matchingJob?.job_id) {
      setJobId(matchingJob.job_id);
      setJobInfo({
        Position: role.role,
        Department: role.department,
        Status: matchingJob.Status || matchingJob.status,
        RequiredSkills: matchingJob.RequiredSkills || matchingJob.requiredSkills || [],
      });
    } else {
      setJobId('');
      setJobInfo({
        Position: role.role,
        Department: role.department,
      });
    }
  }, [selectedRoleIndex, roleOptions, jobs]);

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Read file content
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      setResumeText(text);
    };
    reader.readAsText(file);
  };

  const handleScreenResume = async () => {
    if (!resumeText || (!jobId && !selectedRole)) {
      alert('Please upload a resume and select a job role');
      return;
    }

    setIsScreening(true);
    setScreeningResult(null); // Clear previous results
    try {
      const result = await agentsService.screenResume(
        resumeText,
        jobId || undefined,
        selectedRole?.department,
        selectedRole?.role
      );
      
      // Check for error in response
      if (result.data && result.data.error) {
        alert('Screening failed: ' + result.data.error);
        setIsScreening(false);
        return;
      }
      
      if (result.success && result.data) {
        // Ensure the data structure matches expected format
        if (result.data.score && result.data.candidate_data) {
          setScreeningResult(result.data);
        } else {
          console.error('Unexpected response structure:', result);
          alert('Screening completed but received unexpected data format. Check console for details.');
        }
      } else if (result.success === false) {
        // Backend returned an error
        alert('Screening failed: ' + (result.message || 'Unknown error'));
      } else {
        alert('Screening failed: ' + (result.message || 'Unknown error'));
      }
    } catch (error: any) {
      console.error('Error screening resume:', error);
      alert('Error screening resume: ' + (error.response?.data?.detail || error.message || 'Unknown error'));
    } finally {
      setIsScreening(false);
    }
  };

  const handleScheduleMeeting = async () => {
    if (!scheduleQuery) {
      alert('Please enter meeting details');
      return;
    }

    setIsScheduling(true);
    try {
      // Extract email from screening result if available
      const participants = screeningResult?.candidate_data?.email 
        ? [screeningResult.candidate_data.email, 'hr@company.com']
        : ['hr@company.com'];

      const result = await agentsService.scheduleMeeting(scheduleQuery, participants);
      if (result.success && result.data) {
        setMeetingResult(result.data.meeting);
        setScheduleQuery(''); // Clear input
      } else {
        alert('Scheduling failed: ' + (result.message || 'Unknown error'));
      }
    } catch (error: any) {
      alert('Error scheduling meeting: ' + (error.message || 'Unknown error'));
    } finally {
      setIsScheduling(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getRecommendationColor = (rec: string) => {
    if (rec.toLowerCase() === 'hire') return 'bg-green-500';
    if (rec.toLowerCase() === 'maybe') return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 min-h-screen relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-br from-purple-600 to-violet-600 p-3 rounded-lg shadow-lg">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                Hire New Employee
              </h1>
              <p className="text-slate-400 mt-1">Streamlined hiring process with AI-powered screening</p>
            </div>
          </div>
        </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Resume Upload & Screening */}
        <div className="space-y-6">
          {/* Step 1: Upload Resume */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border border-slate-700 bg-slate-800/50 backdrop-blur-xl hover:shadow-lg hover:shadow-purple-500/20 transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <FileText className="w-5 h-5 text-purple-400" />
                  Step 1: Upload & Review Resume
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Select Job Role
                  </label>
                  {rolesLoading ? (
                    <div className="text-sm text-slate-400 mb-4">Loading job roles...</div>
                  ) : rolesErrorMessage ? (
                    <div className="text-sm text-red-400 mb-4">{rolesErrorMessage}</div>
                  ) : roleOptions && roleOptions.length > 0 ? (
                    <>
                      <select
                        value={selectedRoleIndex}
                        onChange={(e) => setSelectedRoleIndex(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-600 bg-slate-700/50 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 mb-2"
                      >
                        <option value="">-- Select a Job Role --</option>
                        {roleOptions.map((role, idx) => (
                          <option key={`${role.role}-${role.department}-${idx}`} value={idx}>
                            {role.role}
                            {role.department && role.department !== 'N/A' ? ` (${role.department})` : ''}
                            {typeof role.count === 'number' && role.count > 1 ? ` • ${role.count}` : ''}
                          </option>
                        ))}
                      </select>
                      {selectedRole && (
                        <div className="text-xs text-slate-400 mb-3 bg-slate-700/30 p-3 rounded-lg">
                          <div><span className="font-medium text-purple-300">Role:</span> <span className="text-white">{selectedRole.role}</span></div>
                          <div><span className="font-medium text-purple-300">Department:</span> <span className="text-white">{selectedRole.department || 'N/A'}</span></div>
                          {typeof selectedRole.count === 'number' && (
                            <div><span className="font-medium text-purple-300">Employees in role:</span> <span className="text-white">{selectedRole.count}</span></div>
                          )}
                        </div>
                      )}
                    </>
                  ) : jobsLoading ? (
                    <div className="text-sm text-slate-400 mb-4">Loading jobs...</div>
                  ) : jobs && jobs.length > 0 ? (
                    <>
                      <select
                        value={jobId}
                        onChange={(e) => {
                          const value = e.target.value;
                          setJobId(value);
                          if (value) {
                            const idx = roleOptions.findIndex((role) => role.role === value);
                            if (idx >= 0) setSelectedRoleIndex(String(idx));
                          }
                        }}
                        className="w-full px-3 py-2 border border-slate-600 bg-slate-700/50 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 mb-2"
                      >
                        <option value="">-- Select a Job Role --</option>
                        {jobs.map((job: any) => (
                          <option key={job.job_id} value={job.job_id}>
                            {job.position || job.JobTitle || job.role || 'Unknown Role'}
                            {job.department ? ` (${job.department})` : ''}
                          </option>
                        ))}
                      </select>
                      {jobInfo && (
                        <div className="text-xs text-slate-400 mb-3 bg-slate-700/30 p-3 rounded-lg">
                          <div><span className="font-medium text-purple-300">Position:</span> <span className="text-white">{jobInfo.Position || jobInfo.position}</span></div>
                          <div><span className="font-medium text-purple-300">Department:</span> <span className="text-white">{jobInfo.Department || jobInfo.department}</span></div>
                          {Array.isArray(jobInfo.RequiredSkills) && jobInfo.RequiredSkills.length > 0 && (
                            <div className="mt-1"><span className="font-medium text-purple-300">Required Skills:</span> <span className="text-white">{jobInfo.RequiredSkills.slice(0,5).join(', ')}{jobInfo.RequiredSkills.length>5?'…':''}</span></div>
                          )}
                          {jobInfo.Status && (
                            <div><span className="font-medium text-purple-300">Status:</span> <span className="text-white">{jobInfo.Status}</span></div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-xs text-amber-400 mb-4 space-y-2 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                      <div>No jobs found in database. Please add jobs first.</div>
                      <Button
                        variant="outline"
                        onClick={async () => {
                          try {
                            await jobsService.seedBasic();
                            await queryClient.invalidateQueries({ queryKey: ['jobs-list'] });
                          } catch (e) {
                            alert('Failed to seed sample jobs. Check server logs.');
                          }
                        }}
                        className="border-amber-500/30 text-amber-300 hover:bg-amber-500/20"
                      >
                        Seed sample jobs
                      </Button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Resume Upload
                  </label>
                  <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center hover:border-purple-500 transition-colors bg-slate-700/30">
                    <input
                      type="file"
                      accept=".txt,.pdf,.doc,.docx"
                      onChange={handleResumeUpload}
                      className="hidden"
                      id="resume-upload"
                    />
                    <label
                      htmlFor="resume-upload"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <Upload className="w-10 h-10 text-slate-400 mb-2" />
                      <p className="text-sm text-slate-300">
                        Click to upload resume or drag and drop
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        TXT, PDF, DOC, DOCX (Max 5MB)
                      </p>
                    </label>
                  </div>
                </div>

                {resumeText && (
                  <div className="bg-slate-700/30 rounded-lg p-4 max-h-48 overflow-y-auto border border-slate-600">
                    <p className="text-xs text-purple-300 font-medium mb-2">Resume Preview:</p>
                    <p className="text-sm text-slate-300 whitespace-pre-wrap">
                      {resumeText.substring(0, 500)}...
                    </p>
                  </div>
                )}

                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleScreenResume();
                  }}
                  disabled={!resumeText || (!jobId && !selectedRole) || isScreening}
                  className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white shadow-lg shadow-purple-500/50"
                >
                  {isScreening ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Screening...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Screen Resume
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Step 2: Screening Results */}
          {screeningResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border border-slate-700 bg-slate-800/50 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    Screening Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Overall Score */}
                  <div className="text-center p-6 bg-slate-700/30 rounded-lg border border-slate-600">
                    <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${getScoreColor(screeningResult.score.overall_score)} mb-4`}>
                      <span className="text-3xl font-bold">
                        {screeningResult.score.overall_score}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mb-2">Overall Score</p>
                    <Badge className={getRecommendationColor(screeningResult.score.recommendation)}>
                      {screeningResult.score.recommendation.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Candidate Info */}
                  {screeningResult.candidate_data && (
                    <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
                      <h4 className="font-semibold text-white mb-2">Candidate Information</h4>
                      <div className="space-y-1 text-sm">
                        <p className="text-slate-300"><span className="font-medium text-purple-300">Name:</span> {screeningResult.candidate_data.name || 'N/A'}</p>
                        <p className="text-slate-300"><span className="font-medium text-purple-300">Email:</span> {screeningResult.candidate_data.email || 'N/A'}</p>
                        <p className="text-slate-300"><span className="font-medium text-purple-300">Experience:</span> {screeningResult.candidate_data.experience_years || 0} years</p>
                        {screeningResult.candidate_data.skills && (
                          <div>
                            <span className="font-medium text-purple-300">Skills:</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {screeningResult.candidate_data.skills.slice(0, 5).map((skill, idx) => (
                                <Badge key={idx} className="bg-purple-500/20 text-purple-300 border-purple-500/30">{skill}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Strengths */}
                  {screeningResult.score.strengths && screeningResult.score.strengths.length > 0 && (
                    <div className="bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/20">
                      <h4 className="font-semibold text-emerald-300 mb-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Strengths
                      </h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-emerald-200">
                        {screeningResult.score.strengths.map((strength, idx) => (
                          <li key={idx}>{strength}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Missing Skills */}
                  {screeningResult.score.missing_skills && screeningResult.score.missing_skills.length > 0 && (
                    <div className="bg-amber-500/10 rounded-lg p-4 border border-amber-500/20">
                      <h4 className="font-semibold text-amber-300 mb-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Missing Skills
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {screeningResult.score.missing_skills.map((skill, idx) => (
                          <Badge key={idx} className="bg-amber-500/20 text-amber-300 border-amber-500/30">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reason */}
                  <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
                    <h4 className="font-semibold text-white mb-2">Evaluation Reason</h4>
                    <p className="text-sm text-slate-300">{screeningResult.score.reason || 'N/A'}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Right Column: Schedule Meeting */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border border-slate-700 bg-slate-800/50 backdrop-blur-xl hover:shadow-lg hover:shadow-purple-500/20 transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Calendar className="w-5 h-5 text-purple-400" />
                  Step 2: Schedule Interview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Meeting Details
                  </label>
                  <Input
                    placeholder="e.g., Schedule interview tomorrow at 2 PM"
                    value={scheduleQuery}
                    onChange={(e) => setScheduleQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleScheduleMeeting()}
                    className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-purple-500"
                  />
                  <p className="text-xs text-slate-400 mt-2">
                    You can use natural language: "Schedule interview tomorrow at 2 PM"
                  </p>
                </div>

                {screeningResult?.candidate_data?.email && (
                  <div className="bg-purple-500/10 rounded-lg p-3 text-sm text-purple-300 border border-purple-500/20">
                    Candidate email will be automatically added: {screeningResult.candidate_data.email}
                  </div>
                )}

                <Button
                  onClick={handleScheduleMeeting}
                  disabled={!scheduleQuery || isScheduling}
                  className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white shadow-lg shadow-purple-500/50"
                >
                  {isScheduling ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Scheduling...
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4 mr-2" />
                      Schedule Meeting
                    </>
                  )}
                </Button>

                {/* Meeting Result */}
                {meetingResult && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/20"
                  >
                    <h4 className="font-semibold text-emerald-300 mb-2 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Meeting Scheduled Successfully!
                    </h4>
                    <div className="space-y-1 text-sm text-emerald-200">
                      <p><span className="font-medium">Date:</span> {meetingResult.InterviewDate}</p>
                      <p><span className="font-medium">Time:</span> {meetingResult.InterviewTime}</p>
                      <p><span className="font-medium">Duration:</span> {meetingResult.Duration} minutes</p>
                      <p className="text-xs text-emerald-300 mt-2">
                        All participants have been notified via email.
                      </p>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border border-slate-700 bg-slate-800/50 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-lg text-white">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start border-slate-600 text-slate-300 hover:bg-slate-700"
                  onClick={() => {
                    setScheduleQuery('Schedule interview tomorrow at 10 AM');
                  }}
                >
                  📅 Tomorrow 10 AM
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-slate-600 text-slate-300 hover:bg-slate-700"
                  onClick={() => {
                    setScheduleQuery('Schedule interview next week Monday at 2 PM');
                  }}
                >
                  📅 Next Monday 2 PM
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-slate-600 text-slate-300 hover:bg-slate-700"
                  onClick={() => {
                    setScheduleQuery('Schedule interview for this Friday at 3 PM');
                  }}
                >
                  📅 This Friday 3 PM
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
      </div>
    </div>
  );
};

