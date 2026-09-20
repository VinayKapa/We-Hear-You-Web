import React from 'react';
import { 
  Sparkles,
  Camera, 
  MessageSquareText, 
  FileText, 
  AlertTriangle, 
  GraduationCap, 
  HandMetal,
  Sun,
  Moon
} from 'lucide-react';
import { UserProfile } from '../types';
import { useTheme } from '../context/ThemeContext';

export type ActiveTab = 'translate' | 'vision' | 'dialogue' | 'documents' | 'emergency' | 'learn';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentUser: UserProfile;
  onOpenProfile: () => void;
  onQuickSOS: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onOpenProfile,
  onQuickSOS,
}) => {
  const { isDark, toggleTheme } = useTheme();

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'translate', label: 'Translator', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'vision', label: 'Sign Vision', icon: <Camera className="w-4 h-4" /> },
    { id: 'dialogue', label: 'Dialogue', icon: <MessageSquareText className="w-4 h-4" /> },
    { id: 'documents', label: 'Documents', icon: <FileText className="w-4 h-4" /> },
    { id: 'emergency', label: 'Emergency SOS', icon: <AlertTriangle className="w-4 h-4" /> },
    { id: 'learn', label: 'Learn ISL', icon: <GraduationCap className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/90 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Brand Title */}
          <div 
            className="flex items-center gap-2.5 cursor-pointer select-none group" 
            onClick={() => setActiveTab('translate')}
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 via-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/25 group-hover:scale-105 transition-transform">
              <HandMetal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-lg text-slate-900 dark:text-white tracking-tight leading-tight">
                  We Hear You
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-sky-500/10 dark:bg-sky-400/20 text-sky-600 dark:text-sky-300 border border-sky-500/20">
                  ISL AI
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block leading-none">
                Accessibility Platform
              </span>
            </div>
          </div>

          {/* Desktop Navigation Bar */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100/90 dark:bg-slate-900/90 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 transition-colors">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs border border-slate-200/50 dark:border-slate-700/60'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/50'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2">
            
            {/* Theme Toggle (Dark / Light) */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 transition shadow-xs cursor-pointer"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle dark mode"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400 animate-spin-slow" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>

            {/* Quick SOS Button */}
            <button
              onClick={onQuickSOS}
              className="flex items-center gap-1.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-sm shadow-rose-500/20 active:scale-95 cursor-pointer"
              title="One-Tap Emergency Assistance"
            >
              <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
              <span>SOS</span>
            </button>

            {/* Profile Avatar Pill */}
            <button
              onClick={onOpenProfile}
              className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs font-bold transition cursor-pointer"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 text-white text-[11px] font-bold flex items-center justify-center shadow-xs">
                {currentUser.avatarInitials}
              </div>
              <span className="hidden sm:inline truncate max-w-[100px]">
                {currentUser.name}
              </span>
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Horizontal Navigation Bar */}
      <div className="lg:hidden flex items-center gap-1 overflow-x-auto px-3 py-2 border-t border-slate-200/60 dark:border-slate-800/90 bg-slate-50/90 dark:bg-slate-950/90 scrollbar-none">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-200/60 dark:bg-slate-900'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
