import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Mic, 
  MicOff, 
  Image as ImageIcon, 
  FileText, 
  Volume2, 
  VolumeX,
  Copy, 
  Check, 
  Sparkles, 
  RotateCcw,
  Square,
  Radio,
  Paperclip,
  CheckCircle2,
  Train,
  HeartPulse,
  Building2,
  ShieldAlert
} from 'lucide-react';
import { TranslationResult, SignToken } from '../types';
import { Avatar3D } from './Avatar3D';
import { AudioWaveformVisualizer } from './AudioWaveformVisualizer';

interface UniversalTranslatorProps {
  onSaveToHistory?: (result: TranslationResult) => void;
}

const PRESET_SAMPLES = [
  {
    title: 'Railway Platform Notice',
    text: 'Train 12723 Telangana Express will arrive on Platform 3 shortly with a 15-minute delay.',
    icon: Train,
  },
  {
    title: 'Medical Prescription',
    text: 'Take Paracetamol 500mg tablet twice daily after food with warm water.',
    icon: HeartPulse,
  },
  {
    title: 'Bank KYC Reminder',
    text: 'Please visit your nearest bank branch with Aadhaar card to complete mandatory KYC.',
    icon: Building2,
  },
  {
    title: 'Emergency Safety Alert',
    text: 'Heavy rainfall warning in this zone. Please stay indoors and call helpline 112 if needed.',
    icon: ShieldAlert,
  },
];

export const UniversalTranslator: React.FC<UniversalTranslatorProps> = ({ onSaveToHistory }) => {
  const [inputText, setInputText] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [simplificationLevel, setSimplificationLevel] = useState<string>('standard');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [translationResult, setTranslationResult] = useState<TranslationResult | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [selectedTokenForPlayback, setSelectedTokenForPlayback] = useState<SignToken | null>(null);
  const [playbackKey, setPlaybackKey] = useState<number>(Date.now());
  
  // Audio Input States
  const [isSpeechRecognitionActive, setIsSpeechRecognitionActive] = useState<boolean>(false);
  const [isMediaRecording, setIsMediaRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  
  // Audio Output States
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [audioNotice, setAudioNotice] = useState<string | null>(null);

  const showAudioNotice = (msg: string) => {
    setAudioNotice(msg);
    setTimeout(() => setAudioNotice(null), 4000);
  };

  // File Upload State
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [mediaPayload, setMediaPayload] = useState<{
    imageBase64?: string;
    pdfBase64?: string;
    audioBase64?: string;
    mediaMimeType?: string;
    inputType: 'text' | 'image' | 'pdf' | 'audio';
  }>({ inputType: 'text' });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);

  // Recording timer increment
  useEffect(() => {
    if (isMediaRecording) {
      setRecordingSeconds(0);
      recordTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    }
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, [isMediaRecording]);

  // Clean up audio playback on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Main Translation Function
  const handleTranslate = async (customText?: string, customAudio?: { base64: string; mime: string }) => {
    const textToSend = customText !== undefined ? customText : inputText;
    const audioPayload = customAudio || (mediaPayload.audioBase64 ? { base64: mediaPayload.audioBase64, mime: mediaPayload.mediaMimeType || 'audio/webm' } : undefined);

    if (!textToSend && !mediaPayload.imageBase64 && !mediaPayload.pdfBase64 && !audioPayload) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/gemini/translate-isl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToSend,
          language: selectedLanguage,
          simplificationLevel,
          inputType: audioPayload ? 'audio' : mediaPayload.inputType,
          imageBase64: mediaPayload.imageBase64,
          pdfBase64: mediaPayload.pdfBase64,
          audioBase64: audioPayload?.base64,
          mediaMimeType: audioPayload?.mime || mediaPayload.mediaMimeType,
          fileName: selectedFileName,
        }),
      });

      if (!response.ok) {
        throw new Error(`Translation failed with status: ${response.status}`);
      }

      const data: TranslationResult = await response.json();
      setTranslationResult(data);
      setSelectedTokenForPlayback(null);
      setPlaybackKey(Date.now());

      if (data.audioTranscript && !inputText) {
        setInputText(data.audioTranscript);
      }

      if (onSaveToHistory) {
        onSaveToHistory(data);
      }
    } catch (err) {
      console.error('Translation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Method 1: Web Speech API (Live Dictation)
  const toggleSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      // If Web Speech is unavailable, trigger high-fidelity direct microphone recording
      toggleMediaRecorder();
      return;
    }

    if (isSpeechRecognitionActive) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsSpeechRecognitionActive(false);
    } else {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = selectedLanguage === 'hi' ? 'hi-IN' : 'en-US';

        recognition.onstart = () => setIsSpeechRecognitionActive(true);
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputText(transcript);
          setIsSpeechRecognitionActive(false);
          handleTranslate(transcript);
        };
        recognition.onerror = (e: any) => {
          console.warn('Speech recognition fallback to media recorder:', e);
          setIsSpeechRecognitionActive(false);
          // Fall back to direct microphone recording
          toggleMediaRecorder();
        };
        recognition.onend = () => setIsSpeechRecognitionActive(false);

        recognitionRef.current = recognition;
        recognition.start();
      } catch (e) {
        toggleMediaRecorder();
      }
    }
  };

  // Method 2: Direct High-Fidelity Microphone Recording (MediaRecorder)
  const toggleMediaRecorder = async () => {
    if (isMediaRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsMediaRecording(false);
    } else {
      // Start recording
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          showAudioNotice('Microphone access is not supported on this browser.');
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunksRef.current = [];

        // Determine supported audio mime type
        let mimeType = 'audio/webm';
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        }

        const mediaRecorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType.split(';')[0] });
          stream.getTracks().forEach((track) => track.stop());

          // Convert to Base64 data URL
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Audio = reader.result as string;
            setMediaPayload({
              inputType: 'audio',
              audioBase64: base64Audio,
              mediaMimeType: mimeType.split(';')[0],
            });
            setSelectedFileName('Recorded Audio Clip');
            handleTranslate(undefined, { base64: base64Audio, mime: mimeType.split(';')[0] });
          };
          reader.readAsDataURL(audioBlob);
        };

        mediaRecorder.start(250);
        setIsMediaRecording(true);
      } catch (err: any) {
        console.warn('Microphone permission error:', err);
        showAudioNotice('Microphone permission was denied or restricted. Please enable microphone permissions in your browser.');
      }
    }
  };

  // Audio Playback: Read Simplified Meaning Aloud
  const handleToggleSpeak = () => {
    if (!('speechSynthesis' in window)) {
      showAudioNotice('Text-to-speech is not supported on this browser.');
      return;
    }

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    const textToSpeak = translationResult?.simplifiedMeaning || translationResult?.summary || inputText;
    if (!textToSpeak) return;

    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = selectedLanguage === 'hi' ? 'hi-IN' : 'en-US';
    utterance.rate = 0.95;

    utterance.onstart = () => setIsPlayingAudio(true);
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    window.speechSynthesis.speak(utterance);
  };

  // File Upload Handling (Image / PDF)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    const reader = new FileReader();

    if (file.type.startsWith('image/')) {
      reader.onload = () => {
        setMediaPayload({
          imageBase64: reader.result as string,
          mediaMimeType: file.type,
          inputType: 'image',
        });
      };
      reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
      reader.onload = () => {
        setMediaPayload({
          pdfBase64: reader.result as string,
          mediaMimeType: file.type,
          inputType: 'pdf',
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCopyGloss = () => {
    if (!translationResult?.islGloss) return;
    navigator.clipboard.writeText(translationResult.islGloss);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearInputs = () => {
    setInputText('');
    setSelectedFileName(null);
    setMediaPayload({ inputType: 'text' });
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (isPlayingAudio) window.speechSynthesis.cancel();
    setIsPlayingAudio(false);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {audioNotice && (
        <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-2xl flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200 shadow-xs animate-in fade-in duration-200">
          <Volume2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="font-medium">{audioNotice}</span>
        </div>
      )}
      
      {/* Clean Presets Row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0 mr-1">
          Quick Samples:
        </span>
        {PRESET_SAMPLES.map((sample, idx) => {
          const IconComp = sample.icon;
          return (
            <button
              key={idx}
              onClick={() => {
                setInputText(sample.text);
                setSelectedFileName(null);
                setMediaPayload({ inputType: 'text' });
                handleTranslate(sample.text);
              }}
              className="flex items-center gap-1.5 text-xs font-semibold bg-white dark:bg-slate-900 hover:bg-sky-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-sky-700 dark:hover:text-sky-300 px-3.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 whitespace-nowrap transition shadow-2xs cursor-pointer active:scale-95"
            >
              <IconComp className="w-3.5 h-3.5 text-sky-500" />
              <span>{sample.title}</span>
            </button>
          );
        })}
      </div>

      {/* Main Grid: Input and Results on Left (7 cols), 3D Avatar on Right (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Multimodal Input Panel */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
          
          {/* Controls Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Language:</label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                <option value="en">English</option>
                <option value="hi">Hindi (हिंदी)</option>
                <option value="te">Telugu (తెలుగు)</option>
                <option value="ta">Tamil (தமிழ்)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Style:</label>
              <select
                value={simplificationLevel}
                onChange={(e) => setSimplificationLevel(e.target.value)}
                className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                <option value="standard">Standard ISL</option>
                <option value="elementary">Plain Language</option>
                <option value="detailed">Comprehensive</option>
              </select>
            </div>
          </div>

          {/* Text Input Area */}
          <div className="relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type announcement, conversation, medical advice, or speak using the microphone..."
              rows={4}
              className="w-full text-sm p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white dark:focus:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition"
            />

            {/* Attached File or Recorded Audio Pill */}
            {selectedFileName && (
              <div className="mt-2 flex items-center justify-between px-3 py-1.5 bg-sky-50 dark:bg-sky-950/50 text-sky-800 dark:text-sky-300 rounded-xl text-xs font-medium border border-sky-200 dark:border-sky-800">
                <span className="truncate flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5" />
                  {selectedFileName}
                </span>
                <button
                  onClick={clearInputs}
                  className="text-sky-600 dark:text-sky-400 hover:text-sky-900 dark:hover:text-sky-200 font-bold ml-2 cursor-pointer"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Interactive Live Waveform Visualizer Banner */}
          {(isMediaRecording || isSpeechRecognitionActive || isPlayingAudio) && (
            <div className="p-3 bg-slate-50 dark:bg-slate-950/80 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isMediaRecording ? 'bg-rose-500 animate-ping' : isPlayingAudio ? 'bg-sky-400 animate-pulse' : 'bg-emerald-400 animate-ping'}`} />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isMediaRecording ? `Recording Audio (${recordingSeconds}s)` : isSpeechRecognitionActive ? 'Listening to Live Voice...' : 'Playing Speech Synthesizer'}
                </span>
              </div>
              <AudioWaveformVisualizer
                isActive={true}
                mode={isMediaRecording ? 'recording' : isPlayingAudio ? 'playback' : 'recording'}
              />
            </div>
          )}

          {/* Action Row: Audio Recording & Translate Button */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            
            {/* Audio & File Tools */}
            <div className="flex items-center gap-2">
              
              {/* Direct Microphone Audio Recording */}
              <button
                type="button"
                onClick={toggleMediaRecorder}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer active:scale-95 ${
                  isMediaRecording
                    ? 'bg-rose-600 text-white border-rose-600 animate-pulse shadow-md shadow-rose-600/30'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                }`}
                title="Record your voice"
              >
                {isMediaRecording ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-white" />
                    <span>Stop ({recordingSeconds}s)</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    <span>Record Audio</span>
                  </>
                )}
              </button>

              {/* Quick Speech-to-Text Button */}
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer active:scale-95 ${
                  isSpeechRecognitionActive
                    ? 'bg-emerald-600 text-white border-emerald-600 animate-pulse'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                }`}
                title="Live Speech Dictation"
              >
                <Radio className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{isSpeechRecognitionActive ? 'Listening...' : 'Live Voice'}</span>
              </button>

              {/* File Attachment */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileUpload}
                className="hidden"
                id="translator-file-input"
              />
              <label
                htmlFor="translator-file-input"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 cursor-pointer transition active:scale-95"
                title="Attach Signboard Image or PDF"
              >
                <ImageIcon className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>File</span>
              </label>

              {inputText && (
                <button
                  type="button"
                  onClick={clearInputs}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  title="Clear"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Translate Button */}
            <button
              onClick={() => handleTranslate()}
              disabled={isLoading || (!inputText.trim() && !selectedFileName && !mediaPayload.audioBase64)}
              className="flex items-center gap-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 disabled:opacity-40 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm shadow-sky-500/25 active:scale-95 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Translating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Translate to ISL</span>
                </>
              )}
            </button>
          </div>

          {/* Translation Results */}
          {translationResult && (
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4 animate-in fade-in duration-200">
              
              {/* Simplified Meaning with Audio Readout */}
              <div className="bg-sky-50/80 dark:bg-sky-950/40 p-4 rounded-2xl border border-sky-100 dark:border-sky-900/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-sky-900 dark:text-sky-300">
                    Simplified Meaning for Deaf Readers
                  </span>
                  
                  {/* Speak Button with Visual Audio Waves */}
                  <button
                    onClick={handleToggleSpeak}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95 ${
                      isPlayingAudio
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {isPlayingAudio ? (
                      <>
                        <VolumeX className="w-3.5 h-3.5" />
                        <span>Stop Voice</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Listen Aloud</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
                  {translationResult.simplifiedMeaning}
                </p>
              </div>

              {/* ISL Grammar & SOV Structure */}
              <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wide text-[10px]">
                    ISL Grammar (Time-first, SOV Structure)
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    Urgency: {translationResult.importance}
                  </span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 font-medium">
                  {translationResult.grammarStructure}
                </p>
              </div>

              {/* Sign Token Chips */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    ISL Gesture Sequence ({translationResult.signTokens.length} signs) • Click chip to test
                  </span>
                  {selectedTokenForPlayback && (
                    <button
                      onClick={() => {
                        setSelectedTokenForPlayback(null);
                        setPlaybackKey(Date.now());
                      }}
                      className="text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                    >
                      Play All
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {translationResult.signTokens.map((token, idx) => {
                    const isSelected = selectedTokenForPlayback?.gloss === token.gloss;
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedTokenForPlayback(token);
                          setPlaybackKey(Date.now());
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs shadow-2xs flex flex-col cursor-pointer transition active:scale-95 text-left border ${
                          isSelected
                            ? 'bg-sky-100 dark:bg-sky-950/80 border-sky-500 ring-2 ring-sky-500/30'
                            : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 hover:border-sky-400 dark:hover:border-sky-400'
                        }`}
                        title="Click to sign on 3D Avatar"
                      >
                        <span className="font-black text-slate-900 dark:text-white flex items-center gap-1">
                          <span>{token.gloss}</span>
                          {isSelected && <Sparkles className="w-3 h-3 text-sky-500 shrink-0" />}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          {token.meaning}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Right Column: 3D Avatar */}
        <div className="lg:col-span-5 space-y-4">
          <Avatar3D
            signTokens={selectedTokenForPlayback ? [selectedTokenForPlayback] : (translationResult?.signTokens || [])}
            playbackKey={playbackKey}
            facialExpression={translationResult?.facialExpression || 'neutral'}
            currentGloss={selectedTokenForPlayback?.gloss || translationResult?.islGloss}
            height="h-96 sm:h-[480px]"
          />

          {/* Master Gloss Readout */}
          {translationResult && (
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                  Master ISL Gloss
                </span>
                <button
                  onClick={handleCopyGloss}
                  className="flex items-center gap-1 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="font-mono text-xs font-black text-sky-900 dark:text-sky-300 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl break-words border border-slate-200/60 dark:border-slate-800">
                {translationResult.islGloss}
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
