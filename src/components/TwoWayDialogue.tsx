import React, { useState } from 'react';
import { 
  MessageSquare, 
  Send, 
  Mic, 
  MicOff, 
  Volume2, 
  User, 
  HandMetal, 
  Sparkles, 
  RotateCcw,
  Smile
} from 'lucide-react';
import { ConversationTurn, SignToken } from '../types';
import { Avatar3D } from './Avatar3D';

interface TwoWayDialogueProps {
  initialSignInput?: string;
}

export const TwoWayDialogue: React.FC<TwoWayDialogueProps> = ({ initialSignInput = '' }) => {
  const [activeSpeaker, setActiveSpeaker] = useState<'deaf' | 'hearing'>('deaf');
  const [messages, setMessages] = useState<ConversationTurn[]>([
    {
      id: 'init_1',
      sender: 'deaf',
      text: 'HELLO NEED HELP PLATFORM FIND',
      islGloss: 'HELLO PLATFORM-NUMBER WHERE HELP',
      interpretedMeaning: 'Hello, I need help finding my railway platform.',
      spokenAudioText: 'Hello, could you please help me find my platform?',
      facialExpression: 'question_wh',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
    {
      id: 'init_2',
      sender: 'hearing',
      text: 'Platform 3 is straight ahead, take the escalator on your right.',
      islGloss: 'PLATFORM 3 STRAIGHT ESCALATOR RIGHT-SIDE GO',
      interpretedMeaning: 'Platform 3 is straight ahead. Go to the right escalator.',
      spokenAudioText: 'Platform 3 is straight ahead, take the escalator on your right.',
      facialExpression: 'neutral',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputMessage, setInputMessage] = useState<string>(initialSignInput);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [currentTokens, setCurrentTokens] = useState<SignToken[]>([
    { gloss: 'PLATFORM', meaning: 'Platform', durationSec: 1.0 },
    { gloss: '3', meaning: 'Number 3', durationSec: 0.8 },
    { gloss: 'STRAIGHT', meaning: 'Straight ahead', durationSec: 0.9 },
  ]);

  const handleSendTurn = async (messageToSend?: string) => {
    const text = messageToSend || inputMessage;
    if (!text.trim()) return;

    setIsLoading(true);
    try {
      const speakerType = activeSpeaker === 'deaf' ? 'deaf_user_signs' : 'hearing_speaks';
      const response = await fetch('/api/gemini/conversation-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          speakerType,
          message: text,
          conversationContext: messages.map((m) => ({
            sender: m.sender,
            text: m.text,
            meaning: m.interpretedMeaning,
          })),
        }),
      });

      if (!response.ok) throw new Error('Conversation turn failed');

      const data = await response.json();

      const newTurn: ConversationTurn = {
        id: `turn_${Date.now()}`,
        sender: activeSpeaker,
        text,
        islGloss: data.islGloss,
        interpretedMeaning: data.interpretedMeaning,
        spokenAudioText: data.spokenAudioText,
        facialExpression: data.facialExpression,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, newTurn]);
      setInputMessage('');

      // If spoken to deaf user, update 3D Avatar
      if (data.islGloss) {
        const tokens: SignToken[] = data.islGloss.split(' ').map((g: string) => ({
          gloss: g,
          meaning: g.toLowerCase(),
          durationSec: 0.9,
        }));
        setCurrentTokens(tokens);
      }

      // If deaf user spoke to hearing user, automatically speak aloud
      if (activeSpeaker === 'deaf' && data.spokenAudioText && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(data.spokenAudioText);
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
      }

      // Auto flip speaker turn for conversational natural flow
      setActiveSpeaker(activeSpeaker === 'deaf' ? 'hearing' : 'deaf');
    } catch (err) {
      console.error('Conversation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeakAloud = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-sky-600 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-100">
            Real-Time Accessible Dialogue
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
            Two-Way Deaf & Hearing Conversation Bridge
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Converts signing into voice-overs for the hearing listener, and spoken speech into 3D ISL animation & plain text for the deaf participant.
          </p>
        </div>

        {/* Active Speaker Switcher */}
        <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center gap-1 border border-slate-200">
          <button
            onClick={() => setActiveSpeaker('deaf')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeSpeaker === 'deaf'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HandMetal className="w-3.5 h-3.5" />
            <span>Deaf User (ISL)</span>
          </button>
          <button
            onClick={() => setActiveSpeaker('hearing')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeSpeaker === 'hearing'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Hearing User (Voice)</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Chat History on Left (7 cols), 3D Signing Avatar on Right (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Chat Thread Panel */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[560px]">
          
          {/* Messages Scroll List */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
            {messages.map((m) => {
              const isDeaf = m.sender === 'deaf';
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isDeaf ? 'items-start' : 'items-end'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {isDeaf ? 'Deaf Participant (Sign)' : 'Hearing Participant (Spoken)'}
                    </span>
                    <span className="text-[10px] text-slate-300">• {m.timestamp}</span>
                  </div>

                  <div
                    className={`max-w-[85%] rounded-2xl p-4 shadow-xs text-xs sm:text-sm ${
                      isDeaf
                        ? 'bg-sky-50 text-slate-900 border border-sky-200/80 rounded-tl-xs'
                        : 'bg-indigo-50 text-slate-900 border border-indigo-200/80 rounded-tr-xs'
                    }`}
                  >
                    {/* Primary Text */}
                    <p className="font-bold text-slate-900 text-sm mb-1">
                      {m.interpretedMeaning || m.text}
                    </p>

                    {/* Gloss representation */}
                    {m.islGloss && (
                      <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] font-extrabold text-sky-800 bg-sky-100/80 px-2 py-0.5 rounded">
                          ISL: {m.islGloss}
                        </span>
                        {m.spokenAudioText && (
                          <button
                            onClick={() => handleSpeakAloud(m.spokenAudioText!)}
                            className="p-1 hover:bg-slate-200 rounded text-slate-600"
                            title="Speak voice-over aloud"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Replies Row */}
          <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2 overflow-x-auto">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
              Quick Signs:
            </span>
            {['YES', 'NO', 'AGAIN PLEASE', 'WRITE DOWN', 'THANK YOU', 'UNDERSTOOD'].map((qr, idx) => (
              <button
                key={idx}
                onClick={() => handleSendTurn(qr)}
                className="text-xs font-bold bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-700 px-3 py-1 rounded-xl border border-slate-200 whitespace-nowrap transition shadow-2xs"
              >
                {qr}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-4 border-t border-slate-200 bg-white rounded-b-3xl">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendTurn()}
                placeholder={
                  activeSpeaker === 'deaf'
                    ? 'Enter sign tokens or words (e.g., WHERE TRAIN DELAY)...'
                    : 'Speak or type response for the deaf participant...'
                }
                className="flex-1 text-xs sm:text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-900 placeholder:text-slate-400"
              />

              <button
                onClick={() => handleSendTurn()}
                disabled={isLoading || !inputMessage.trim()}
                className={`p-3 rounded-xl text-white font-bold transition shadow-sm ${
                  activeSpeaker === 'deaf' ? 'bg-sky-600 hover:bg-sky-500' : 'bg-indigo-600 hover:bg-indigo-500'
                } disabled:opacity-40 active:scale-95`}
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin block" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

        </div>

        {/* 3D Sign Avatar Column */}
        <div className="lg:col-span-5 space-y-4">
          <Avatar3D
            signTokens={currentTokens}
            height="h-[460px] sm:h-[560px]"
          />
        </div>

      </div>
    </div>
  );
};
