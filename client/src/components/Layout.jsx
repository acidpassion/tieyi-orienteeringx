import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import UserAvatar from './UserAvatar';

import { 
  Home, 
  History, 
  Users, 
  UserCheck,
  ClipboardList, 
  Sun, 
  Moon, 
  LogOut, 
  Menu, 
  X,
  User,
  Shield,
  BookOpen,
  Calendar,
  TrendingUp
} from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = user?.role === 'coach' ? [
    { name: '仪表板', href: '/coach/dashboard', icon: Home },
    { name: '学生管理', href: '/coach/students', icon: Users },
    { name: '学生花名册', href: '/coach/roster', icon: UserCheck },
    { name: '作业管理', href: '/coach/assignments', icon: ClipboardList },
    { name: '赛事管理', href: '/coach/events', icon: Calendar },
    { name: '赛事出勤', href: '/coach/performance-management', icon: TrendingUp },
  ] : user?.role === 'it' ? [
    { name: '仪表板', href: '/it/dashboard', icon: Home },
    { name: '学生管理', href: '/it/students', icon: Users },
    { name: '学生花名册', href: '/it/roster', icon: UserCheck },
    { name: '作业管理', href: '/it/assignments', icon: ClipboardList },
    { name: '赛事管理', href: '/it/events', icon: Calendar },
  ] : [
    { name: '仪表板', href: '/dashboard', icon: Home },
    { name: '历史记录', href: '/history', icon: History },
    { name: '学生花名册', href: '/student/roster', icon: UserCheck },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white dark:bg-gray-800">
          <div className="flex h-16 items-center justify-between px-4">
            <div className="flex items-center">
              <img src="/logo.png" alt="铁一定向" className="h-8 w-8 rounded-full object-cover aspect-square" />
              <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">铁一定向</span>
            </div>
            <button onClick={() => setSidebarOpen(false)}>
              <X className="h-6 w-6 text-gray-500" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    location.pathname === item.href
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="mr-3 h-6 w-6" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <div className="flex items-center h-16 px-4">
            <img src="/logo.png" alt="铁一定向" className="h-8 w-8 rounded-full object-cover aspect-square" />
            <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">铁一定向</span>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    location.pathname === item.href
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                  }`}
                >
                  <Icon className="mr-3 h-6 w-6" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1"></div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <button
                onClick={toggleTheme}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              
              <div className="flex items-center space-x-2 sm:space-x-4">
                {/* 头像+姓名按钮 */}
                <Link
                  to={`/profile?id=${user?.id || ''}`}
                  className="flex items-center space-x-2 px-2 sm:px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors group dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-900"
                >
                  <UserAvatar 
                    user={user} 
                    size="w-8 h-8" 
                    className="flex-shrink-0 group-hover:ring-2 group-hover:ring-blue-300 transition-all dark:group-hover:ring-blue-600" 
                  />
                  <span className="font-medium hidden sm:block">
                    {user?.name || user?.username}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-2 sm:px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:block">注销</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-6">
          <div className="mx-auto max-w-none px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;