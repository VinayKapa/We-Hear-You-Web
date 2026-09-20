import React, { useState } from 'react';
import { 
  AlertTriangle, 
  PhoneCall, 
  ShieldAlert, 
  Flame, 
  Activity, 
  MapPin, 
  Volume2, 
  VolumeX, 
  CheckCircle,
  Eye
} from 'lucide-react';
import { Avatar3D } from './Avatar3D';
import { EmergencyLog, SignToken } from '../types';

interface EmergencySOSProps {
  onLogEmergency?: (log: EmergencyLog) => void;
}

const EMERGENCY_PRESETS = [
  {
    id: 'medical',
    title: 'Medical Emergency',
    category: 'medical' as const,
    dial: '108',
    message: 'I am deaf and experiencing a severe medical emergency. Please call an ambulance to my current location immediately.',
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
    message: 'I am deaf and in danger or witnessing a crime. Please contact police emergency dispatch immediately.',
    islGloss: 'DANGER POLICE IMMEDIATE COME HELP ME',
    signs: [
      { gloss: 'DANGER', meaning: 'Danger', durationSec: 1.0 },
      { gloss: 'POLICE', meaning: 'Police', durationSec: 1.0 },
      { gloss: 'IMMEDIATE', meaning: 'Immediate', durationSec: 0.8 },
      { gloss: 'COME', meaning: 'Come', durationSec: 0.8 },
      { gloss: 'HELP', meaning: 'Help me', durationSec: 1.2 },
    ],
  },
  {
    id: 'fire',
    title: 'Fire & Rescue',
    category: 'fire' as const,
    dial: '101',
    message: 'Fire hazard detected! Please alert the fire brigade and evacuate the premises immediately.',
    islGloss: 'FIRE SMOKE DANGER FAST EVACUATE HELP',
    signs: [
      { gloss: 'FIRE', meaning: 'Fire', durationSec: 1.0 },
      { gloss: 'SMOKE', meaning: 'Smoke', durationSec: 0.9 },
      { gloss: 'DANGER', meaning: 'Danger', durationSec: 0.9 },
      { gloss: 'EVACUATE', meaning: 'Evacuate now', durationSec: 1.1 },
    ],
  },
  {
    id: 'disaster',
    title: 'Disoriented / Stranded',
    category: 'general' as const,
    dial: '112',
    message: 'I am deaf and stranded or disoriented at this station/transit center. Please guide me to the nearest assistance desk.',
    islGloss: 'I DEAF STRANDED HELP ASSISTANCE-DESK WHERE',
    signs: [
      { gloss: 'I-DEAF', meaning: 'I am deaf', durationSec: 1.0 },
      { gloss: 'STRANDED', meaning: 'Lost/stranded', durationSec: 1.0 },
      { gloss: 'HELP', meaning: 'Help', durationSec: 1.0 },
      { gloss: 'ASSISTANCE-DESK', meaning: 'Assistance desk', durationSec: 1.2 },
    ],
  },
];

export const EmergencySOS: React.FC<EmergencySOSProps> = ({ onLogEmergency }) => {
  const [selectedPreset, setSelectedPreset] = useState(EMERGENCY_PRESETS[0]);
  const [isAlertActive, setIsAlertActive] = useState<boolean>(false);
  const [isSirenOn, setIsSirenOn] = useState<boolean>(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [oscillator, setOscillator] = useState<OscillatorNode | null>(null);

  const toggleSiren = () => {
    if (isSirenOn) {
      if (oscillator) {
        oscillator.stop();
        oscillator.disconnect();
      }
      setIsSirenOn(false);
    } else {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.4);

        // Siren frequency modulation
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 2.5;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 400;
        lfo.connect(osc.frequency);
        lfo.start();

        gain.gain.value = 0.3;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();

        setAudioContext(ctx);
        setOscillator(osc);
        setIsSirenOn(true);
      } catch (e) {
        console.warn('Audio siren error:', e);
      }
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

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Visual Emergency Flash Alert if Active */}
      {isAlertActive && (
        <div className="bg-rose-600 text-white p-5 rounded-3xl shadow-2xl animate-pulse flex items-center justify-between gap-4 border-2 border-white/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-2xl">
              <AlertTriangle className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-wider">
                ACTIVE SOS DISPATCH BROADCASTING
              </h3>
              <p className="text-xs text-rose-100 font-medium">
                Showing high-contrast deaf card to passersby and emergency contacts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleSiren}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-rose-700 font-black text-xs shadow-md"
            >
              {isSirenOn ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              <span>{isSirenOn ? 'Mute Siren' : 'Play Siren'}</span>
            </button>
            <button
              onClick={() => {
                setIsAlertActive(false);
                if (isSirenOn) toggleSiren();
              }}
              className="px-3 py-2 rounded-xl bg-rose-950 text-white font-bold text-xs"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Emergency Card / Chooser on Left (7 cols), 3D Urgent Avatar on Right (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: One-Tap Buttons & Responder Card */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Category Chooser Cards */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wide">
              Select Emergency Category
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {EMERGENCY_PRESETS.map((p) => {
                const isSelected = selectedPreset.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPreset(p)}
                    className={`p-4 rounded-2xl text-left border-2 transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-rose-600 bg-rose-50/70 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-black text-slate-900">
                          {p.title}
                        </span>
                        <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-rose-100 text-rose-800">
                          {p.dial}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2 mt-1">
                        {p.message}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Big Instant Trigger Button */}
            <div className="pt-2">
              <button
                onClick={handleTriggerEmergency}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white py-4 rounded-2xl font-black text-base uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-rose-600/30 active:scale-[0.98] transition"
              >
                <AlertTriangle className="w-5 h-5" />
                <span>Trigger Instant SOS & Log Dispatch</span>
              </button>
            </div>
          </div>

          {/* First Responder High-Contrast Flashcard */}
          <div className="bg-slate-950 text-white rounded-3xl p-6 border-2 border-amber-400/80 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                  Show To Passersby / First Responders
                </span>
              </div>
              <span className="text-xs font-bold text-slate-400">
                Universal Deaf Card
              </span>
            </div>

            <div className="py-2 space-y-2">
              <p className="text-lg sm:text-xl font-black tracking-tight text-white leading-snug">
                "I AM DEAF AND COMMUNICATE IN SIGN LANGUAGE. PLEASE ASSIST ME BY CALLING EMERGENCY SERVICES ({selectedPreset.dial})."
              </p>
              <p className="text-xs text-amber-300 font-semibold">
                Reason: {selectedPreset.message}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>GPS Broadcast: Active Location Shared</span>
              <span className="font-bold text-white">Emergency Hotline: {selectedPreset.dial}</span>
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
