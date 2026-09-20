import React, { useState, useEffect } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { UniversalTranslator } from './components/UniversalTranslator';
import { LiveSignVision } from './components/LiveSignVision';
import { TwoWayDialogue } from './components/TwoWayDialogue';
import { DocumentAssistant } from './components/DocumentAssistant';
import { EmergencySOS } from './components/EmergencySOS';
import { LearnISL } from './components/LearnISL';
import { UserProfileModal } from './components/UserProfileModal';
import { UserProfile, TranslationResult, EmergencyLog } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('translate');
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [dialogueInitialInput, setDialogueInitialInput] = useState<string>('');
  const [serverHealth, setServerHealth] = useState<{ status: string; hasApiKey: boolean } | null>(null);

  const [currentUser, setCurrentUser] = useState<UserProfile>({
    id: 'user_deaf_01',
    name: 'Aarav Sharma',
    email: 'aarav@wehearyou.in',
    role: 'deaf_individual',
    avatarInitials: 'AS',
    avatarCustomization: {
      signingSpeed: 1.0,
      shirtColor: '#0284c7',
    },
  });

  // Check backend server health
  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        setServerHealth({
          status: data.status || 'ok',
          hasApiKey: Boolean(data.hasApiKey),
        });
      })
      .catch((err) => {
        console.warn('Backend health check error:', err);
      });
  }, []);

  const handleSaveTranslationToHistory = async (result: TranslationResult) => {
    try {
      await fetch('/api/user/history/translation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalText: result.originalText,
          islGloss: result.islGloss,
          summary: result.summary,
          importance: result.importance,
          confidenceScore: result.confidenceScore,
          sourceType: 'universal_translator',
        }),
      });
    } catch (e) {}
  };

  const handleSendVisionToDialogue = (text: string) => {
    setDialogueInitialInput(text);
    setActiveTab('dialogue');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900 selection:bg-sky-200 selection:text-sky-900">
      
      {/* Top Universal Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onOpenProfile={() => setIsProfileOpen(true)}
        onQuickSOS={() => setActiveTab('emergency')}
        serverHealth={serverHealth}
      />

      {/* Main Active Page Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'translate' && (
          <UniversalTranslator onSaveToHistory={handleSaveTranslationToHistory} />
        )}

        {activeTab === 'vision' && (
          <LiveSignVision onSendToDialogue={handleSendVisionToDialogue} />
        )}

        {activeTab === 'dialogue' && (
          <TwoWayDialogue initialSignInput={dialogueInitialInput} />
        )}

        {activeTab === 'documents' && (
          <DocumentAssistant />
        )}

        {activeTab === 'emergency' && (
          <EmergencySOS />
        )}

        {activeTab === 'learn' && (
          <LearnISL />
        )}
      </main>

      {/* User Settings & Diagnostic Modal */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentUser={currentUser}
        onUpdateUser={setCurrentUser}
      />

      {/* Accessible Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <p className="font-extrabold text-slate-800">
              We Hear You • Universal ISL Accessibility Platform
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Empowering 18+ million Deaf & Hard-of-Hearing individuals across India through multimodal AI & 3D Kinematics.
            </p>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-600">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> WebRTC & MediaPipe Ready
            </span>
            <span>•</span>
            <span>Indian Sign Language (SOV)</span>
            <span>•</span>
            <button
              onClick={() => setIsProfileOpen(true)}
              className="text-sky-600 hover:underline font-bold"
            >
              Diagnostic Settings
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
}
export default App;
