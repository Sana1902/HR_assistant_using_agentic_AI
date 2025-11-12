import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { employeeService } from '@/services/api';
import type { Employee } from '@/types/employee';

export const Employees = () => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data: employeesData, isLoading } = useQuery({
    queryKey: ['employees', search, page],
    queryFn: () => employeeService.getAll({ search, page, limit: 20 }),
  });

  const employees = employeesData?.data || [];

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 min-h-screen relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="relative z-10">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Employees</h1>
            <p className="text-slate-400 mt-1">Manage your workforce</p>
          </div>
          <Button className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white shadow-lg shadow-purple-500/50">
            <Plus className="w-4 h-4 mr-2" />
            Add Employee
          </Button>
        </div>

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
              {employees.map((emp: Employee) => (
                <Card
                  key={emp.Employee_ID}
                  className="hover:shadow-lg hover:shadow-purple-500/20 transition-all cursor-pointer border border-slate-700 bg-slate-800/50 backdrop-blur-xl hover:scale-105"
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-violet-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                        {emp.Name?.charAt(0)?.toUpperCase() || 'E'}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-white">{emp.Name || 'Unknown'}</h3>
                        <p className="text-sm text-slate-400">{emp.Position || 'N/A'}</p>
                      </div>
                      <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">{emp.Department || 'N/A'}</Badge>
                      <div className="text-xs text-slate-400">
                        ID: {emp.Employee_ID}
                      </div>
                      {emp.Salary && (
                        <div className="text-sm font-medium text-emerald-400">
                          ${emp.Salary.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
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
    </div>
  );
};

