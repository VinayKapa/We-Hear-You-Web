import React, { useState, useRef } from 'react';
import { 
  Send, 
  Mic, 
  MicOff, 
  Image as ImageIcon, 
  FileText, 
  Volume2, 
  Copy, 
  Check, 
  Sparkles, 
  RotateCcw,
  BookOpen,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { TranslationResult, SignToken } from '../types';
import { Avatar3D } from './Avatar3D';

interface UniversalTranslatorProps {
  onSaveToHistory?: (result: TranslationResult) => void;
}

const PRESET_SAMPLES = [
  {
    title: '🚆 Railway Platform Notice',
    text: 'Attention passengers, Train number 12723 Telangana Express will arrive on Platform 3 shortly with a 15-minute delay.',
    type: 'Transport',
  },
  {
    title: '💊 Doctor Prescription Advisory',
    text: 'Take Paracetamol 500mg tablet twice daily after meals with warm water. Rest well.',
    type: 'Medical',
  },
  {
    title: '🏛️ Bank Aadhaar KYC Update',
    text: 'Please visit your nearest bank branch with Aadhaar card to complete your mandatory KYC verification before Friday.',
    type: 'Banking',
  },
  {
    title: '🚨 Weather & Flood Alert',
    text: 'Heavy rainfall alert in coastal areas. Stay indoors and reach out to local emergency helplines if needed.',
    type: 'Emergency',
  },
];

export const UniversalTranslator: React.FC<UniversalTranslatorProps> = ({ onSaveToHistory }) => {
  const [inputText, setInputText] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [simplificationLevel, setSimplificationLevel] = useState<string>('standard');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [translationResult, setTranslationResult] = useState<TranslationResult | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
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

  // Handle Text/Media Translation Request
  const handleTranslate = async (customText?: string) => {
    const textToSend = customText !== undefined ? customText : inputText;
    if (!textToSend && !mediaPayload.imageBase64 && !mediaPayload.pdfBase64 && !mediaPayload.audioBase64) {
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
          inputType: mediaPayload.inputType,
          imageBase64: mediaPayload.imageBase64,
          pdfBase64: mediaPayload.pdfBase64,
          audioBase64: mediaPayload.audioBase64,
          mediaMimeType: mediaPayload.mediaMimeType,
          fileName: selectedFileName,
        }),
      });

      if (!response.ok) {
        throw new Error(`Translation failed with status: ${response.status}`);
      }

      const data: TranslationResult = await response.json();
      setTranslationResult(data);

      if (onSaveToHistory) {
        onSaveToHistory(data);
      }
    } catch (err) {
      console.error('Translation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Speech Recognition Handling
  const toggleSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported by this browser. You can type or upload audio files instead.');
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = selectedLanguage === 'hi' ? 'hi-IN' : 'en-US';

      recognition.onstart = () => setIsRecording(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsRecording(false);
        handleTranslate(transcript);
      };
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);

      recognitionRef.current = recognition;
      recognition.start();
    }
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
    } else if (file.type.startsWith('audio/')) {
      reader.onload = () => {
        setMediaPayload({
          audioBase64: reader.result as string,
          mediaMimeType: file.type,
          inputType: 'audio',
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

  const handleSpeakAudio = () => {
    if (!translationResult) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(translationResult.simplifiedMeaning || translationResult.summary);
      utterance.lang = translationResult.language === 'hi' ? 'hi-IN' : 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const clearInputs = () => {
    setInputText('');
    setSelectedFileName(null);
    setMediaPayload({ inputType: 'text' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Banner with Presets */}
      <div className="bg-gradient-to-r from-sky-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-sky-800/40 relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-200 border border-sky-400/30 mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Multimodal ISL Translation Engine
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
            Convert Speech, Text, and Documents into Indian Sign Language
          </h1>
          <p className="text-sm sm:text-base text-sky-200/90 leading-relaxed mb-6">
            Powered by Gemini AI and 3D Avatar Kinematics. Transforming complex notices, medical advisories, and transit circulars into structured visual sign language with Subject-Object-Verb (SOV) spatial grammar.
          </p>

          {/* Quick Presets */}
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-sky-300 block mb-2">
              Try Quick Presets:
            </span>
            <div className="flex flex-wrap gap-2">
              {PRESET_SAMPLES.map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInputText(sample.text);
                    setMediaPayload({ inputType: 'text' });
                    setSelectedFileName(null);
                    handleTranslate(sample.text);
                  }}
                  className="text-xs font-medium bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl border border-white/15 transition-all text-left"
                >
                  {sample.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Input Column & 3D Avatar Preview Column */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Multimodal Input Panel (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700">Language:</label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="text-xs font-semibold bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="en">English (India)</option>
                <option value="hi">Hindi (हिंदी)</option>
                <option value="te">Telugu (తెలుగు)</option>
                <option value="ta">Tamil (தமிழ்)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700">Level:</label>
              <select
                value={simplificationLevel}
                onChange={(e) => setSimplificationLevel(e.target.value)}
                className="text-xs font-semibold bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="standard">Standard ISL</option>
                <option value="elementary">Beginner / Plain Language</option>
                <option value="detailed">Comprehensive Gloss</option>
              </select>
            </div>
          </div>

          {/* Text Input Area */}
          <div className="relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type public announcement, passenger notice, medical instruction, or paste official letter here..."
              rows={5}
              className="w-full text-sm p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-900 placeholder:text-slate-400 transition"
            />

            {/* Media Upload Indicator Tag */}
            {selectedFileName && (
              <div className="mt-2 flex items-center justify-between px-3 py-1.5 bg-sky-50 text-sky-800 rounded-xl text-xs font-medium border border-sky-200">
                <span className="truncate">Attached: {selectedFileName}</span>
                <button
                  onClick={clearInputs}
                  className="text-sky-600 hover:text-sky-900 font-bold ml-2"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <div className="flex items-center gap-1.5">
              {/* Mic Speech Button */}
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition ${
                  isRecording
                    ? 'bg-rose-600 text-white border-rose-600 animate-pulse'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
                title="Voice Input (Speech-to-Text)"
              >
                {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                <span>{isRecording ? 'Listening...' : 'Voice'}</span>
              </button>

              {/* Upload Image / PDF / Audio Button */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf,audio/*"
                onChange={handleFileUpload}
                className="hidden"
                id="media-file-input"
              />
              <label
                htmlFor="media-file-input"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer transition"
                title="Upload Photo, Signboard, Prescription, or PDF Document"
              >
                <ImageIcon className="w-3.5 h-3.5 text-sky-600" />
                <span>Upload File</span>
              </label>

              {inputText && (
                <button
                  type="button"
                  onClick={clearInputs}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                  title="Clear text"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Translate Button */}
            <button
              onClick={() => handleTranslate()}
              disabled={isLoading || (!inputText.trim() && !selectedFileName)}
              className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-extrabold transition shadow-md shadow-sky-600/20 active:scale-95"
            >
              {isLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Translating to ISL...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Translate to ISL</span>
                </>
              )}
            </button>
          </div>

          {/* Grammar & Structural Insights Card */}
          {translationResult && (
            <div className="mt-6 space-y-4 pt-4 border-t border-slate-100">
              
              {/* Importance Banner */}
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    translationResult.importance === 'critical'
                      ? 'bg-rose-500 animate-ping'
                      : translationResult.importance === 'high'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`} />
                  <span className="text-xs font-bold text-slate-800 uppercase">
                    Urgency: {translationResult.importance}
                  </span>
                </div>
                {translationResult.confidenceScore && (
                  <span className="text-[11px] font-semibold text-slate-500">
                    Confidence: {Math.round(translationResult.confidenceScore * 100)}%
                  </span>
                )}
              </div>

              {/* ISL Grammar & SOV Structure */}
              <div className="bg-sky-50/70 p-4 rounded-2xl border border-sky-100 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sky-900 uppercase tracking-wider text-[11px]">
                    ISL Grammar Structure
                  </span>
                  <span className="font-mono text-sky-700 bg-sky-200/60 px-2 py-0.5 rounded text-[10px]">
                    SOV Order (Subject-Object-Verb)
                  </span>
                </div>
                <p className="text-sky-950 font-medium leading-relaxed">
                  {translationResult.grammarStructure}
                </p>
              </div>

              {/* Plain Language Meaning */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Simplified Meaning for Deaf Readers
                  </span>
                  <button
                    onClick={handleSpeakAudio}
                    className="flex items-center gap-1 text-xs text-sky-600 hover:text-sky-800 font-bold"
                  >
                    <Volume2 className="w-3.5 h-3.5" /> Listen
                  </button>
                </div>
                <p className="text-sm font-semibold text-slate-800 leading-relaxed">
                  {translationResult.simplifiedMeaning}
                </p>
              </div>

              {/* Sign Token Chips */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                  ISL Gesture Sequence ({translationResult.signTokens.length} signs)
                </span>
                <div className="flex flex-wrap gap-2">
                  {translationResult.signTokens.map((token, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-100 hover:bg-slate-200 border border-slate-300/80 px-2.5 py-1.5 rounded-xl text-xs transition"
                    >
                      <span className="font-black text-slate-900 block">
                        {token.gloss}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {token.meaning}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Right Column: 3D Sign Language Avatar & Subtitles (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Avatar3D
            signTokens={translationResult?.signTokens || []}
            facialExpression={translationResult?.facialExpression || 'neutral'}
            currentGloss={translationResult?.islGloss}
            height="h-96 sm:h-[480px]"
          />

          {/* ISL Gloss Quick Copy Card */}
          {translationResult && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
                  Master ISL Gloss
                </span>
                <button
                  onClick={handleCopyGloss}
                  className="flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-800"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="font-mono text-xs font-bold text-slate-900 bg-slate-100 p-2.5 rounded-xl break-words">
                {translationResult.islGloss}
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
