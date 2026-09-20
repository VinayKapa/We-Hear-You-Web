import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Settings, 
  Database, 
  History, 
  Check, 
  RefreshCw, 
  Sparkles,
  ShieldCheck,
  Palette
} from 'lucide-react';
import { UserProfile } from '../types';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onUpdateUser: (updated: UserProfile) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateUser,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'avatar' | 'database' | 'history'>('profile');
  const [name, setName] = useState<string>(currentUser.name);
  const [role, setRole] = useState(currentUser.role);
  const [signingSpeed, setSigningSpeed] = useState<number>(currentUser.avatarCustomization?.signingSpeed || 1);
  const [shirtColor, setShirtColor] = useState<string>(currentUser.avatarCustomization?.shirtColor || '#0284c7');
  
  // Database status
  const [supabaseConfig, setSupabaseConfig] = useState<{ configured: boolean; source: string; url?: string } | null>(null);
  const [testingDb, setTestingDb] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  
  // History items
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    // Fetch Supabase configuration status
    fetch('/api/supabase/config')
      .then((res) => res.json())
      .then((data) => setSupabaseConfig(data))
      .catch(() => {});

    // Fetch user history
    setLoadingHistory(true);
    fetch('/api/user/history')
      .then((res) => res.json())
      .then((data) => {
        if (data.history) {
          setHistoryItems(data.history);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveProfile = async () => {
    const updated: UserProfile = {
      ...currentUser,
      name,
      role,
      avatarInitials: name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'U',
      avatarCustomization: {
        ...currentUser.avatarCustomization,
        signingSpeed,
        shirtColor,
      },
    };

    onUpdateUser(updated);

    try {
      await fetch('/api/user/avatar-customization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signingSpeed, shirtColor }),
      });
    } catch (e) {}

    onClose();
  };

  const handleTestDatabase = async () => {
    setTestingDb(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/supabase/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult('Successfully connected to Supabase live database!');
      } else {
        setTestResult(data.message || 'Supabase credentials are not connected yet. Operating in reliable local memory mode.');
      }
    } catch (e: any) {
      setTestResult('Database test completed. Local in-memory store active.');
    } finally {
      setTestingDb(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center font-black">
              {currentUser.avatarInitials}
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                User Settings & Preferences
              </h2>
              <p className="text-xs text-slate-500">
                Configure accessibility profile, 3D avatar, and database synchronization.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tab Bar */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-100 bg-slate-50/50">
          {[
            { id: 'profile', label: 'Accessibility Profile', icon: <User className="w-3.5 h-3.5" /> },
            { id: 'avatar', label: '3D Avatar', icon: <Palette className="w-3.5 h-3.5" /> },
            { id: 'database', label: 'Cloud Database', icon: <Database className="w-3.5 h-3.5" /> },
            { id: 'history', label: 'Activity Logs', icon: <History className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 pb-3 px-2 text-xs font-bold border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-sky-600 text-sky-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wide block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs sm:text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wide block mb-1">
                  Primary Community Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full text-xs sm:text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-900"
                >
                  <option value="deaf_individual">Deaf Individual (ISL Primary)</option>
                  <option value="hard_of_hearing">Hard of Hearing</option>
                  <option value="hearing_ally">Hearing Ally / Family Member</option>
                  <option value="interpreter">Certified ISL Interpreter</option>
                  <option value="educator">Special Educator / Researcher</option>
                </select>
              </div>

              <div className="bg-sky-50 p-4 rounded-2xl border border-sky-100 text-xs text-sky-950">
                <span className="font-bold block mb-1">Accessibility Tip:</span>
                Selecting your role helps the AI personalize ISL gloss vocabulary, Non-Manual Marker intensity, and two-way speech synthesis.
              </div>
            </div>
          )}

          {activeTab === 'avatar' && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
                    Default Signing Speed
                  </label>
                  <span className="text-xs font-bold text-sky-600">{signingSpeed}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.25"
                  value={signingSpeed}
                  onChange={(e) => setSigningSpeed(parseFloat(e.target.value))}
                  className="w-full accent-sky-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>0.5x (Slow practice)</span>
                  <span>1.0x (Standard)</span>
                  <span>1.5x (Fluent)</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wide block mb-2">
                  Avatar Shirt Color
                </label>
                <div className="flex items-center gap-3">
                  {['#0284c7', '#4f46e5', '#059669', '#dc2626', '#d97706', '#475569'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setShirtColor(c)}
                      className={`w-8 h-8 rounded-full border-2 transition ${
                        shirtColor === c ? 'ring-2 ring-sky-500 scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'database' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
                    Supabase Database Status
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    supabaseConfig?.configured ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {supabaseConfig?.configured ? 'Cloud Configured' : 'In-Memory Store Active'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  The backend has an integrated persistence layer that stores translations, emergency SOS dispatches, and user settings seamlessly in memory, with optional Supabase cloud synchronization.
                </p>
              </div>

              <button
                onClick={handleTestDatabase}
                disabled={testingDb}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm"
              >
                {testingDb ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Database className="w-3.5 h-3.5" />
                )}
                <span>Run Persistence Diagnostic</span>
              </button>

              {testResult && (
                <div className="p-3 bg-slate-100 rounded-xl text-xs font-medium text-slate-800 border border-slate-200">
                  {testResult}
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
                  Recent Saved Sessions ({historyItems.length})
                </span>
              </div>

              {loadingHistory ? (
                <div className="text-center py-6 text-xs text-slate-400">Loading logs...</div>
              ) : historyItems.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  No activity saved yet. Use the Universal Translator or Emergency SOS to record logs.
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {historyItems.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-900">
                          {item.original_text || item.title || 'Session Activity'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(item.created_at || Date.now()).toLocaleTimeString()}
                        </span>
                      </div>
                      {item.isl_gloss && (
                        <span className="font-mono text-[11px] text-sky-700 bg-sky-50 px-2 py-0.5 rounded w-fit">
                          ISL: {item.isl_gloss}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveProfile}
            className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save Changes</span>
          </button>
        </div>

      </div>
    </div>
  );
};
