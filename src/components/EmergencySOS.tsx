import React, { useState, useRef, useEffect } from 'react';
import { 
  AlertTriangle, 
  PhoneCall, 
  Volume2, 
  VolumeX, 
  CheckCircle,
  MapPin
} from 'lucide-react';
import { Avatar3D } from './Avatar3D';
import { EmergencyLog } from '../types';

interface EmergencySOSProps {
  onLogEmergency?: (log: EmergencyLog) => void;
}

const EMERGENCY_PRESETS = [
  {
    id: 'medical',
    title: 'Medical Emergency',
    category: 'medical' as const,
    dial: '108',
    message: 'I am deaf and having a medical emergency. Please call an ambulance to my location immediately.',
    islGloss: 'EMERGENCY DOCTOR AMBULANCE CALL FAST NEED HELP',
    signs: [
      { gloss: 'EMERGENCY', meaning: 'Emergency', durationSec: 1.0 },
      { gloss: 'DOCTOR', meaning: 'Doctor', durationSec: 0.9 },
      { gloss: 'AMBULANCE', meaning: 'Ambulance', durationSec: 1.1 },
      { gloss: 'CALL-FAST', meaning: 'Call quickly', durationSec: 0.9 },
      { gloss: 'HELP', meaning: 'Help me', durationSec: 1.2 },
    ],
  },
  {
    id: 'police',
    title: 'Police & Safety',
    category: 'police' as const,
    dial: '112',
    message: 'I am deaf and in danger. Please contact police emergency dispatch immediately.',
    islGloss: 'DANGER POLICE IMMEDIATE COME HELP ME',
    signs: [
      { gloss: 'DANGER', meaning: 'Danger', durationSec: 1.0 },
      { gloss: 'POLICE', meaning: 'Police', durationSec: 1.0 },
      { gloss: 'IMMEDIATE', meaning: 'Immediate', durationSec: 0.8 },
      { gloss: 'HELP', meaning: 'Help me', durationSec: 1.2 },
    ],
  },
  {
    id: 'fire',
    title: 'Fire Hazard',
    category: 'fire' as const,
    dial: '101',
    message: 'Fire or smoke hazard detected! Please alert the fire brigade and evacuate immediately.',
    islGloss: 'FIRE SMOKE DANGER FAST EVACUATE HELP',
    signs: [
      { gloss: 'FIRE', meaning: 'Fire', durationSec: 1.0 },
      { gloss: 'SMOKE', meaning: 'Smoke', durationSec: 0.9 },
      { gloss: 'EVACUATE', meaning: 'Evacuate now', durationSec: 1.1 },
    ],
  },
  {
    id: 'transit',
    title: 'Stranded / Assistance',
    category: 'general' as const,
    dial: '112',
    message: 'I am deaf and lost or stranded. Please guide me to the nearest railway or transit assistance desk.',
    islGloss: 'I DEAF STRANDED HELP ASSISTANCE-DESK WHERE',
    signs: [
      { gloss: 'I-DEAF', meaning: 'I am deaf', durationSec: 1.0 },
      { gloss: 'STRANDED', meaning: 'Lost/stranded', durationSec: 1.0 },
      { gloss: 'HELP', meaning: 'Help', durationSec: 1.0 },
    ],
  },
];

export const EmergencySOS: React.FC<EmergencySOSProps> = ({ onLogEmergency }) => {
  const [selectedPreset, setSelectedPreset] = useState(EMERGENCY_PRESETS[0]);
  const [isAlertActive, setIsAlertActive] = useState<boolean>(false);
  const [isSirenOn, setIsSirenOn] = useState<boolean>(false);
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);

  const lfoRef = useRef<OscillatorNode | null>(null);

  const stopSiren = () => {
    if (lfoRef.current) {
      try {
        lfoRef.current.stop();
        lfoRef.current.disconnect();
      } catch (e) {}
      lfoRef.current = null;
    }
    if (oscRef.current) {
      try {
        oscRef.current.stop();
        oscRef.current.disconnect();
      } catch (e) {}
      oscRef.current = null;
    }
    setIsSirenOn(false);
  };

  const startSiren = async () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }

      if (audioCtxRef.current.state === 'suspended') {
        await audioCtxRef.current.resume();
      }

      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, ctx.currentTime);

      // Pitch sweep
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 2.5;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 350;
      lfo.connect(osc.frequency);
      lfo.start();
      lfoRef.current = lfo;

      gain.gain.value = 0.25;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      oscRef.current = osc;
      setIsSirenOn(true);
    } catch (e) {
      console.warn('Audio siren error:', e);
    }
  };

  const toggleSiren = () => {
    if (isSirenOn) {
      stopSiren();
    } else {
      startSiren();
    }
  };

  const handleTriggerEmergency = async () => {
    setIsAlertActive(true);

    const log: EmergencyLog = {
      id: `em_${Date.now()}`,
      category: selectedPreset.category,
      title: selectedPreset.title,
      message: selectedPreset.message,
      islGloss: selectedPreset.islGloss,
      source: 'sos_one_tap',
      confirmed: true,
      timestamp: new Date().toISOString(),
    };

    try {
      await fetch('/api/user/history/emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log),
      });
    } catch (e) {}

    if (onLogEmergency) {
      onLogEmergency(log);
    }
  };

  useEffect(() => {
    return () => {
      stopSiren();
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Visual Emergency Flash Alert */}
      {isAlertActive && (
        <div className="bg-rose-600 text-white p-5 rounded-3xl shadow-2xl animate-pulse flex items-center justify-between gap-4 border-2 border-white/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-2xl">
              <AlertTriangle className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black uppercase tracking-wider">
                ACTIVE SOS DISPATCH
              </h3>
              <p className="text-xs text-rose-100">
                Displaying high-contrast emergency card for first responders.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleSiren}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-rose-700 font-bold text-xs shadow-xs"
            >
              {isSirenOn ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              <span>{isSirenOn ? 'Mute' : 'Audio Siren'}</span>
            </button>
            <button
              onClick={() => {
                setIsAlertActive(false);
                stopSiren();
              }}
              className="px-3.5 py-2 rounded-xl bg-rose-950 text-white font-bold text-xs"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Emergency Card / Options on Left (7 cols), 3D Avatar on Right (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Emergency Options */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wide">
              Select Emergency Category
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {EMERGENCY_PRESETS.map((p) => {
                const isSelected = selectedPreset.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPreset(p)}
                    className={`p-4 rounded-2xl text-left border-2 transition-all flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'border-rose-600 bg-rose-50/70 dark:bg-rose-950/40 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-800/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-black text-slate-900 dark:text-white">
                          {p.title}
                        </span>
                        <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300">
                          {p.dial}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-1">
                        {p.message}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Big Trigger Button */}
            <div className="pt-2">
              <button
                onClick={handleTriggerEmergency}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-rose-600/25 active:scale-[0.98] transition cursor-pointer"
              >
                <AlertTriangle className="w-5 h-5" />
                <span>Trigger Instant SOS</span>
              </button>
            </div>
          </div>

          {/* First Responder Flashcard */}
          <div className="bg-slate-950 text-white rounded-3xl p-6 border-2 border-amber-400 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                Show To Passersby / First Responders
              </span>
              <span className="text-xs font-bold text-slate-400">
                Hotline: {selectedPreset.dial}
              </span>
            </div>

            <div className="py-2 space-y-2">
              <p className="text-lg sm:text-xl font-black tracking-tight text-white leading-snug">
                "I AM DEAF AND COMMUNICATE IN SIGN LANGUAGE. PLEASE ASSIST ME BY CALLING {selectedPreset.dial}."
              </p>
              <p className="text-xs text-amber-300 font-medium">
                Reason: {selectedPreset.message}
              </p>
            </div>
          </div>

        </div>

        {/* Right Column: 3D Urgency Avatar */}
        <div className="lg:col-span-5 space-y-4">
          <Avatar3D
            signTokens={selectedPreset.signs}
            currentGloss={selectedPreset.islGloss}
            facialExpression="urgent"
            height="h-[460px] sm:h-[540px]"
          />
        </div>

      </div>
    </div>
  );
};
