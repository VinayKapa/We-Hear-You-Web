import React from 'react';
import { 
  Ear, 
  HandMetal, 
  MessageSquareText, 
  FileText, 
  AlertTriangle, 
  GraduationCap, 
  Camera, 
  User, 
  Activity,
  Sparkles
} from 'lucide-react';
import { UserProfile } from '../types';

export type ActiveTab = 'translate' | 'vision' | 'dialogue' | 'documents' | 'emergency' | 'learn';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentUser: UserProfile;
  onOpenProfile: () => void;
  onQuickSOS: () => void;
  serverHealth: { status: string; hasApiKey: boolean } | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onOpenProfile,
  onQuickSOS,
  serverHealth,
}) => {
  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'translate', label: 'Universal Translate', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'vision', label: 'Sign Vision AI', icon: <Camera className="w-4 h-4" />, badge: 'LIVE' },
    { id: 'dialogue', label: 'Two-Way Dialogue', icon: <MessageSquareText className="w-4 h-4" /> },
    { id: 'documents', label: 'Accessible Docs', icon: <FileText className="w-4 h-4" /> },
    { id: 'emergency', label: 'Emergency SOS', icon: <AlertTriangle className="w-4 h-4" /> },
    { id: 'learn', label: 'Learn ISL', icon: <GraduationCap className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('translate')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
              <HandMetal className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg sm:text-xl text-slate-900 tracking-tight">
                  We Hear You
                </span>
                <span className="hidden md:inline-flex items-center text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 border border-sky-200">
                  ISL AI
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Universal Accessibility & Sign Language Platform
              </p>
            </div>
          </div>

          {/* Navigation Bar for Desktop */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/80">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-white text-sky-700 shadow-xs border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500 text-white tracking-wide">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2">
            {/* Server Status Pill */}
            <div 
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 border border-slate-200 text-slate-700"
              title={serverHealth ? `Server: ${serverHealth.status}, AI Key: ${serverHealth.hasApiKey ? 'Configured' : 'Local Fallback'}` : 'Connecting...'}
            >
              <span className={`w-2 h-2 rounded-full ${serverHealth?.status === 'ok' ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
              <span className="text-[11px]">
                {serverHealth?.hasApiKey ? 'Gemini AI Active' : 'Semantic ISL Mode'}
              </span>
            </div>

            {/* Quick SOS Button */}
            <button
              onClick={onQuickSOS}
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm shadow-rose-600/20 active:scale-95"
              title="One-Tap Emergency Assistance"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">SOS</span>
            </button>

            {/* Profile Avatar Pill */}
            <button
              onClick={onOpenProfile}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 text-xs font-semibold transition"
            >
              <div className="w-6 h-6 rounded-full bg-sky-600 text-white text-[11px] font-bold flex items-center justify-center">
                {currentUser.avatarInitials}
              </div>
              <span className="hidden md:inline truncate max-w-[100px]">
                {currentUser.name}
              </span>
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Horizontal Navigation Tabs */}
      <div className="lg:hidden flex items-center gap-1 overflow-x-auto px-3 py-2 border-t border-slate-200/60 bg-slate-50">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
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
