import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { analyticsService } from '@/services/api';

export const Analytics = () => {
  const { data: summary } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: () => analyticsService.getSummary(),
  });

  const { data: deptData } = useQuery({
    queryKey: ['department-distribution'],
    queryFn: () => analyticsService.getDepartmentDistribution(),
  });

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 min-h-screen relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="relative z-10">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Analytics</h1>
          <p className="text-slate-400 mt-1">HR insights and metrics</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <Card className="border border-slate-700 bg-slate-800/50 backdrop-blur-xl hover:shadow-lg hover:shadow-purple-500/20 transition-shadow">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-white">Department Distribution</h3>
              {deptData?.data && deptData.data.length > 0 ? (
                <div className="space-y-2">
                  {deptData.data.map((item: any) => (
                    <div key={item.department} className="flex justify-between items-center p-2 rounded-lg hover:bg-slate-700/50 transition-colors">
                      <span className="text-slate-300">{item.department}</span>
                      <span className="font-semibold text-purple-400">{item.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-slate-500 py-8">No data available</div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-slate-700 bg-slate-800/50 backdrop-blur-xl hover:shadow-lg hover:shadow-purple-500/20 transition-shadow">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-white">Summary Statistics</h3>
              <div className="space-y-3">
                <div className="flex justify-between p-2 rounded-lg hover:bg-slate-700/50 transition-colors">
                  <span className="text-slate-400">Total Employees</span>
                  <span className="font-semibold text-white">{summary?.data?.totalEmployees || 0}</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg hover:bg-slate-700/50 transition-colors">
                  <span className="text-slate-400">Average Salary</span>
                  <span className="font-semibold text-emerald-400">${summary?.data?.avgSalary || 0}k</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg hover:bg-slate-700/50 transition-colors">
                  <span className="text-slate-400">Attrition Rate</span>
                  <span className="font-semibold text-amber-400">{summary?.data?.attritionRate || 0}%</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg hover:bg-slate-700/50 transition-colors">
                  <span className="text-slate-400">High Risk Employees</span>
                  <span className="font-semibold text-red-400">{summary?.data?.highRiskCount || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

