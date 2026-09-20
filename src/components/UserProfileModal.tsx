import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Palette, 
  History, 
  Check, 
  Clock
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
  const [activeTab, setActiveTab] = useState<'profile' | 'avatar' | 'history'>('profile');
  const [name, setName] = useState<string>(currentUser.name);
  const [role, setRole] = useState(currentUser.role);
  const [signingSpeed, setSigningSpeed] = useState<number>(currentUser.avatarCustomization?.signingSpeed || 1);
  const [avatarModel, setAvatarModel] = useState<string>(currentUser.avatarCustomization?.avatarModel || 'readyplayer_me');
  const [shirtColor, setShirtColor] = useState<string>(currentUser.avatarCustomization?.shirtColor || '#0284c7');
  
  // History items
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

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
        avatarModel,
        shirtColor,
      },
    };

    onUpdateUser(updated);

    try {
      await fetch('/api/user/avatar-customization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signingSpeed, avatarModel, shirtColor }),
      });
    } catch (e) {}

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col max-h-[85vh] transition-colors">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 flex items-center justify-center font-black">
              {currentUser.avatarInitials}
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                User Settings
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Accessibility and avatar preferences
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Clean Modal Tab Bar */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          {[
            { id: 'profile', label: 'Profile', icon: <User className="w-3.5 h-3.5" /> },
            { id: 'avatar', label: '3D Avatar', icon: <Palette className="w-3.5 h-3.5" /> },
            { id: 'history', label: 'History', icon: <History className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 pb-2.5 px-2 text-xs font-bold border-b-2 transition cursor-pointer ${
                activeTab === tab.id
                  ? 'border-sky-600 text-sky-600 dark:text-sky-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-sm p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white dark:focus:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Community Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full text-sm p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white dark:focus:bg-slate-950 text-slate-900 dark:text-white"
                >
                  <option value="deaf_individual">Deaf Individual</option>
                  <option value="hard_of_hearing">Hard of Hearing</option>
                  <option value="hearing_ally">Hearing Ally</option>
                  <option value="interpreter">ISL Interpreter</option>
                  <option value="educator">Special Educator</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'avatar' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                  3D Sign Avatar Model
                </label>
                <div className="p-3.5 rounded-2xl border border-sky-500 bg-sky-50/70 dark:bg-sky-950/50 ring-2 ring-sky-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-black text-sm">
                      3D
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-900 dark:text-white">Avatar</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-200/70 dark:bg-sky-900/60 text-sky-800 dark:text-sky-300">Active</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Photorealistic 3D Humanoid with skeletal Indian Sign Language (ISL) articulation
                      </p>
                    </div>
                  </div>
                  <Check className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Signing Animation Speed
                  </label>
                  <span className="text-xs font-bold text-sky-600 dark:text-sky-400">{signingSpeed}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.25"
                  value={signingSpeed}
                  onChange={(e) => setSigningSpeed(parseFloat(e.target.value))}
                  className="w-full accent-sky-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                  <span>0.5x Slow</span>
                  <span>1.0x Normal</span>
                  <span>1.5x Fluent</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              {loadingHistory ? (
                <div className="text-center py-6 text-xs text-slate-400">Loading history...</div>
              ) : historyItems.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  No translation history recorded yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {historyItems.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[240px]">
                          {item.original_text || item.title || 'Translation'}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                          {new Date(item.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {item.isl_gloss && (
                        <span className="font-mono text-[11px] font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-900/40 px-2 py-0.5 rounded w-fit">
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
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveProfile}
            className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer active:scale-95"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>
        </div>

      </div>
    </div>
  );
};
