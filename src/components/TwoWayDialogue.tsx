import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  User, 
  HandMetal, 
  Sparkles, 
  RotateCcw,
  Info
} from 'lucide-react';
import { ConversationTurn, SignToken } from '../types';
import { Avatar3D } from './Avatar3D';
import { AudioWaveformVisualizer } from './AudioWaveformVisualizer';

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
      interpretedMeaning: 'Hello, could you please help me find my train platform?',
      spokenAudioText: 'Hello, could you please help me find my train platform?',
      facialExpression: 'question_wh',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
    {
      id: 'init_2',
      sender: 'hearing',
      text: 'Platform 3 is straight ahead, take the escalator on your right.',
      islGloss: 'PLATFORM 3 STRAIGHT ESCALATOR RIGHT GO',
      interpretedMeaning: 'Platform 3 is straight ahead. Take the escalator on your right.',
      spokenAudioText: 'Platform 3 is straight ahead, take the escalator on your right.',
      facialExpression: 'neutral',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputMessage, setInputMessage] = useState<string>(initialSignInput);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRecordingHearingVoice, setIsRecordingHearingVoice] = useState<boolean>(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [playbackKey, setPlaybackKey] = useState<number>(Date.now());
  const [activeAvatarTurn, setActiveAvatarTurn] = useState<ConversationTurn | null>({
    id: 'init_2',
    sender: 'hearing',
    text: 'Platform 3 is straight ahead, take the escalator on your right.',
    islGloss: 'PLATFORM 3 STRAIGHT ESCALATOR RIGHT GO',
    interpretedMeaning: 'Platform 3 is straight ahead. Take the escalator on your right.',
    spokenAudioText: 'Platform 3 is straight ahead, take the escalator on your right.',
    facialExpression: 'neutral',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  });

  const [currentTokens, setCurrentTokens] = useState<SignToken[]>([
    { gloss: 'PLATFORM', meaning: 'Train platform', durationSec: 1.1 },
    { gloss: '3', meaning: 'Number 3 gesture', durationSec: 1.0 },
    { gloss: 'STRAIGHT', meaning: 'Straight ahead', durationSec: 1.1 },
  ]);

  const recognitionRef = useRef<any>(null);

  const handlePlayOnAvatar = (turn: ConversationTurn) => {
    if (!turn.islGloss) return;
    const tokens: SignToken[] = turn.islGloss.split(' ').filter(Boolean).map((g: string) => ({
      gloss: g.toUpperCase(),
      meaning: g.toLowerCase(),
      durationSec: 1.2,
    }));
    setCurrentTokens(tokens);
    setActiveAvatarTurn(turn);
    setPlaybackKey(Date.now());
  };

  useEffect(() => {
    if (initialSignInput) {
      setInputMessage(initialSignInput);
      setActiveSpeaker('deaf');
    }
  }, [initialSignInput]);

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSendTurn = async (messageToSend?: string) => {
    const text = messageToSend || inputMessage;
    if (!text.trim()) return;

    // Instant local sign token response so avatar performs gestures immediately
    const localTokens: SignToken[] = text.toUpperCase().trim().split(' ').filter(Boolean).map((g: string) => ({
      gloss: g,
      meaning: g.toLowerCase(),
      durationSec: 1.2,
    }));
    setCurrentTokens(localTokens);
    setPlaybackKey(Date.now());

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

      // If spoken or signed, update 3D Avatar immediately to perform the gestures
      if (data.islGloss) {
        const tokens: SignToken[] = data.islGloss.split(' ').filter(Boolean).map((g: string) => ({
          gloss: g.toUpperCase(),
          meaning: g.toLowerCase(),
          durationSec: 1.2,
        }));
        setCurrentTokens(tokens);
        setActiveAvatarTurn(newTurn);
        setPlaybackKey(Date.now());
      }

      // If deaf user signs, automatically speak aloud for the hearing person
      if (activeSpeaker === 'deaf' && data.spokenAudioText && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(data.spokenAudioText);
        utterance.rate = 1.0;
        setPlayingAudioId(newTurn.id);
        utterance.onend = () => setPlayingAudioId(null);
        utterance.onerror = () => setPlayingAudioId(null);
        window.speechSynthesis.speak(utterance);
      }

      // Switch turn
      setActiveSpeaker(activeSpeaker === 'deaf' ? 'hearing' : 'deaf');
    } catch (err) {
      console.error('Conversation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Hearing Person Voice Input
  const toggleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceNotice('Speech recognition is not supported in this browser. You can type directly.');
      setTimeout(() => setVoiceNotice(null), 4000);
      return;
    }

    if (isRecordingHearingVoice) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsRecordingHearingVoice(false);
    } else {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsRecordingHearingVoice(true);
          setVoiceNotice(null);
        };
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputMessage(transcript);
          setIsRecordingHearingVoice(false);
          handleSendTurn(transcript);
        };
        recognition.onerror = (e: any) => {
          console.warn('Speech recognition notice:', e);
          setIsRecordingHearingVoice(false);
          setVoiceNotice('Voice input finished or microphone permission required.');
          setTimeout(() => setVoiceNotice(null), 3000);
        };
        recognition.onend = () => setIsRecordingHearingVoice(false);

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        setIsRecordingHearingVoice(false);
        setVoiceNotice('Microphone access unavailable. Please type your message.');
        setTimeout(() => setVoiceNotice(null), 3000);
      }
    }
  };

  const handleSpeakAloud = (text: string, id: string) => {
    if (!('speechSynthesis' in window)) return;

    if (playingAudioId === id) {
      window.speechSynthesis.cancel();
      setPlayingAudioId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    setPlayingAudioId(id);
    utterance.onend = () => setPlayingAudioId(null);
    utterance.onerror = () => setPlayingAudioId(null);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Two-Way Dialogue
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time bridge translating sign language into speech and spoken voice into 3D signing.
          </p>
        </div>

        {/* Speaker Switcher */}
        <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl flex items-center gap-1 border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveSpeaker('deaf')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSpeaker === 'deaf'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <HandMetal className="w-3.5 h-3.5" />
            <span>Deaf User</span>
          </button>
          <button
            onClick={() => setActiveSpeaker('hearing')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSpeaker === 'hearing'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Hearing User</span>
          </button>
        </div>
      </div>

      {voiceNotice && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2 animate-in fade-in duration-150">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{voiceNotice}</span>
        </div>
      )}

      {/* Main Grid: Chat Thread on Left (7 cols), 3D Avatar on Right (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Chat Thread Panel */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col h-[560px] overflow-hidden transition-colors">
          
          {/* Messages Scroll List */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
            {messages.map((m) => {
              const isDeaf = m.sender === 'deaf';
              const isPlaying = playingAudioId === m.id;

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isDeaf ? 'items-start' : 'items-end'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {isDeaf ? 'Deaf Participant' : 'Hearing Participant'}
                    </span>
                    <span className="text-[10px] text-slate-300 dark:text-slate-600">• {m.timestamp}</span>
                  </div>

                  <div
                    className={`max-w-[85%] rounded-2xl p-4 shadow-xs text-xs sm:text-sm transition-all ${
                      isDeaf
                        ? 'bg-sky-50 dark:bg-sky-950/40 text-slate-900 dark:text-slate-100 border border-sky-100 dark:border-sky-900/50 rounded-tl-xs'
                        : 'bg-indigo-50 dark:bg-indigo-950/40 text-slate-900 dark:text-slate-100 border border-indigo-100 dark:border-indigo-900/50 rounded-tr-xs'
                    }`}
                  >
                    <p className="font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
                      {m.interpretedMeaning || m.text}
                    </p>

                    {m.islGloss && (
                      <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] font-black text-sky-800 dark:text-sky-300 bg-white/80 dark:bg-slate-800 px-2 py-0.5 rounded border border-sky-200/50 dark:border-sky-800">
                          ISL: {m.islGloss}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handlePlayOnAvatar(m)}
                            className="px-2 py-1 rounded-lg text-[11px] font-bold bg-sky-100 hover:bg-sky-200 dark:bg-sky-900/60 dark:hover:bg-sky-900 text-sky-800 dark:text-sky-200 transition cursor-pointer flex items-center gap-1"
                            title="Sign on 3D Avatar"
                          >
                            <Sparkles className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                            <span>Sign</span>
                          </button>
                          {m.spokenAudioText && (
                            <button
                              onClick={() => handleSpeakAloud(m.spokenAudioText!, m.id)}
                              className="p-1 hover:bg-white dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 transition cursor-pointer"
                              title="Speak Aloud"
                            >
                              {isPlaying ? <VolumeX className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Hearing Voice Visualizer Banner */}
          {isRecordingHearingVoice && (
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 border-t border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between gap-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                  Listening to hearing speaker voice...
                </span>
              </div>
              <AudioWaveformVisualizer isActive={true} mode="recording" />
            </div>
          )}

          {/* Quick Signs */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto scrollbar-none">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
              Quick Signs:
            </span>
            {['NAMASTE', 'THANK YOU', 'YES', 'NO', 'HELP', 'WHERE', 'TIME', 'UNDERSTOOD', 'PLEASE REPEAT', 'WRITE DOWN'].map((qr, idx) => (
              <button
                key={idx}
                onClick={() => handleSendTurn(qr)}
                className="text-xs font-bold bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-sky-700 dark:hover:text-sky-300 px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700 whitespace-nowrap transition shadow-2xs cursor-pointer active:scale-95"
              >
                {qr}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-b-3xl">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendTurn()}
                placeholder={
                  activeSpeaker === 'deaf'
                    ? 'Type sign tokens (e.g., WHERE TRAIN)...'
                    : 'Speak or type response for the deaf participant...'
                }
                className="flex-1 text-xs sm:text-sm p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white dark:focus:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />

              {/* Hearing Mic Toggle */}
              {activeSpeaker === 'hearing' && (
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  className={`p-3 rounded-xl border transition cursor-pointer active:scale-95 ${
                    isRecordingHearingVoice
                      ? 'bg-rose-600 text-white border-rose-600 animate-pulse shadow-md shadow-rose-600/30'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                  }`}
                  title="Voice dictation"
                >
                  <Mic className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={() => handleSendTurn()}
                disabled={isLoading || !inputMessage.trim()}
                className={`p-3 rounded-xl text-white font-bold transition shadow-sm cursor-pointer ${
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
        <div className="lg:col-span-5 space-y-3">
          {activeAvatarTurn && (
            <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200/80 dark:border-sky-900/60 flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping shrink-0" />
                <span className="text-xs font-bold text-sky-900 dark:text-sky-200 truncate">
                  Active Gesture: "{activeAvatarTurn.interpretedMeaning || activeAvatarTurn.text}"
                </span>
              </div>
              <button
                onClick={() => handlePlayOnAvatar(activeAvatarTurn)}
                className="text-[11px] font-bold text-sky-700 dark:text-sky-300 hover:text-sky-900 dark:hover:text-white flex items-center gap-1 cursor-pointer shrink-0"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Replay</span>
              </button>
            </div>
          )}

          <Avatar3D
            signTokens={currentTokens}
            playbackKey={playbackKey}
            height="h-[460px] sm:h-[560px]"
          />
        </div>

      </div>
    </div>
  );
};
