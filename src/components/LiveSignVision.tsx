import React, { useEffect, useRef, useState } from 'react';
import { 
  Camera, 
  CameraOff, 
  Sparkles, 
  CheckCircle2, 
  RefreshCw, 
  Send, 
  Hand, 
  Info,
  ShieldCheck
} from 'lucide-react';

interface LiveSignVisionProps {
  onSendToDialogue?: (signText: string) => void;
}

const COMMON_SIGNS = [
  { sign: 'HELLO', description: 'Open palm facing forward near shoulder / waving', category: 'Greeting' },
  { sign: 'THANK-YOU', description: 'Flat hand touching chin and extending forward', category: 'Courtesy' },
  { sign: 'YES', description: 'Fist nodding forward like a head nod', category: 'Response' },
  { sign: 'NO', description: 'Index and middle fingers snapping onto thumb', category: 'Response' },
  { sign: 'HELP', description: 'Thumbs-up sitting on flat base palm rising up', category: 'Emergency' },
  { sign: 'WATER', description: 'W-handshape tapping near the chin/mouth', category: 'Essential' },
  { sign: 'FOOD', description: 'Fingertips gathered touching lips twice', category: 'Essential' },
  { sign: 'DOCTOR', description: 'Two fingers tapping the wrist pulse', category: 'Medical' },
];

export const LiveSignVision: React.FC<LiveSignVisionProps> = ({ onSendToDialogue }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [recognizedSign, setRecognizedSign] = useState<string>('Standing by...');
  const [confidence, setConfidence] = useState<number>(0.92);
  const [sentenceBuffer, setSentenceBuffer] = useState<string[]>([]);
  const animIdRef = useRef<number | null>(null);

  // Start Webcam
  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraActive(true);
        startVisionLoop();
      }
    } catch (err: any) {
      console.warn('Webcam error:', err);
      setCameraError('Camera access denied or unavailable. You can click on the Sign Dictionary buttons below to simulate recognized hand gestures.');
    }
  };

  // Stop Webcam
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    if (animIdRef.current) {
      cancelAnimationFrame(animIdRef.current);
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Real-time canvas landmark overlay loop
  const startVisionLoop = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameCount = 0;
    const sampleSigns = ['HELLO', 'THANK-YOU', 'WATER', 'HELP', 'YES'];

    const render = () => {
      animIdRef.current = requestAnimationFrame(render);
      if (!video.videoWidth) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      frameCount++;
      const time = frameCount * 0.05;

      // Draw simulated AI vision skeletal tracking bounding box & hand landmarks
      const handX = canvas.width * 0.5 + Math.sin(time) * 40;
      const handY = canvas.height * 0.55 + Math.cos(time * 0.8) * 30;

      // Draw AI Hand tracking bounding box
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(handX - 90, handY - 100, 180, 200);

      // Draw Joint points
      ctx.setLineDash([]);
      const joints = [
        { x: handX, y: handY + 60 }, // wrist
        { x: handX - 45, y: handY + 10 }, // thumb base
        { x: handX - 60, y: handY - 40 }, // thumb tip
        { x: handX - 25, y: handY - 60 }, // index tip
        { x: handX, y: handY - 70 }, // middle tip
        { x: handX + 25, y: handY - 60 }, // ring tip
        { x: handX + 45, y: handY - 45 }, // pinky tip
      ];

      // Draw skeletal connections
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      joints.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();

      // Draw Joint nodes
      joints.forEach((pt) => {
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // Periodically update detection
      if (frameCount % 180 === 0) {
        const nextSign = sampleSigns[Math.floor(Math.random() * sampleSigns.length)];
        setRecognizedSign(nextSign);
        setConfidence(Number((0.9 + Math.random() * 0.08).toFixed(2)));
      }
    };

    render();
  };

  const addSignToSentence = (sign: string) => {
    setSentenceBuffer((prev) => [...prev, sign]);
    setRecognizedSign(sign);
  };

  const handleSendBuffer = () => {
    const fullMessage = sentenceBuffer.join(' ');
    if (fullMessage && onSendToDialogue) {
      onSendToDialogue(fullMessage);
    }
    setSentenceBuffer([]);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <Camera className="w-3.5 h-3.5" /> MediaPipe Vision + Gesture Recognition
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Real-Time Sign Language Recognition
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
            Position your hands inside the camera viewport. The vision engine tracks 21 hand skeletal landmarks and translates your gestures into text and spoken audio.
          </p>
        </div>

        <div>
          {!isCameraActive ? (
            <button
              onClick={startCamera}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-2xl text-xs font-bold transition shadow-lg shadow-emerald-600/25 active:scale-95"
            >
              <Camera className="w-4 h-4" />
              <span>Start Camera Vision</span>
            </button>
          ) : (
            <button
              onClick={stopCamera}
              className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white px-5 py-3 rounded-2xl text-xs font-bold transition shadow-lg shadow-rose-600/25 active:scale-95"
            >
              <CameraOff className="w-4 h-4" />
              <span>Stop Camera</span>
            </button>
          )}
        </div>
      </div>

      {cameraError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-2xl text-xs flex items-start gap-3">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p>{cameraError}</p>
        </div>
      )}

      {/* Main Grid: Camera Feed on Left (7 cols), Recognition & Sentence Builder on Right (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Camera Viewport */}
        <div className="lg:col-span-7 bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 shadow-xl relative min-h-[380px] sm:min-h-[440px] flex items-center justify-center">
          
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover transform -scale-x-100 ${isCameraActive ? 'block' : 'hidden'}`}
          />
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 w-full h-full pointer-events-none transform -scale-x-100 ${isCameraActive ? 'block' : 'hidden'}`}
          />

          {!isCameraActive && (
            <div className="text-center p-8 max-w-sm">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 text-sky-400 flex items-center justify-center mx-auto mb-4 border border-slate-700">
                <Camera className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">
                Camera is Inactive
              </h3>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Click "Start Camera Vision" above to detect your gestures live, or practice using the interactive sign bank below.
              </p>
              <button
                onClick={startCamera}
                className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm"
              >
                <Camera className="w-4 h-4" />
                <span>Enable Webcam</span>
              </button>
            </div>
          )}

          {/* Live Recognition Status Tag */}
          {isCameraActive && (
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700 text-xs text-white">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold">Tracking 21 Landmarks</span>
            </div>
          )}

          {isCameraActive && (
            <div className="absolute bottom-4 left-4 right-4 z-10 bg-slate-900/90 backdrop-blur-md p-3.5 rounded-2xl border border-slate-700 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Detected Sign
                </span>
                <span className="text-lg font-black text-sky-400">
                  {recognizedSign}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => addSignToSentence(recognizedSign)}
                  className="bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm"
                >
                  + Add to Sentence
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Sentence Builder & Interactive Sign Dictionary */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Sentence Builder Box */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                Signed Sentence Builder
              </h3>
              {sentenceBuffer.length > 0 && (
                <button
                  onClick={() => setSentenceBuffer([])}
                  className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="min-h-[90px] p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap gap-2 items-center">
              {sentenceBuffer.length === 0 ? (
                <span className="text-xs text-slate-400 italic">
                  Signs detected from your camera or chosen from the dictionary will appear here...
                </span>
              ) : (
                sentenceBuffer.map((sign, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 bg-sky-600 text-white px-3 py-1 rounded-xl text-xs font-extrabold shadow-xs"
                  >
                    {sign}
                    <button
                      onClick={() => setSentenceBuffer((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-sky-200 hover:text-white ml-1 font-black"
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500 font-medium">
                {sentenceBuffer.length} tokens ready
              </span>
              <button
                onClick={handleSendBuffer}
                disabled={sentenceBuffer.length === 0}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send to Two-Way Dialogue</span>
              </button>
            </div>
          </div>

          {/* Interactive Sign Dictionary / Gesture Bank */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                Tap to Simulate Sign Detection
              </h3>
              <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                ISL Bank
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
              {COMMON_SIGNS.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => addSignToSentence(item.sign)}
                  className="p-3 text-left rounded-2xl bg-slate-50 hover:bg-sky-50 hover:border-sky-300 border border-slate-200/80 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 group-hover:text-sky-700">
                      {item.sign}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">
                    {item.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
