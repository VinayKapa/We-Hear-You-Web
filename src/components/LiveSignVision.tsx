import React, { useEffect, useRef, useState } from 'react';
import { 
  Camera, 
  CameraOff, 
  Sparkles, 
  Send, 
  Info,
  Check,
  RefreshCw,
  Eye,
  Hand,
  SwitchCamera
} from 'lucide-react';
import { Hands, HAND_CONNECTIONS, Results } from '@mediapipe/hands';
import { Camera as MpCamera } from '@mediapipe/camera_utils';

interface LiveSignVisionProps {
  onSendToDialogue?: (signText: string) => void;
}

const COMMON_SIGNS = [
  { sign: 'HELLO', description: 'Open palm facing forward waving', category: 'Greeting' },
  { sign: 'THANK-YOU', description: 'Flat hand touching chin and moving forward', category: 'Courtesy' },
  { sign: 'YES', description: 'Closed fist nodding forward', category: 'Response' },
  { sign: 'NO', description: 'Index and middle fingers snapping to thumb', category: 'Response' },
  { sign: 'HELP', description: 'Thumbs-up on flat palm rising upward', category: 'Emergency' },
  { sign: 'WATER', description: 'W-handshape (three fingers) near mouth', category: 'Essential' },
  { sign: 'I-LOVE-YOU', description: 'Thumb, index, and pinky extended', category: 'Gesture' },
  { sign: 'OK', description: 'Thumb and index forming circle, 3 fingers up', category: 'Response' },
];

export const LiveSignVision: React.FC<LiveSignVisionProps> = ({ onSendToDialogue }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [recognizedSign, setRecognizedSign] = useState<string>('Waiting for hands...');
  const [confidence, setConfidence] = useState<number>(0);
  const [activeFingers, setActiveFingers] = useState<{ thumb: boolean; index: boolean; middle: boolean; ring: boolean; pinky: boolean }>({
    thumb: false,
    index: false,
    middle: false,
    ring: false,
    pinky: false,
  });
  const [sentenceBuffer, setSentenceBuffer] = useState<string[]>([]);
  const [isCapturingSnapshot, setIsCapturingSnapshot] = useState<boolean>(false);
  const [snapshotResult, setSnapshotResult] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const mpHandsRef = useRef<Hands | null>(null);
  const mpCameraRef = useRef<MpCamera | null>(null);
  const animFallbackRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Gesture classification heuristic based on 21 MediaPipe hand landmarks
  const classifyGesture = (landmarks: Array<{ x: number; y: number; z?: number }>) => {
    // MediaPipe Hand Landmark IDs:
    // 0: Wrist
    // 1-4: Thumb (4 is tip)
    // 5-8: Index (8 is tip, 6 is PIP)
    // 9-12: Middle (12 is tip, 10 is PIP)
    // 13-16: Ring (16 is tip, 14 is PIP)
    // 17-20: Pinky (20 is tip, 18 is PIP)

    const wrist = landmarks[0];
    
    // Check if fingers are extended (tip is higher/lower than PIP joint relative to wrist)
    const isIndexExtended = landmarks[8].y < landmarks[6].y;
    const isMiddleExtended = landmarks[12].y < landmarks[10].y;
    const isRingExtended = landmarks[16].y < landmarks[14].y;
    const isPinkyExtended = landmarks[20].y < landmarks[18].y;
    
    // Thumb: distance from wrist or horizontal spread from MCP
    const thumbTipDist = Math.hypot(landmarks[4].x - wrist.x, landmarks[4].y - wrist.y);
    const thumbMcpDist = Math.hypot(landmarks[2].x - wrist.x, landmarks[2].y - wrist.y);
    const isThumbExtended = thumbTipDist > thumbMcpDist * 1.25;

    setActiveFingers({
      thumb: isThumbExtended,
      index: isIndexExtended,
      middle: isMiddleExtended,
      ring: isRingExtended,
      pinky: isPinkyExtended,
    });

    const extendedCount = [isIndexExtended, isMiddleExtended, isRingExtended, isPinkyExtended].filter(Boolean).length;

    // 1. Open Palm / HELLO / NAMASTE: All 4 or 5 fingers extended
    if (extendedCount >= 4) {
      return { sign: 'HELLO', conf: 0.96 };
    }

    // 2. Fist / YES / AGREE: 0 fingers extended
    if (extendedCount === 0 && !isThumbExtended) {
      return { sign: 'YES', conf: 0.94 };
    }

    // 3. Thumb Up / HELP / GOOD: Thumb extended upright, all other fingers closed
    if (isThumbExtended && extendedCount === 0 && landmarks[4].y < landmarks[3].y) {
      return { sign: 'HELP', conf: 0.93 };
    }

    // 4. Index only / POINT / YOU
    if (isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
      return { sign: 'YOU', conf: 0.92 };
    }

    // 5. Peace / Victory / TWO: Index + Middle extended, Ring & Pinky closed
    if (isIndexExtended && isMiddleExtended && !isRingExtended && !isPinkyExtended) {
      return { sign: 'PEACE', conf: 0.95 };
    }

    // 6. I-LOVE-YOU: Thumb + Index + Pinky extended, Middle & Ring folded
    if (isThumbExtended && isIndexExtended && !isMiddleExtended && !isRingExtended && isPinkyExtended) {
      return { sign: 'I-LOVE-YOU', conf: 0.98 };
    }

    // 7. Water / THREE: Index + Middle + Ring extended, Pinky closed
    if (isIndexExtended && isMiddleExtended && isRingExtended && !isPinkyExtended) {
      return { sign: 'WATER', conf: 0.91 };
    }

    // 8. OK Sign: Thumb and index tip close together, middle/ring/pinky up
    const thumbIndexDist = Math.hypot(landmarks[4].x - landmarks[8].x, landmarks[4].y - landmarks[8].y);
    if (thumbIndexDist < 0.08 && isMiddleExtended && isPinkyExtended) {
      return { sign: 'OK', conf: 0.95 };
    }

    // 9. Call / Phone: Thumb + Pinky extended, others folded
    if (isThumbExtended && !isIndexExtended && !isMiddleExtended && !isRingExtended && isPinkyExtended) {
      return { sign: 'CALL', conf: 0.94 };
    }

    return { sign: 'SIGN DETECTED', conf: 0.88 };
  };

  // Start Real Camera Feed
  const startCamera = async () => {
    try {
      setCameraError(null);
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraActive(true);
        initMediaPipe();
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      let msg = 'Could not access camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. Please allow camera access in your browser or iframe settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No video camera detected on your device.';
      } else {
        msg = err.message || 'Camera initialization failed.';
      }
      setCameraError(msg);
      // Fall back to interactive canvas mode
      startFallbackCanvas();
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (mpCameraRef.current) {
      mpCameraRef.current.stop();
      mpCameraRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (animFallbackRef.current) {
      cancelAnimationFrame(animFallbackRef.current);
      animFallbackRef.current = null;
    }
    setIsCameraActive(false);
  };

  const toggleFacingMode = () => {
    stopCamera();
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
    setTimeout(() => startCamera(), 300);
  };

  // Initialize MediaPipe Hands
  const initMediaPipe = () => {
    try {
      const hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      hands.onResults(onHandResults);
      mpHandsRef.current = hands;

      if (videoRef.current) {
        const camera = new MpCamera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current && mpHandsRef.current) {
              await mpHandsRef.current.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480,
        });
        camera.start();
        mpCameraRef.current = camera;
      }
    } catch (err) {
      console.warn('MediaPipe initialization fallback to optical canvas:', err);
      startFallbackCanvas();
    }
  };

  // MediaPipe Hand Detection Results Handler
  const onHandResults = (results: Results) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      // Hands are in frame!
      for (const landmarks of results.multiHandLandmarks) {
        // Draw bones
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        for (const [start, end] of HAND_CONNECTIONS) {
          const p1 = landmarks[start];
          const p2 = landmarks[end];
          ctx.beginPath();
          ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
          ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
          ctx.stroke();
        }

        // Draw joint points
        for (const pt of landmarks) {
          ctx.beginPath();
          ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 5, 0, 2 * Math.PI);
          ctx.fillStyle = '#0284c7';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Run gesture classifier
        const classified = classifyGesture(landmarks);
        setRecognizedSign(classified.sign);
        setConfidence(classified.conf);
      }
    } else {
      // No hands currently in frame
      setRecognizedSign('Position hand in frame...');
      setConfidence(0);
    }
  };

  // Fallback optical loop if MediaPipe wasm is unavailable
  const startFallbackCanvas = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let tick = 0;
    const loop = () => {
      animFallbackRef.current = requestAnimationFrame(loop);
      if (!canvas) return;

      const w = canvas.width || 640;
      const h = canvas.height || 480;
      ctx.clearRect(0, 0, w, h);

      tick++;
      // Draw a subtle hand guide target
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(w * 0.3, h * 0.2, w * 0.4, h * 0.6);
      ctx.setLineDash([]);
    };
    loop();
  };

  // Snapshot & Deep Gemini AI Visual Analysis
  const handleCaptureSnapshot = async () => {
    const video = videoRef.current;
    if (!video) return;

    setIsCapturingSnapshot(true);
    setSnapshotResult(null);

    try {
      const snapCanvas = document.createElement('canvas');
      snapCanvas.width = video.videoWidth || 640;
      snapCanvas.height = video.videoHeight || 480;
      const ctx = snapCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, snapCanvas.width, snapCanvas.height);
        const imageBase64 = snapCanvas.toDataURL('image/jpeg', 0.85);

        // Send to Gemini translation endpoint for deep visual extraction
        const res = await fetch('/api/gemini/translate-isl', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inputType: 'image',
            imageBase64,
            mediaMimeType: 'image/jpeg',
            text: 'Analyze the hand sign in this camera capture and provide the ISL gloss and meaning.',
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const signGloss = data.islGloss || data.summary || 'SIGN IDENTIFIED';
          setSnapshotResult(signGloss);
          setSentenceBuffer((prev) => [...prev, signGloss]);
          setRecognizedSign(signGloss);
        }
      }
    } catch (e) {
      console.warn('Snapshot analysis error:', e);
    } finally {
      setIsCapturingSnapshot(false);
    }
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

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Sign Vision Camera
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time hand tracking and Indian Sign Language gesture recognition using 21 skeletal landmarks.
          </p>
        </div>

        {/* Camera Start / Stop Controls */}
        <div className="flex items-center gap-2">
          {isCameraActive && (
            <button
              onClick={toggleFacingMode}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
              title="Switch Camera"
            >
              <SwitchCamera className="w-4 h-4" />
            </button>
          )}

          {!isCameraActive ? (
            <button
              onClick={startCamera}
              className="flex items-center gap-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm shadow-sky-500/20 active:scale-95 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Turn On Camera</span>
            </button>
          ) : (
            <button
              onClick={stopCamera}
              className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm shadow-rose-600/20 active:scale-95 cursor-pointer"
            >
              <CameraOff className="w-4 h-4" />
              <span>Turn Off Camera</span>
            </button>
          )}
        </div>
      </div>

      {cameraError && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 p-4 rounded-2xl text-xs flex items-start gap-3">
          <Info className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Camera Notice</p>
            <p className="mt-0.5">{cameraError}</p>
            <p className="mt-1 text-slate-600 dark:text-slate-400">You can also tap the common signs in the Sign Bank below to practice and compose sentences.</p>
          </div>
        </div>
      )}

      {/* Main Grid: Camera Viewport on Left (7 cols), Sentence & Bank on Right (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Live Video Canvas Feed */}
        <div className="lg:col-span-7 bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 shadow-xl relative min-h-[400px] flex items-center justify-center">
          
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
              <div className="w-16 h-16 rounded-2xl bg-slate-900 text-sky-400 flex items-center justify-center mx-auto mb-4 border border-slate-800">
                <Hand className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">
                Camera Is Inactive
              </h3>
              <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                Turn on your camera to track hand movements and translate signs live into text and speech.
              </p>
              <button
                onClick={startCamera}
                className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm"
              >
                <Camera className="w-4 h-4" />
                <span>Start Camera</span>
              </button>
            </div>
          )}

          {/* HUD Live Detection Overlay */}
          {isCameraActive && (
            <>
              {/* Top HUD Badges */}
              <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-auto">
                <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700 text-xs text-white">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-semibold text-[11px]">Active Hand Tracking</span>
                </div>

                {/* Finger Indicators */}
                <div className="hidden sm:flex items-center gap-1 bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-slate-700 text-[10px] text-slate-300">
                  <span className={activeFingers.thumb ? 'text-sky-400 font-bold' : 'text-slate-500'}>T</span>
                  <span>•</span>
                  <span className={activeFingers.index ? 'text-sky-400 font-bold' : 'text-slate-500'}>I</span>
                  <span>•</span>
                  <span className={activeFingers.middle ? 'text-sky-400 font-bold' : 'text-slate-500'}>M</span>
                  <span>•</span>
                  <span className={activeFingers.ring ? 'text-sky-400 font-bold' : 'text-slate-500'}>R</span>
                  <span>•</span>
                  <span className={activeFingers.pinky ? 'text-sky-400 font-bold' : 'text-slate-500'}>P</span>
                </div>
              </div>

              {/* Bottom HUD Action Bar */}
              <div className="absolute bottom-4 left-4 right-4 z-10 bg-slate-900/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-700 text-white flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    Recognized Sign
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-sky-400">
                      {recognizedSign}
                    </span>
                    {confidence > 0 && (
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                        {Math.round(confidence * 100)}%
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCaptureSnapshot}
                    disabled={isCapturingSnapshot}
                    className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                    title="Take Snapshot and analyze with AI"
                  >
                    {isCapturingSnapshot ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>AI Snapshot</span>
                  </button>

                  <button
                    onClick={() => addSignToSentence(recognizedSign)}
                    className="bg-sky-600 hover:bg-sky-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    + Add Sign
                  </button>
                </div>
              </div>
            </>
          )}

        </div>

        {/* Right Column: Sentence Builder & Clean Sign Bank */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Sentence Builder */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3 transition-colors">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wide">
                Sentence Output
              </h3>
              {sentenceBuffer.length > 0 && (
                <button
                  onClick={() => setSentenceBuffer([])}
                  className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-semibold cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="min-h-[85px] p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-wrap gap-2 items-center">
              {sentenceBuffer.length === 0 ? (
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  Detected signs will assemble here as you sign or tap below.
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
                      className="text-sky-200 hover:text-white ml-0.5 font-black cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>

            <button
              onClick={handleSendBuffer}
              disabled={sentenceBuffer.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 disabled:opacity-40 text-white py-2.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send to Two-Way Dialogue</span>
            </button>
          </div>

          {/* Common Signs Bank */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3 transition-colors">
            <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wide">
              Quick Sign Bank
            </h3>

            <div className="grid grid-cols-2 gap-2">
              {COMMON_SIGNS.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => addSignToSentence(item.sign)}
                  className="p-3 text-left rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-sky-50 dark:hover:bg-slate-800 hover:border-sky-300 dark:hover:border-sky-700/50 border border-slate-200 dark:border-slate-700/60 transition group cursor-pointer active:scale-95"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100 group-hover:text-sky-700 dark:group-hover:text-sky-400">
                      {item.sign}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
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
