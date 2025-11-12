import { useQuery } from '@tanstack/react-query';
import { Users, TrendingDown, DollarSign, AlertTriangle, TrendingUp, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { analyticsService } from '@/services/api';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { motion } from 'framer-motion';

// Custom colors for charts
const COLORS = {
  primary: '#a855f7',
  secondary: '#10b981',
  accent: '#f59e0b',
  danger: '#ef4444',
  purple: '#9333ea',
  teal: '#14b8a6',
  violet: '#8b5cf6',
  fuchsia: '#d946ef',
};

const DEPARTMENT_COLORS = [
  COLORS.primary,
  COLORS.secondary,
  COLORS.accent,
  COLORS.purple,
  COLORS.teal,
  '#f97316',
  '#ec4899',
];

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

// Metric Card Component
const MetricCard = ({ title, value, icon: Icon, color, trend, delay = 0 }: {
  title: string;
  value: string | number;
  icon: any;
  color: string;
  trend?: { value: number; label: string };
  delay?: number;
}) => {
  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay }}
    >
      <Card className="relative overflow-hidden hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300 border border-slate-700 bg-slate-800/50 backdrop-blur-xl">
        <div className={`absolute top-0 right-0 w-32 h-32 ${color} opacity-10 rounded-bl-full`} />
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-400 mb-1">{title}</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-white">{value}</p>
                {trend && (
                  <div className={`flex items-center gap-1 text-xs font-medium ${trend.value > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {trend.value > 0 ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    <span>{Math.abs(trend.value)}%</span>
                  </div>
                )}
              </div>
              {trend && (
                <p className="text-xs text-slate-400 mt-1">{trend.label}</p>
              )}
            </div>
            <div className={`${color} p-4 rounded-xl shadow-lg`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export const Dashboard = () => {
  const { data: analytics, isLoading: summaryLoading } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: () => analyticsService.getSummary(),
  });

  const { data: deptData, isLoading: deptLoading } = useQuery({
    queryKey: ['department-distribution'],
    queryFn: () => analyticsService.getDepartmentDistribution(),
  });

  const { data: attritionData, isLoading: attritionLoading } = useQuery({
    queryKey: ['attrition-risk'],
    queryFn: () => analyticsService.getAttritionRisk(),
  });

  const { data: performanceTrendData, isLoading: performanceLoading } = useQuery({
    queryKey: ['performance-trend'],
    queryFn: () => analyticsService.getPerformanceTrend(6),
  });

  const isLoading = summaryLoading || deptLoading || attritionLoading || performanceLoading;

  const metrics = [
    {
      title: 'Total Employees',
      value: analytics?.data?.totalEmployees || 0,
      icon: Users,
      color: 'bg-gradient-to-br from-purple-500 to-violet-600',
      trend: { value: 5.2, label: 'vs last month' },
    },
    {
      title: 'Attrition Rate',
      value: `${analytics?.data?.attritionRate || 0}%`,
      icon: TrendingDown,
      color: 'bg-gradient-to-br from-red-500 to-rose-600',
      trend: { value: -2.1, label: 'vs last month' },
    },
    {
      title: 'Average Salary',
      value: `$${analytics?.data?.avgSalary || 0}k`,
      icon: DollarSign,
      color: 'bg-gradient-to-br from-emerald-500 to-teal-600',
      trend: { value: 3.5, label: 'vs last month' },
    },
    {
      title: 'High Risk',
      value: analytics?.data?.highRiskCount || 0,
      icon: AlertTriangle,
      color: 'bg-gradient-to-br from-amber-500 to-orange-600',
      trend: { value: -8.3, label: 'vs last month' },
    },
  ];

  // Format department data for pie chart
  const departmentChartData = deptData?.data?.map((item: any) => ({
    name: item.department || 'Unknown',
    value: item.count,
  })) || [];

  // Format attrition risk data for bar chart
  const attritionChartData = attritionData?.data?.map((item: any) => ({
    name: item.category || 'Unknown',
    count: item.count || 0,
  })) || [
    { name: 'Low', count: 0 },
    { name: 'Medium', count: 0 },
    { name: 'High', count: 0 },
  ];

  // Performance data from ARIMA model predictions
  const performanceData = performanceTrendData?.data && performanceTrendData.data.length > 0
    ? performanceTrendData.data
    : [
        { month: 'Jan', performance: 85, target: 80 },
        { month: 'Feb', performance: 88, target: 80 },
        { month: 'Mar', performance: 82, target: 80 },
        { month: 'Apr', performance: 90, target: 85 },
        { month: 'May', performance: 87, target: 85 },
        { month: 'Jun', performance: 92, target: 85 },
      ];

  if (isLoading) {
    return (
      <div className="p-6 min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          <p className="mt-4 text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 min-h-screen relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                Dashboard
              </h1>
              <p className="text-slate-400 mt-1 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Welcome to TalentFlow HR Management Platform
              </p>
            </div>
            <div className="text-sm text-slate-400 bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>
        </motion.div>

      {/* Metrics Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {metrics.map((metric, index) => (
          <MetricCard
            key={metric.title}
            {...metric}
            delay={index * 0.1}
          />
        ))}
      </motion.div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Distribution Pie Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <Card className="border border-slate-700 bg-slate-800/50 backdrop-blur-xl hover:shadow-lg hover:shadow-purple-500/20 transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                Department Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {departmentChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={departmentChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {departmentChartData.map((_entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #475569',
                        borderRadius: '8px',
                        padding: '8px',
                        color: '#f1f5f9',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-500">
                  <div className="text-center">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50 text-slate-600" />
                    <p>No department data available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Attrition Risk Bar Chart */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <Card className="border border-slate-700 bg-slate-800/50 backdrop-blur-xl hover:shadow-lg hover:shadow-purple-500/20 transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                Attrition Risk Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {attritionChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={attritionChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#cbd5e1', fontSize: 12 }}
                      axisLine={{ stroke: '#64748b' }}
                    />
                    <YAxis 
                      tick={{ fill: '#cbd5e1', fontSize: 12 }}
                      axisLine={{ stroke: '#64748b' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #475569',
                        borderRadius: '8px',
                        padding: '8px',
                        color: '#f1f5f9',
                      }}
                    />
                    <Bar 
                      dataKey="count" 
                      fill={COLORS.primary}
                      radius={[8, 8, 0, 0]}
                    >
                      {attritionChartData.map((entry: any, index: number) => {
                        let color = COLORS.secondary;
                        if (entry.name === 'High') color = COLORS.danger;
                        if (entry.name === 'Medium') color = COLORS.accent;
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-400">
                  <div className="text-center">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No attrition risk data available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Performance Trend Line Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <Card className="border border-slate-700 bg-slate-800/50 backdrop-blur-xl hover:shadow-lg hover:shadow-purple-500/20 transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Performance Trend (Last 6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: '#cbd5e1', fontSize: 12 }}
                  axisLine={{ stroke: '#64748b' }}
                />
                <YAxis 
                  tick={{ fill: '#cbd5e1', fontSize: 12 }}
                  axisLine={{ stroke: '#64748b' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    padding: '8px',
                    color: '#f1f5f9',
                  }}
                />
                <Legend wrapperStyle={{ color: '#cbd5e1' }} />
                <Line 
                  type="monotone" 
                  dataKey="performance" 
                  stroke={COLORS.primary} 
                  strokeWidth={3}
                  dot={{ fill: COLORS.primary, r: 5 }}
                  name="Performance"
                />
                <Line 
                  type="monotone" 
                  dataKey="target" 
                  stroke={COLORS.accent} 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: COLORS.accent, r: 4 }}
                  name="Target"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <Card className="border border-slate-700 bg-gradient-to-br from-purple-500/10 to-violet-500/10 backdrop-blur-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-400 mb-1">New Hires This Month</p>
                <p className="text-2xl font-bold text-white">12</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-violet-600 p-3 rounded-lg shadow-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-700 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 backdrop-blur-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-400 mb-1">Active Projects</p>
                <p className="text-2xl font-bold text-white">8</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-3 rounded-lg shadow-lg">
                <Activity className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-700 bg-gradient-to-br from-fuchsia-500/10 to-pink-500/10 backdrop-blur-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-fuchsia-400 mb-1">Training Completed</p>
                <p className="text-2xl font-bold text-white">45</p>
              </div>
              <div className="bg-gradient-to-br from-fuchsia-500 to-pink-600 p-3 rounded-lg shadow-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      </div>
    </div>
  );
};
