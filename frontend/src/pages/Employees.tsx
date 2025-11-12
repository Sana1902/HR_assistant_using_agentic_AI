import { useMemo, useState, useCallback, type ReactNode, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search,
  Plus,
  X,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  CalendarDays,
  BadgeCheck,
  TrendingUp,
  Activity,
  ShieldCheck,
  Clock,
  Building2,
  ListChecks,
  ClipboardCheck,
  UserCircle,
  CheckCircle2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { employeeService, onboardingService } from '@/services/api';
import type { Employee, CreateEmployeePayload } from '@/types/employee';

type DetailEmployee = Employee & {
  Email?: string;
  Phone?: string;
  Location?: string;
  DateOfJoining?: string;
  Manager?: string;
  ManagerName?: string;
  EmploymentType?: string;
  PerformanceRating?: string | number;
  LastPromotionDate?: string;
  LastPerformanceReviewDate?: string;
  Tenure?: number;
  LeaveBalance?: number;
  Skills?: string[];
  Projects?: { name: string; status?: string; role?: string }[];
  NextReviewDate?: string;
  Team?: string;
};

type TimelineEvent = {
  title: string;
  description: string;
  date?: string;
  status: 'completed' | 'current' | 'upcoming';
  icon: React.ComponentType<{ className?: string }>;
};

type InfoRowProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: ReactNode;
};

type OnboardingTask = {
  id?: string;
  task?: string;
  description?: string;
  owner?: string;
  due_date?: string;
  status?: string;
  category?: string;
  notes?: string;
};

type OnboardingRecord = {
  _id: string;
  employee_id?: string;
  status?: string;
  completion_percentage?: number;
  created_at?: string;
  updated_at?: string;
  start_date?: string;
  buddy_name?: string;
  buddy_email?: string;
  plan?: {
    tasks?: OnboardingTask[];
    [key: string]: unknown;
  };
  tasks?: OnboardingTask[];
};

type EmployeeFormState = {
  name: string;
  email: string;
  department: string;
  position: string;
  phone: string;
  dateOfJoining: string;
  employmentType: string;
  manager: string;
};

const DEFAULT_EMPLOYEE_FORM: EmployeeFormState = {
  name: '',
  email: '',
  department: '',
  position: '',
  phone: '',
  dateOfJoining: '',
  employmentType: 'Full-time',
  manager: '',
};

const InfoRow = ({ icon: Icon, label, value }: InfoRowProps) => (
  <div className="flex items-start gap-3">
    <div className="rounded-md bg-slate-700/40 p-2">
      <Icon className="w-4 h-4 text-purple-300" />
    </div>
    <div>
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-sm text-slate-200">{value || 'Not available'}</p>
    </div>
  </div>
);

const formatDate = (value?: string | Date) => {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatCurrency = (value?: number) => {
  if (!value && value !== 0) return 'Not available';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
};

const calculateServiceDuration = (date?: string) => {
  if (!date) return '—';
  const joined = new Date(date);
  if (Number.isNaN(joined.getTime())) return '—';
  const now = new Date();
  const years = now.getFullYear() - joined.getFullYear();
  const months = now.getMonth() - joined.getMonth();
  const totalMonths = years * 12 + months;
  const finalYears = Math.floor(totalMonths / 12);
  const remainingMonths = totalMonths % 12;
  if (finalYears <= 0 && remainingMonths <= 0) return 'Just joined';
  const yearPart = finalYears > 0 ? `${finalYears} yr${finalYears > 1 ? 's' : ''}` : '';
  const monthPart =
    remainingMonths > 0 ? `${remainingMonths} mo${remainingMonths > 1 ? 's' : ''}` : '';
  return [yearPart, monthPart].filter(Boolean).join(' ');
};

const extractStringField = (
  source: Record<string, unknown> | undefined,
  keys: string[],
): string | undefined => {
  if (!source) return undefined;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return value.toString();
    }
  }
  return undefined;
};

const formatDateRange = (start?: string, end?: string) => {
  const startLabel = formatDate(start);
  const endLabel = end ? formatDate(end) : 'Present';
  if (!startLabel && !endLabel) return '—';
  if (!startLabel) return endLabel || '—';
  return `${startLabel} - ${endLabel}`;
};

const calculateDurationBetween = (start?: string, end?: string) => {
  if (!start) return '—';
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) return '—';
  const endDate = end ? new Date(end) : new Date();
  if (Number.isNaN(endDate.getTime())) return '—';

  const totalMonths =
    endDate.getFullYear() * 12 +
    endDate.getMonth() -
    (startDate.getFullYear() * 12 + startDate.getMonth());

  if (totalMonths <= 0) return 'Less than a month';
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const yearPart = years > 0 ? `${years} yr${years > 1 ? 's' : ''}` : '';
  const monthPart = months > 0 ? `${months} mo${months > 1 ? 's' : ''}` : '';
  return [yearPart, monthPart].filter(Boolean).join(' ') || 'Less than a month';
};

export const Employees = () => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState<EmployeeFormState>({ ...DEFAULT_EMPLOYEE_FORM });
  const [formError, setFormError] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [creationSuccess, setCreationSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!creationSuccess) return;
    const timeout = window.setTimeout(() => setCreationSuccess(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [creationSuccess]);

  const resetForm = useCallback(() => {
    setFormData({ ...DEFAULT_EMPLOYEE_FORM });
  }, []);

  const openAddEmployeeModal = useCallback(() => {
    setIsAddModalOpen(true);
    setFormError(null);
  }, []);

  const closeAddEmployeeModal = useCallback(() => {
    setIsAddModalOpen(false);
    setFormError(null);
    resetForm();
  }, [resetForm]);

  const { data: employeesData, isLoading } = useQuery({
    queryKey: ['employees', search, page],
    queryFn: () => employeeService.getAll({ search, page, limit: 20 }),
  });

  const {
    data: selectedEmployeeData,
    isLoading: detailLoading,
    isFetching: detailFetching,
    error: detailError,
  } = useQuery({
    queryKey: ['employee-detail', selectedEmployeeId],
    queryFn: () => employeeService.getById(selectedEmployeeId!),
    enabled: !!selectedEmployeeId,
    staleTime: 1000 * 60 * 5,
  });

  const {
    data: attritionData,
    isLoading: attritionLoading,
    error: attritionError,
  } = useQuery({
    queryKey: ['employee-attrition', selectedEmployeeId],
    queryFn: () => employeeService.getAttritionRisk(selectedEmployeeId!),
    enabled: !!selectedEmployeeId,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const {
    data: performanceData,
    isLoading: performanceLoading,
    error: performanceError,
  } = useQuery({
    queryKey: ['employee-performance', selectedEmployeeId],
    queryFn: () => employeeService.getPerformancePrediction(selectedEmployeeId!, 6),
    enabled: !!selectedEmployeeId,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const {
    data: onboardingData,
    isLoading: onboardingLoading,
    error: onboardingError,
  } = useQuery({
    queryKey: ['employee-onboarding', selectedEmployeeId],
    queryFn: () => onboardingService.getOnboarding(selectedEmployeeId!, undefined),
    enabled: !!selectedEmployeeId,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const employees = employeesData?.data || [];
  const selectedEmployee = (selectedEmployeeData?.data || null) as DetailEmployee | null;
  const departmentSuggestions = useMemo(() => {
    const unique = new Set<string>();
    for (const emp of employees as Employee[]) {
      const dept = (emp?.Department || (emp as any)?.department || '').toString().trim();
      if (dept) {
        unique.add(dept);
      }
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [employees]);

  const handleCreateEmployee = useCallback(async () => {
    const trimmedName = formData.name.trim();
    const trimmedDepartment = formData.department.trim();
    const trimmedPosition = formData.position.trim();

    if (!trimmedName || !trimmedDepartment || !trimmedPosition) {
      setFormError('Name, Department, and Position are required.');
      return;
    }

    const payload: CreateEmployeePayload = {
      name: trimmedName,
      department: trimmedDepartment,
      position: trimmedPosition,
    };

    if (formData.email.trim()) payload.email = formData.email.trim();
    if (formData.phone.trim()) payload.phone = formData.phone.trim();
    if (formData.dateOfJoining) payload.dateOfJoining = formData.dateOfJoining;
    if (formData.employmentType.trim()) payload.employmentType = formData.employmentType.trim();
    if (formData.manager.trim()) payload.manager = formData.manager.trim();

    setCreateLoading(true);
    setFormError(null);
    try {
      await employeeService.create(payload);
      setCreationSuccess('Employee added successfully.');
      closeAddEmployeeModal();
      setPage(1);
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
    } catch (error: any) {
      const message =
        error?.response?.data?.detail ||
        error?.message ||
        'Failed to create employee. Please try again.';
      setFormError(typeof message === 'string' ? message : 'Failed to create employee.');
    } finally {
      setCreateLoading(false);
    }
  }, [
    formData,
    closeAddEmployeeModal,
    queryClient,
  ]);
  const attritionRisk = attritionData?.data as
    | { risk_score: number; risk_level: 'low' | 'medium' | 'high'; probability: number }
    | undefined;
  const isPanelOpen = !!selectedEmployeeId;
  const isPanelLoading = detailLoading || attritionLoading || performanceLoading || onboardingLoading || detailFetching;

  const onboardingRecord = useMemo<OnboardingRecord | null>(() => {
    if (!onboardingData?.data) return null;
    const records = onboardingData.data as OnboardingRecord[] | undefined;
    if (Array.isArray(records) && records.length > 0) {
      return records[0];
    }
    return null;
  }, [onboardingData]);

  const onboardingTasks = useMemo<OnboardingTask[]>(() => {
    if (!onboardingRecord) return [];
    if (Array.isArray(onboardingRecord.tasks) && onboardingRecord.tasks.length > 0) {
      return onboardingRecord.tasks;
    }
    if (Array.isArray(onboardingRecord.plan?.tasks) && onboardingRecord.plan?.tasks.length > 0) {
      return onboardingRecord.plan?.tasks as OnboardingTask[];
    }
    return [];
  }, [onboardingRecord]);

  const taskProgress = useMemo(() => {
    if (!onboardingRecord && onboardingTasks.length === 0) {
      return {
        total: 0,
        completed: 0,
        pending: 0,
        completionPercentage: 0,
      };
    }

    const total = onboardingTasks.length;
    const completed = onboardingTasks.filter(
      (task) => (task.status || '').toLowerCase() === 'completed',
    ).length;
    const completionPercentage =
      onboardingRecord?.completion_percentage ??
      (total > 0 ? Math.round((completed / total) * 100) : 0);

    return {
      total,
      completed,
      pending: total - completed,
      completionPercentage,
    };
  }, [onboardingRecord, onboardingTasks]);

  const experienceYears =
    selectedEmployee?.TotalWorkingYears ??
    selectedEmployee?.ExperienceYears ??
    selectedEmployee?.TotalExperienceYears ??
    selectedEmployee?.YearsOfExperience;

  const employmentHistoryEntries = useMemo(() => {
    if (!selectedEmployee) return [] as Record<string, unknown>[];
    const potentialSources = [
      selectedEmployee.EmploymentHistory,
      selectedEmployee.CareerHistory,
      selectedEmployee.History,
      selectedEmployee.JobHistory,
      selectedEmployee.WorkHistory,
    ];

    for (const source of potentialSources) {
      if (Array.isArray(source)) {
        return source as Record<string, unknown>[];
      }
      if (source && typeof source === 'object') {
        return Object.values(source as Record<string, Record<string, unknown>>);
      }
    }
    return [] as Record<string, unknown>[];
  }, [selectedEmployee]);

  const hasEmploymentHistory = employmentHistoryEntries.length > 0;

  const riskBadgeClasses = attritionRisk
    ? attritionRisk.risk_level === 'high'
      ? 'bg-red-500/10 text-red-300 border border-red-500/20'
      : attritionRisk.risk_level === 'medium'
        ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
        : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
    : 'bg-slate-700/40 text-slate-300 border border-slate-600/60';

  const timelineEvents = useMemo<TimelineEvent[]>(() => {
    if (!selectedEmployee) return [];
    const events: TimelineEvent[] = [];

    if (selectedEmployee.DateOfJoining) {
      events.push({
        title: 'Joined the company',
        description: `Started as ${selectedEmployee.Position || 'team member'} in ${
          selectedEmployee.Department || 'the organisation'
        }.`,
        date: formatDate(selectedEmployee.DateOfJoining),
        status: 'completed',
        icon: BadgeCheck,
      });
    }

    if (selectedEmployee.LastPromotionDate) {
      events.push({
        title: 'Last promotion',
        description: `Promoted on ${formatDate(selectedEmployee.LastPromotionDate)}.`,
        date: formatDate(selectedEmployee.LastPromotionDate),
        status: 'completed',
        icon: TrendingUp,
      });
    }

    events.push({
      title: 'Current assignment',
      description: `Working as ${selectedEmployee.Position || 'N/A'} in ${
        selectedEmployee.Department || 'N/A'
      }.`,
      date: formatDate(selectedEmployee.LastRoleChangeDate || selectedEmployee.DateOfJoining),
      status: 'current',
      icon: Briefcase,
    });

    if (attritionRisk) {
      events.push({
        title: 'Attrition risk assessment',
        description: `Current risk score is ${attritionRisk.risk_score}% (${attritionRisk.risk_level.toUpperCase()}).`,
        date: formatDate(new Date()),
        status: attritionRisk.risk_level === 'high' ? 'upcoming' : 'current',
        icon: ShieldCheck,
      });
    }

    if (onboardingRecord?.created_at) {
      events.push({
        title: 'Onboarding plan created',
        description: `Personalized onboarding with ${taskProgress.total} tasks was initiated.`,
        date: formatDate(onboardingRecord.created_at),
        status: 'completed',
        icon: ClipboardCheck,
      });
    }

    if (onboardingRecord?.buddy_name) {
      events.push({
        title: 'Buddy assigned',
        description: `${onboardingRecord.buddy_name} (${onboardingRecord.buddy_email || 'email pending'}) assigned as onboarding buddy.`,
        date: formatDate(onboardingRecord.updated_at || onboardingRecord.created_at),
        status: 'completed',
        icon: UserCircle,
      });
    }

    if (taskProgress.total > 0) {
      const nextTask = onboardingTasks.find(
        (task) => (task.status || '').toLowerCase() !== 'completed',
      );
      if (nextTask) {
        events.push({
          title: 'Next onboarding task',
          description: `${nextTask.task || nextTask.description || 'Upcoming task'}${
            nextTask.owner ? ` · Owner: ${nextTask.owner}` : ''
          }`,
          date: formatDate(nextTask.due_date),
          status: 'upcoming',
          icon: ListChecks,
        });
      }
    }

    events.push({
      title: 'Next performance review',
      description:
        selectedEmployee.NextReviewDate
          ? `Scheduled for ${formatDate(selectedEmployee.NextReviewDate)}.`
          : 'Schedule the next performance review.',
      date: formatDate(selectedEmployee.NextReviewDate),
      status: 'upcoming',
      icon: CalendarDays,
    });

    return events;
  }, [selectedEmployee, attritionRisk, onboardingRecord, onboardingTasks, taskProgress]);

  const trackingCards = useMemo(
    () =>
      selectedEmployee
        ? [
            {
              title: 'Service tenure',
              value: calculateServiceDuration(selectedEmployee.DateOfJoining),
              description: 'Time since hire',
              accent: 'from-purple-500/20 to-fuchsia-500/20',
              icon: Clock,
            },
            {
              title: 'Total experience',
              value:
                experienceYears !== undefined
                  ? `${experienceYears} yr${experienceYears === 1 ? '' : 's'}`
                  : selectedEmployee.Experience ||
                    selectedEmployee.ExperienceSummary ||
                    'Experience not recorded',
              description: 'Overall professional tenure',
              accent: 'from-indigo-500/20 to-blue-500/20',
              icon: Briefcase,
            },
            {
              title: 'Performance rating',
              value:
                selectedEmployee.PerformanceRating !== undefined
                  ? selectedEmployee.PerformanceRating
                  : 'Not recorded',
              description: 'Latest annual review',
              accent: 'from-emerald-500/20 to-teal-500/20',
              icon: Activity,
            },
            {
              title: 'Onboarding progress',
              value:
                taskProgress.total > 0
                  ? `${taskProgress.completed}/${taskProgress.total} • ${taskProgress.completionPercentage}%`
                  : onboardingError
                    ? 'No onboarding data'
                    : 'Planning...',
              description: 'Tasks completed from onboarding plan',
              accent: 'from-blue-500/20 to-cyan-500/20',
              icon: ClipboardCheck,
            },
            {
              title: 'Attrition risk',
              value: attritionRisk
                ? `${attritionRisk.risk_score}% • ${attritionRisk.risk_level.toUpperCase()}`
                : attritionError
                  ? 'Model unavailable'
                  : 'Evaluating...',
              description: 'Machine learning risk signal',
              accent:
                attritionRisk?.risk_level === 'high'
                  ? 'from-red-500/25 to-rose-500/25'
                  : attritionRisk?.risk_level === 'medium'
                    ? 'from-amber-500/25 to-orange-500/25'
                    : 'from-emerald-500/25 to-teal-500/25',
              icon: ShieldCheck,
            },
          ]
        : [],
    [selectedEmployee, attritionRisk, attritionError, taskProgress, onboardingError, experienceYears],
  );

  const skills = useMemo<string[] | null>(() => {
    const rawSkills = selectedEmployee?.Skills as unknown;
    if (!rawSkills) return null;
    if (Array.isArray(rawSkills)) {
      return (rawSkills as unknown[]).map((skill) => String(skill).trim());
    }
    if (typeof rawSkills === 'string') {
      return (rawSkills as string).split(',').map((skill: string) => skill.trim());
    }
    return null;
  }, [selectedEmployee]);

  const handleSelectEmployee = useCallback(
    (employeeId: string) => {
      setSelectedEmployeeId(employeeId);
    },
    [setSelectedEmployeeId],
  );

  const closePanel = useCallback(() => {
    setSelectedEmployeeId(null);
  }, [setSelectedEmployeeId]);

  const resolveEmployeeIdentifier = useCallback((employee: Employee): string | undefined => {
    const candidate =
      employee.Employee_ID ||
      (employee as any).EmployeeID ||
      (employee as any).employee_id ||
      (employee as any).ID ||
      (employee as any).id ||
      employee._id;
    return typeof candidate === 'string' && candidate.trim().length > 0
      ? candidate.trim()
      : undefined;
  }, []);

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 min-h-screen relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse"></div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => {
              if (!createLoading) closeAddEmployeeModal();
            }}
          ></div>
          <div className="relative w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-semibold text-white">Add Employee</h2>
                <p className="text-sm text-slate-400">Create a new employee record</p>
              </div>
              <button
                type="button"
                onClick={closeAddEmployeeModal}
                disabled={createLoading}
                className="rounded-lg p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {formError}
              </div>
            )}

            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (!createLoading) {
                  void handleCreateEmployee();
                }
              }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="space-y-1 sm:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Full Name<span className="text-red-400">*</span>
                  </span>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Jane Doe"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Email
                  </span>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="jane.doe@company.com"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Phone
                  </span>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="+1 555 0100"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Department<span className="text-red-400">*</span>
                  </span>
                  <Input
                    value={formData.department}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, department: e.target.value }))
                    }
                    placeholder="People Operations"
                    list="department-suggestions"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Position<span className="text-red-400">*</span>
                  </span>
                  <Input
                    value={formData.position}
                    onChange={(e) => setFormData((prev) => ({ ...prev, position: e.target.value }))}
                    placeholder="HR Business Partner"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Manager
                  </span>
                  <Input
                    value={formData.manager}
                    onChange={(e) => setFormData((prev) => ({ ...prev, manager: e.target.value }))}
                    placeholder="Alex Johnson"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Date of Joining
                  </span>
                  <Input
                    type="date"
                    value={formData.dateOfJoining}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, dateOfJoining: e.target.value }))
                    }
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Employment Type
                  </span>
                  <select
                    value={formData.employmentType}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, employmentType: e.target.value }))
                    }
                    className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Intern">Intern</option>
                    <option value="Consultant">Consultant</option>
                  </select>
                </label>
              </div>

              <datalist id="department-suggestions">
                {departmentSuggestions.map((dept) => (
                  <option key={dept} value={dept} />
                ))}
              </datalist>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeAddEmployeeModal}
                  disabled={createLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createLoading}>
                  {createLoading ? 'Adding…' : 'Add Employee'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="relative z-10">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Employees
            </h1>
            <p className="text-slate-400 mt-1">Manage your workforce</p>
          </div>
          <Button
            onClick={openAddEmployeeModal}
            className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white shadow-lg shadow-purple-500/50"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Employee
          </Button>
        </div>

        {creationSuccess && (
          <div className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 shadow-lg shadow-emerald-500/10">
            {creationSuccess}
          </div>
        )}

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Search employees by name, ID, or department..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder-slate-400 focus:border-purple-500"
          />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="text-slate-400">Loading employees...</div>
          </div>
        )}

        {/* Employee Grid */}
        {!isLoading && employees.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-400">No employees found</p>
          </div>
        )}

        {!isLoading && employees.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {employees.map((emp: Employee) => {
                const employeeIdentifier = resolveEmployeeIdentifier(emp);
                const displayId = employeeIdentifier || 'N/A';
                return (
                  <Card
                    key={employeeIdentifier || emp.Employee_ID || emp._id || emp.Name}
                  role="button"
                  tabIndex={0}
                    onClick={() => employeeIdentifier && handleSelectEmployee(employeeIdentifier)}
                  onKeyDown={(event) => {
                      if (!employeeIdentifier) return;
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleSelectEmployee(employeeIdentifier);
                      }
                    }}
                  className="hover:shadow-lg hover:shadow-purple-500/20 transition-all cursor-pointer border border-slate-700 bg-slate-800/50 backdrop-blur-xl hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500/60"
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-violet-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                        {emp.Name?.charAt(0)?.toUpperCase() || 'E'}
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                              if (employeeIdentifier) {
                                handleSelectEmployee(employeeIdentifier);
                              }
                          }}
                          className="font-semibold text-lg text-white hover:text-purple-200 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/40 rounded-md px-1 py-0.5"
                        >
                          {emp.Name || 'Unknown'}
                        </button>
                        <p className="text-sm text-slate-400">{emp.Position || 'N/A'}</p>
                      </div>
                      <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                        {emp.Department || 'N/A'}
                      </Badge>
                      <div className="text-xs text-slate-400">ID: {displayId}</div>
                      {emp.Salary && (
                        <div className="text-sm font-medium text-emerald-400">
                          {formatCurrency(emp.Salary)}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                );
              })}
            </div>

            {/* Pagination */}
            {employeesData?.pagination && employeesData.pagination.pages > 1 && (
              <div className="flex justify-center items-center space-x-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="border-slate-700 text-slate-300 hover:bg-slate-700"
                >
                  Previous
                </Button>
                <span className="text-sm text-slate-400">
                  Page {page} of {employeesData.pagination.pages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(employeesData.pagination.pages, p + 1))}
                  disabled={page >= employeesData.pagination.pages}
                  className="border-slate-700 text-slate-300 hover:bg-slate-700"
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Panel */}
      <AnimatePresence>
        {isPanelOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closePanel}
            />
            <motion.div
              className="fixed inset-y-0 right-0 z-50 w-full max-w-4xl bg-slate-900/95 text-white shadow-2xl border-l border-slate-700/70"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 280, damping: 30 }}
            >
              <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
                <div>
                  <p className="text-sm uppercase tracking-widest text-slate-500">
                    Employee snapshot
                  </p>
                  <h2 className="text-xl font-semibold text-white">
                    {selectedEmployee?.Name || 'Loading employee'}
                  </h2>
                </div>
                <button
                  onClick={closePanel}
                  className="rounded-md border border-slate-700 bg-slate-800/60 p-2 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="h-full overflow-y-auto px-6 py-6">
                {isPanelLoading && (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-2 border-slate-700 border-t-purple-500" />
                    <p>Loading employee record...</p>
                  </div>
                )}

                {!isPanelLoading && detailError && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-red-200">
                    <h3 className="text-lg font-semibold mb-2">Unable to load employee</h3>
                    <p>{(detailError as Error).message}</p>
                  </div>
                )}

                {!isPanelLoading && !detailError && selectedEmployee && (
                  <div className="space-y-6 pb-10">
                    {/* Hero */}
                    <div className="rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800/70 via-slate-900/80 to-slate-950/80 p-6 shadow-lg">
                      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-start gap-4">
                          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-600 to-violet-600 flex items-center justify-center text-2xl font-semibold shadow-lg shadow-purple-500/30">
                            {selectedEmployee.Name?.charAt(0) || 'E'}
                          </div>
                          <div>
                            <div className="flex items-center gap-3 flex-wrap">
                              <h3 className="text-2xl font-semibold text-white">
                                {selectedEmployee.Name}
                              </h3>
                              <Badge className="bg-purple-500/20 text-purple-200 border border-purple-500/30">
                                #{selectedEmployee.Employee_ID}
                              </Badge>
                            </div>
                            <p className="text-slate-300 mt-1">
                              {selectedEmployee.Position || 'Role TBD'} ·{' '}
                              {selectedEmployee.Department || 'Department TBD'}
                            </p>
                            {selectedEmployee.Manager && (
                              <p className="text-sm text-slate-400 mt-2">
                                Reporting to {selectedEmployee.Manager}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="space-y-3 text-sm">
                          <div
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wider ${riskBadgeClasses}`}
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Attrition risk:{' '}
                            {attritionRisk
                              ? `${attritionRisk.risk_level.toUpperCase()} (${attritionRisk.risk_score}%)`
                              : attritionError
                                ? 'Unavailable'
                                : 'Evaluating'}
                          </div>
                          <div className="text-slate-400">
                            Joined {formatDate(selectedEmployee.DateOfJoining) || '—'} ·{' '}
                            {selectedEmployee.EmploymentType || 'Employment type pending'}
                          </div>
                          <div className="text-slate-400">
                            Experience:{' '}
                            {experienceYears !== undefined
                              ? `${experienceYears} year${experienceYears === 1 ? '' : 's'} total`
                              : selectedEmployee.YearsAtCompany
                                ? `${selectedEmployee.YearsAtCompany} yrs at company`
                                : 'Not recorded'}
                          </div>
                          {onboardingRecord && (
                            <div className="flex flex-col gap-1 text-slate-400">
                              <span className="flex items-center gap-2">
                                <ClipboardCheck className="w-3.5 h-3.5 text-purple-300" />
                                Onboarding status:{' '}
                                <span className="uppercase text-xs tracking-wider text-purple-200">
                                  {onboardingRecord.status || 'Active'}
                                </span>
                              </span>
                              {taskProgress.total > 0 && (
                                <span className="text-xs text-slate-500">
                                  {taskProgress.completed}/{taskProgress.total} tasks completed (
                                  {taskProgress.completionPercentage}%)
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Tracking cards */}
                    {trackingCards.length > 0 && (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        {trackingCards.map((item) => (
                          <div
                            key={item.title}
                            className={`rounded-xl border border-slate-700 bg-gradient-to-br ${item.accent} p-4`}
                          >
                            <div className="flex items-center justify-between text-sm text-slate-300">
                              <span>{item.title}</span>
                              <item.icon className="w-4 h-4 text-purple-200" />
                            </div>
                            <p className="mt-2 text-xl font-semibold text-white">{item.value}</p>
                            <p className="text-xs text-slate-400 mt-1">{item.description}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Personal & Employment details */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <Card className="border-slate-700 bg-slate-800/40">
                        <CardHeader>
                          <CardTitle className="text-lg text-white">Contact & identity</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 gap-4 text-sm text-slate-300 sm:grid-cols-2">
                          <InfoRow icon={Mail} label="Email" value={selectedEmployee.Email} />
                          <InfoRow icon={Phone} label="Phone" value={selectedEmployee.Phone} />
                          <InfoRow
                            icon={MapPin}
                            label="Location"
                            value={selectedEmployee.Location || selectedEmployee.City}
                          />
                          <InfoRow
                            icon={Building2}
                            label="Team"
                            value={selectedEmployee.Team || selectedEmployee.Department}
                          />
                        </CardContent>
                      </Card>

                      <Card className="border-slate-700 bg-slate-800/40">
                        <CardHeader>
                          <CardTitle className="text-lg text-white">Employment overview</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 gap-4 text-sm text-slate-300 sm:grid-cols-2">
                          <InfoRow
                            icon={Briefcase}
                            label="Role"
                            value={selectedEmployee.Position}
                          />
                          <InfoRow
                            icon={CalendarDays}
                            label="Joined"
                            value={formatDate(selectedEmployee.DateOfJoining) || '—'}
                          />
                          <InfoRow
                            icon={TrendingUp}
                            label="Last promotion"
                            value={formatDate(selectedEmployee.LastPromotionDate) || '—'}
                          />
                          <InfoRow
                            icon={BadgeCheck}
                            label="Employment type"
                            value={selectedEmployee.EmploymentType || 'Full-time'}
                          />
                        </CardContent>
                      </Card>
                    </div>

                    {/* Compensation & Performance */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <Card className="border-slate-700 bg-slate-800/40">
                        <CardHeader>
                          <CardTitle className="text-lg text-white">
                            Compensation & benefits
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm text-slate-300">
                          <div className="flex items-center justify-between rounded-lg border border-slate-700/70 bg-slate-900/40 px-4 py-3">
                            <span>Annual salary</span>
                            <span className="font-medium text-emerald-300">
                              {formatCurrency(selectedEmployee.Salary)}
                            </span>
                          </div>
                          <InfoRow
                            icon={Activity}
                            label="Leave balance"
                            value={
                              selectedEmployee.LeaveBalance !== undefined
                                ? `${selectedEmployee.LeaveBalance} days`
                                : 'Not recorded'
                            }
                          />
                          <InfoRow
                            icon={ShieldCheck}
                            label="Benefits"
                            value={selectedEmployee.Benefits || 'Standard benefits package'}
                          />
                        </CardContent>
                      </Card>

                      <Card className="border-slate-700 bg-slate-800/40">
                        <CardHeader>
                          <CardTitle className="text-lg text-white">
                            Performance & risk insights
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm text-slate-300">
                          {/* Performance Score - Prominent Display */}
                          <div className="rounded-lg border border-slate-600/50 bg-gradient-to-br from-slate-800/60 to-slate-900/60 p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-emerald-500/20 p-2">
                                  <Activity className="w-5 h-5 text-emerald-400" />
                                </div>
                                <div>
                                  <p className="text-xs uppercase tracking-wider text-slate-400">
                                    Performance Score (ARIMA Model)
                                  </p>
                                  {performanceData?.data?.current_performance_score !== undefined ? (
                                    <div className="flex items-baseline gap-2">
                                      <span className="text-2xl font-bold text-white">
                                        {performanceData.data.current_performance_score.toFixed(1)}
                                      </span>
                                      <span className="text-sm text-slate-400">/ 100</span>
                                      <Badge
                                        className={`ml-2 ${
                                          performanceData.data.current_performance_score >= 80
                                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                            : performanceData.data.current_performance_score >= 60
                                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                              : 'bg-red-500/20 text-red-300 border-red-500/30'
                                        }`}
                                      >
                                        {performanceData.data.trend === 'increasing'
                                          ? '↑ Improving'
                                          : performanceData.data.trend === 'decreasing'
                                            ? '↓ Declining'
                                            : '→ Stable'}
                                      </Badge>
                                    </div>
                                  ) : performanceLoading ? (
                                    <div className="flex items-center gap-2">
                                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-emerald-400" />
                                      <span className="text-slate-400">Calculating...</span>
                                    </div>
                                  ) : performanceError ? (
                                    <span className="text-amber-400">Model unavailable</span>
                                  ) : (
                                    <span className="text-slate-400">No prediction available</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Attrition Risk - Prominent Display */}
                          <div className="rounded-lg border border-slate-600/50 bg-gradient-to-br from-slate-800/60 to-slate-900/60 p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`rounded-lg p-2 ${
                                    attritionRisk
                                      ? attritionRisk.risk_level === 'high'
                                        ? 'bg-red-500/20'
                                        : attritionRisk.risk_level === 'medium'
                                          ? 'bg-amber-500/20'
                                          : 'bg-emerald-500/20'
                                      : 'bg-slate-700/40'
                                  }`}
                                >
                                  <ShieldCheck
                                    className={`w-5 h-5 ${
                                      attritionRisk
                                        ? attritionRisk.risk_level === 'high'
                                          ? 'text-red-400'
                                          : attritionRisk.risk_level === 'medium'
                                            ? 'text-amber-400'
                                            : 'text-emerald-400'
                                        : 'text-slate-400'
                                    }`}
                                  />
                                </div>
                                <div>
                                  <p className="text-xs uppercase tracking-wider text-slate-400">
                                    Attrition Risk
                                  </p>
                                  {attritionRisk ? (
                                    <div className="flex items-baseline gap-2">
                                      <span className="text-2xl font-bold text-white">
                                        {(attritionRisk.probability * 100).toFixed(1)}%
                                      </span>
                                      <Badge
                                        className={`ml-2 ${
                                          attritionRisk.risk_level === 'high'
                                            ? 'bg-red-500/20 text-red-300 border-red-500/30'
                                            : attritionRisk.risk_level === 'medium'
                                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                        }`}
                                      >
                                        {attritionRisk.risk_level.toUpperCase()} RISK
                                      </Badge>
                                    </div>
                                  ) : attritionLoading ? (
                                    <div className="flex items-center gap-2">
                                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-red-400" />
                                      <span className="text-slate-400">Scoring...</span>
                                    </div>
                                  ) : attritionError ? (
                                    <span className="text-amber-400">
                                      Model unavailable for this employee
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">No data available</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="border-t border-slate-700 pt-4">
                            <InfoRow
                              icon={TrendingUp}
                              label="Last performance review"
                              value={
                                formatDate(selectedEmployee.LastPerformanceReviewDate) ||
                                'Review pending'
                              }
                            />
                            <InfoRow
                              icon={CalendarDays}
                              label="Next review"
                              value={
                                formatDate(selectedEmployee.NextReviewDate) || 'Yet to be scheduled'
                              }
                            />
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Onboarding & Tasks */}
                    <Card className="border-slate-700 bg-slate-800/40">
                      <CardHeader>
                        <CardTitle className="text-lg text-white flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                          <span>Onboarding & task tracking</span>
                          {onboardingRecord?.start_date && (
                            <span className="text-xs uppercase tracking-wider text-slate-500">
                              Start date: {formatDate(onboardingRecord.start_date) || '—'}
                            </span>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {onboardingLoading ? (
                          <div className="flex flex-col items-center justify-center gap-3 py-6 text-slate-400">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-purple-500" />
                            <p className="text-sm">Fetching onboarding plan…</p>
                          </div>
                        ) : onboardingError ? (
                          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200">
                            Unable to load onboarding data for this employee.{' '}
                            {onboardingError instanceof Error
                              ? onboardingError.message
                              : String(onboardingError)}
                          </div>
                        ) : taskProgress.total === 0 ? (
                          <div className="rounded-lg border border-slate-700/70 bg-slate-900/40 p-4 text-sm text-slate-300">
                            No onboarding plan is recorded for this employee yet. Create one from the
                            onboarding agent when the employee is newly hired to start tracking tasks,
                            documents, and buddy assignments.
                          </div>
                        ) : (
                          <>
                            <div>
                              <div className="flex items-center justify-between text-xs text-slate-400">
                                <span>Completion</span>
                                <span>{taskProgress.completionPercentage}%</span>
                              </div>
                              <div className="mt-2 h-2 w-full rounded-full bg-slate-700/60">
                                <div
                                  className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-violet-500 transition-all"
                                  style={{
                                    width: `${Math.min(taskProgress.completionPercentage, 100)}%`,
                                  }}
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              {onboardingTasks.slice(0, 6).map((task, idx) => {
                                const normalizedStatus = (task.status || 'pending').toLowerCase();
                                const statusLabel =
                                  normalizedStatus === 'completed'
                                    ? 'Completed'
                                    : normalizedStatus === 'in-progress' ||
                                        normalizedStatus === 'ongoing'
                                      ? 'In progress'
                                      : normalizedStatus === 'blocked'
                                        ? 'Blocked'
                                        : 'Pending';
                                const statusClasses =
                                  normalizedStatus === 'completed'
                                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-200'
                                    : normalizedStatus === 'in-progress' ||
                                        normalizedStatus === 'ongoing'
                                      ? 'bg-blue-500/10 border border-blue-500/30 text-blue-200'
                                      : normalizedStatus === 'blocked'
                                        ? 'bg-red-500/10 border border-red-500/30 text-red-200'
                                        : 'bg-slate-800/60 border border-slate-700 text-slate-300';

                                return (
                                  <div
                                    key={`${task.task || task.description || 'task'}-${idx}`}
                                    className="flex flex-col gap-3 rounded-xl border border-slate-700/70 bg-slate-900/50 px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
                                  >
                                    <div className="space-y-1">
                                      <p className="text-sm font-medium text-white">
                                        {task.task || task.description || 'Onboarding task'}
                                      </p>
                                      {task.description && (
                                        <p className="text-xs text-slate-400">{task.description}</p>
                                      )}
                                      <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-wider text-slate-500">
                                        {task.owner && <span>Owner: {task.owner}</span>}
                                        {task.category && <span>Category: {task.category}</span>}
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-start gap-2 text-xs text-slate-400 sm:items-end">
                                      <span>
                                        Due:{' '}
                                        {task.due_date
                                          ? formatDate(task.due_date) || '—'
                                          : 'Not set'}
                                      </span>
                                      <span
                                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium ${statusClasses}`}
                                      >
                                        <CheckCircle2 className="w-3 h-3" />
                                        {statusLabel}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {taskProgress.total > 6 && (
                              <p className="text-xs text-slate-500">
                                Showing 6 of {taskProgress.total} onboarding tasks.
                              </p>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>

                    {/* Employment History */}
                    <Card className="border-slate-700 bg-slate-800/40">
                      <CardHeader>
                        <CardTitle className="text-lg text-white">Employment history & moves</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {hasEmploymentHistory ? (
                          employmentHistoryEntries.map((record, idx) => {
                            const entry = record as Record<string, unknown>;
                            const role = extractStringField(entry, [
                              'role',
                              'position',
                              'title',
                              'designation',
                              'jobTitle',
                            ]);
                            const department = extractStringField(entry, [
                              'department',
                              'team',
                              'division',
                              'businessUnit',
                            ]);
                            const start = extractStringField(entry, [
                              'start',
                              'from',
                              'start_date',
                              'startDate',
                              'joined',
                            ]);
                            const end = extractStringField(entry, [
                              'end',
                              'to',
                              'end_date',
                              'endDate',
                              'left',
                            ]);
                            const achievements =
                              entry.achievements ||
                              entry.Achievements ||
                              entry.highlights ||
                              entry.Highlights;
                            const responsibilities =
                              entry.responsibilities ||
                              entry.Responsibilities ||
                              entry.description;
                            const responsibilitiesText =
                              typeof responsibilities === 'string'
                                ? responsibilities
                                : Array.isArray(responsibilities)
                                  ? (responsibilities as unknown[])
                                      .map((item) => String(item))
                                      .join(', ')
                                  : undefined;
                            const achievementsList = Array.isArray(achievements)
                              ? (achievements as unknown[])
                              : null;

                            return (
                              <div
                                key={`history-${idx}`}
                                className="flex flex-col gap-3 rounded-xl border border-slate-700/70 bg-slate-900/40 p-4 md:flex-row md:items-start md:gap-4"
                              >
                                <div className="flex items-center gap-3 text-slate-300 md:w-1/3">
                                  <div className="rounded-xl bg-slate-800/80 p-3">
                                    <Briefcase className="w-4 h-4 text-purple-200" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-white">
                                      {role || 'Role information'}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                      {department || selectedEmployee.Department || 'Department'}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex-1 space-y-2 text-sm text-slate-300">
                                  <p className="text-xs text-slate-500">
                                    {formatDateRange(start, end)} • {calculateDurationBetween(start, end)}
                                  </p>
                                  {responsibilitiesText && (
                                    <p className="text-sm text-slate-300">{responsibilitiesText}</p>
                                  )}
                                  {achievementsList && achievementsList.length > 0 && (
                                    <ul className="list-disc space-y-1 pl-4 text-xs text-slate-400">
                                      {achievementsList.slice(0, 4).map((item, achievementIdx) => (
                                        <li key={`achievement-${idx}-${achievementIdx}`}>
                                          {String(item)}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-sm text-slate-400">
                            No historical records were found for this employee. Use the onboarding or
                            database manager agents to enrich employment history.
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Skills & Projects */}
                    {(skills && skills.length > 0) || selectedEmployee?.Projects ? (
                      <Card className="border-slate-700 bg-slate-800/40">
                        <CardHeader>
                          <CardTitle className="text-lg text-white">
                            Skills & current assignments
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {skills && skills.length > 0 && (
                            <div>
                              <p className="text-xs uppercase tracking-wider text-slate-500">
                                Core skills
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {skills.map((skill: string) => (
                                  <span
                                    key={skill}
                                    className="rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs text-purple-200"
                                  >
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {selectedEmployee?.Projects && selectedEmployee.Projects.length > 0 && (
                            <div className="space-y-3">
                              <p className="text-xs uppercase tracking-wider text-slate-500">
                                Active projects
                              </p>
                              <div className="space-y-2">
                                {selectedEmployee.Projects.map((project, idx) => (
                                  <div
                                    key={`${project.name}-${idx}`}
                                    className="flex items-center justify-between rounded-lg border border-slate-700/60 bg-slate-900/40 px-4 py-3 text-sm text-slate-300"
                                  >
                                    <div>
                                      <p className="font-medium text-white">{project.name}</p>
                                      <p className="text-xs text-slate-400">
                                        Role: {project.role || 'Contributor'}
                                      </p>
                                    </div>
                                    <span className="rounded-full border border-slate-700/60 bg-slate-800/60 px-3 py-1 text-xs text-slate-400">
                                      {project.status || 'In progress'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ) : null}

                    {/* Timeline */}
                    <Card className="border-slate-700 bg-slate-800/40">
                      <CardHeader>
                        <CardTitle className="text-lg text-white">
                          Employee journey & tracking
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {timelineEvents.length === 0 ? (
                          <p className="text-sm text-slate-400">
                            Tracking data is not yet available for this employee.
                          </p>
                        ) : (
                          <div className="space-y-6">
                            {timelineEvents.map((event, index) => {
                              const statusStyles =
                                event.status === 'completed'
                                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-200'
                                  : event.status === 'current'
                                    ? 'bg-purple-500/10 border border-purple-500/30 text-purple-200'
                                    : 'bg-slate-800/80 border border-slate-700 text-slate-200';
                              const statusLabel =
                                event.status === 'completed'
                                  ? 'Completed'
                                  : event.status === 'current'
                                    ? 'In progress'
                                    : 'Upcoming';

                              return (
                                <div key={`${event.title}-${index}`} className="flex gap-4">
                                  <div className="flex flex-col items-center">
                                    <div className={`rounded-xl p-3 ${statusStyles}`}>
                                      <event.icon className="w-4 h-4" />
                                    </div>
                                    {index !== timelineEvents.length - 1 && (
                                      <div className="mt-2 h-full w-px bg-slate-700" />
                                    )}
                                  </div>
                                  <div className="flex-1 space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-sm font-semibold text-white">
                                        {event.title}
                                      </span>
                                      <span className="rounded-full border border-slate-700/70 bg-slate-900/60 px-2 py-0.5 text-[10px] uppercase tracking-widest text-slate-400">
                                        {statusLabel}
                                      </span>
                                    </div>
                                    <p className="text-sm text-slate-300">{event.description}</p>
                                    <p className="text-xs text-slate-500">
                                      {event.date || 'Date to be confirmed'}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

