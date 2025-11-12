import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, User, Settings, LogOut, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';

export const Navbar = () => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsProfileOpen(false);
  };

  return (
    <div className="h-16 bg-slate-800 border-b border-slate-700 px-6 flex items-center justify-between">
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search..."
            className="pl-10 w-full bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-primary-500"
          />
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <button className="relative p-2 hover:bg-slate-700 rounded-lg transition-colors">
          <Bell className="w-5 h-5 text-slate-300" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center space-x-2 p-1 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-violet-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {user ? getInitials(user.name) : 'U'}
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-300 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="p-4 border-b border-slate-700">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-violet-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {user ? getInitials(user.name) : 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{user?.name || 'User'}</p>
                    <p className="text-sm text-slate-400 truncate">{user?.email || ''}</p>
                  </div>
                </div>
              </div>
              <div className="py-2">
                <button
                  onClick={() => {
                    navigate('/profile');
                    setIsProfileOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-slate-300 hover:bg-slate-700 flex items-center space-x-3 transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span>View Profile</span>
                </button>
                <button
                  onClick={() => {
                    navigate('/settings');
                    setIsProfileOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-slate-300 hover:bg-slate-700 flex items-center space-x-3 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </button>
                <div className="border-t border-slate-700 my-2"></div>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-red-400 hover:bg-slate-700 flex items-center space-x-3 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

