import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Mail, Briefcase, Settings, LogOut, Edit } from 'lucide-react';
import { motion } from 'framer-motion';

export const Profile = () => {
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="p-6 space-y-6 min-h-screen bg-slate-900">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold text-white mb-2">Profile</h1>
        <p className="text-slate-400">Manage your account settings and preferences</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-1"
        >
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-600 via-violet-600 to-fuchsia-600 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-purple-500/50">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    getInitials(user.name)
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{user.name}</h2>
                  <p className="text-slate-400 mt-1">{user.role || 'HR Manager'}</p>
                </div>
                <Button className="w-full bg-slate-700 hover:bg-slate-600 text-white border-slate-600">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Details Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                <div className="p-3 bg-slate-600 rounded-lg">
                  <User className="w-5 h-5 text-slate-300" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-400">Full Name</p>
                  <p className="text-white font-medium">{user.name}</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                <div className="p-3 bg-slate-600 rounded-lg">
                  <Mail className="w-5 h-5 text-slate-300" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-400">Email Address</p>
                  <p className="text-white font-medium">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                <div className="p-3 bg-slate-600 rounded-lg">
                  <Briefcase className="w-5 h-5 text-slate-300" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-400">Role</p>
                  <p className="text-white font-medium">{user.role || 'HR Manager'}</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                <div className="p-3 bg-slate-600 rounded-lg">
                  <Settings className="w-5 h-5 text-slate-300" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-400">User ID</p>
                  <p className="text-white font-medium font-mono text-sm">{user.id}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card className="bg-slate-800/50 border-slate-700 mt-6">
            <CardHeader>
              <CardTitle className="text-white">Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={logout}
                className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

