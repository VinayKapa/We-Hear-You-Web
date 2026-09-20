import React, { useState } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { UniversalTranslator } from './components/UniversalTranslator';
import { LiveSignVision } from './components/LiveSignVision';
import { TwoWayDialogue } from './components/TwoWayDialogue';
import { DocumentAssistant } from './components/DocumentAssistant';
import { EmergencySOS } from './components/EmergencySOS';
import { LearnISL } from './components/LearnISL';
import { UserProfileModal } from './components/UserProfileModal';
import { UserProfile, TranslationResult } from './types';
import { ThemeProvider } from './context/ThemeContext';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('translate');
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [dialogueInitialInput, setDialogueInitialInput] = useState<string>('');

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
    <ThemeProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] flex flex-col text-slate-900 dark:text-slate-100 selection:bg-sky-500/30 selection:text-sky-300 transition-colors duration-200 relative overflow-x-hidden">
        
        {/* Subtle Ambient Background Gradients */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
          <div className="absolute top-[-10%] left-[-5%] w-[45vw] h-[45vw] rounded-full bg-sky-400/5 dark:bg-sky-500/10 blur-3xl" />
          <div className="absolute top-[20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-500/5 dark:bg-indigo-600/10 blur-3xl" />
          <div className="absolute bottom-[-10%] left-[20%] w-[40vw] h-[40vw] rounded-full bg-cyan-400/5 dark:bg-cyan-500/10 blur-3xl" />
        </div>

        {/* Universal Top Navbar */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentUser={currentUser}
          onOpenProfile={() => setIsProfileOpen(true)}
          onQuickSOS={() => setActiveTab('emergency')}
        />

        {/* Active Page View */}
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

        {/* User Settings Modal */}
        <UserProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          currentUser={currentUser}
          onUpdateUser={setCurrentUser}
        />

        {/* Modern Footer */}
        <footer className="bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/90 mt-auto py-5 text-xs text-slate-500 dark:text-slate-400 transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <p className="font-medium text-slate-700 dark:text-slate-300">
              We Hear You • Universal Indian Sign Language (ISL) Accessibility Platform
            </p>

            <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-sky-600 dark:text-sky-400">SOV Grammar Engine</span>
              <span>•</span>
              <span>Real-Time 3D Kinematics</span>
              <span>•</span>
              <button
                onClick={() => setIsProfileOpen(true)}
                className="text-sky-600 dark:text-sky-400 hover:underline font-bold cursor-pointer"
              >
                Settings
              </button>
            </div>
          </div>
        </footer>

      </div>
    </ThemeProvider>
  );
}

export default App;
