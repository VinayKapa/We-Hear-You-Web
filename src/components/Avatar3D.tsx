import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Play, Pause, RotateCcw, Volume2, Maximize2, ShieldAlert, Sparkles, Smile, HelpCircle } from 'lucide-react';
import { SignToken } from '../types';

interface Avatar3DProps {
  signTokens?: SignToken[];
  currentGloss?: string;
  facialExpression?: string;
  isSigning?: boolean;
  onAnimationComplete?: () => void;
  height?: string;
}

export const Avatar3D: React.FC<Avatar3DProps> = ({
  signTokens = [],
  currentGloss: externalGloss,
  facialExpression = 'neutral',
  isSigning: externalIsSigning,
  onAnimationComplete,
  height = 'h-72 sm:h-96',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [activeTokenIndex, setActiveTokenIndex] = useState<number>(0);
  const [speed, setSpeed] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Three.js internal references
  const animFrameId = useRef<number | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  
  // Skeletal parts refs for procedural signing animation
  const avatarRig = useRef<{
    root: THREE.Group;
    head: THREE.Mesh;
    leftEye: THREE.Mesh;
    rightEye: THREE.Mesh;
    mouth: THREE.Mesh;
    leftShoulder: THREE.Group;
    rightShoulder: THREE.Group;
    leftElbow: THREE.Group;
    rightElbow: THREE.Group;
    leftHand: THREE.Group;
    rightHand: THREE.Group;
  } | null>(null);

  const activeToken = signTokens.length > 0 ? signTokens[activeTokenIndex] : null;
  const displayGloss = externalGloss || activeToken?.gloss || 'READY';
  const displayMeaning = activeToken?.meaning || 'Standing by for translation';

  // Advance sign token timer
  useEffect(() => {
    if (!isPlaying || signTokens.length === 0) return;

    const currentDuration = ((activeToken?.durationSec || 1) * 1000) / speed;
    const timer = setTimeout(() => {
      if (activeTokenIndex < signTokens.length - 1) {
        setActiveTokenIndex((prev) => prev + 1);
      } else {
        // Finished sequence
        if (onAnimationComplete) {
          onAnimationComplete();
        }
      }
    }, currentDuration);

    return () => clearTimeout(timer);
  }, [isPlaying, activeTokenIndex, signTokens, speed, activeToken, onAnimationComplete]);

  // Reset index if new tokens arrive
  useEffect(() => {
    setActiveTokenIndex(0);
    setIsPlaying(true);
  }, [signTokens]);

  // Three.js Scene Setup & Loop
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 400;
    const heightPx = container.clientHeight || 360;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0xf1f5f9);

    const camera = new THREE.PerspectiveCamera(45, width / heightPx, 0.1, 1000);
    camera.position.set(0, 1.2, 3.2);
    camera.lookAt(0, 1.0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, heightPx);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.replaceChildren(renderer.domElement);
    rendererRef.current = renderer;

    // Ambient & Directional Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.2);
    keyLight.position.set(2, 4, 3);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.4);
    fillLight.position.set(-3, 2, 1);
    scene.add(fillLight);

    // Grid Floor
    const grid = new THREE.GridHelper(6, 12, 0x94a3b8, 0xe2e8f0);
    grid.position.y = -0.6;
    scene.add(grid);

    // Build Articulated 3D Humanoid Avatar
    const rigRoot = new THREE.Group();
    scene.add(rigRoot);

    // Materials
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xe0a98b,
      roughness: 0.5,
      metalness: 0.05,
    });
    const clothesMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Friendly ocean blue
      roughness: 0.6,
      metalness: 0.1,
    });
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.9,
    });
    const facialMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });

    // Torso / Chest
    const torsoGeo = new THREE.CylinderGeometry(0.32, 0.28, 0.8, 16);
    const torso = new THREE.Mesh(torsoGeo, clothesMat);
    torso.position.y = 0.5;
    rigRoot.add(torso);

    // Neck
    const neckGeo = new THREE.CylinderGeometry(0.1, 0.11, 0.18, 12);
    const neck = new THREE.Mesh(neckGeo, skinMat);
    neck.position.y = 0.95;
    rigRoot.add(neck);

    // Head
    const headGeo = new THREE.SphereGeometry(0.24, 24, 24);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 1.18;
    rigRoot.add(head);

    // Hair cap
    const hairGeo = new THREE.SphereGeometry(0.25, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 1.24;
    rigRoot.add(hair);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.025, 12, 12);
    const leftEye = new THREE.Mesh(eyeGeo, facialMat);
    leftEye.position.set(-0.08, 1.2, 0.22);
    rigRoot.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, facialMat);
    rightEye.position.set(0.08, 1.2, 0.22);
    rigRoot.add(rightEye);

    // Mouth
    const mouthGeo = new THREE.BoxGeometry(0.07, 0.02, 0.02);
    const mouth = new THREE.Mesh(mouthGeo, facialMat);
    mouth.position.set(0, 1.1, 0.22);
    rigRoot.add(mouth);

    // LEFT ARM RIG
    const leftShoulder = new THREE.Group();
    leftShoulder.position.set(-0.38, 0.8, 0);
    rigRoot.add(leftShoulder);

    const leftUpperArmGeo = new THREE.CylinderGeometry(0.065, 0.055, 0.35, 12);
    leftUpperArmGeo.translate(0, -0.175, 0);
    const leftUpperArm = new THREE.Mesh(leftUpperArmGeo, clothesMat);
    leftShoulder.add(leftUpperArm);

    const leftElbow = new THREE.Group();
    leftElbow.position.set(0, -0.35, 0);
    leftShoulder.add(leftElbow);

    const leftForearmGeo = new THREE.CylinderGeometry(0.055, 0.045, 0.32, 12);
    leftForearmGeo.translate(0, -0.16, 0);
    const leftForearm = new THREE.Mesh(leftForearmGeo, skinMat);
    leftElbow.add(leftForearm);

    const leftHand = new THREE.Group();
    leftHand.position.set(0, -0.32, 0);
    leftElbow.add(leftHand);

    const leftPalmGeo = new THREE.BoxGeometry(0.08, 0.1, 0.03);
    const leftPalm = new THREE.Mesh(leftPalmGeo, skinMat);
    leftHand.add(leftPalm);

    // RIGHT ARM RIG
    const rightShoulder = new THREE.Group();
    rightShoulder.position.set(0.38, 0.8, 0);
    rigRoot.add(rightShoulder);

    const rightUpperArmGeo = new THREE.CylinderGeometry(0.065, 0.055, 0.35, 12);
    rightUpperArmGeo.translate(0, -0.175, 0);
    const rightUpperArm = new THREE.Mesh(rightUpperArmGeo, clothesMat);
    rightShoulder.add(rightUpperArm);

    const rightElbow = new THREE.Group();
    rightElbow.position.set(0, -0.35, 0);
    rightShoulder.add(rightElbow);

    const rightForearmGeo = new THREE.CylinderGeometry(0.055, 0.045, 0.32, 12);
    rightForearmGeo.translate(0, -0.16, 0);
    const rightForearm = new THREE.Mesh(rightForearmGeo, skinMat);
    rightElbow.add(rightForearm);

    const rightHand = new THREE.Group();
    rightHand.position.set(0, -0.32, 0);
    rightElbow.add(rightHand);

    const rightPalmGeo = new THREE.BoxGeometry(0.08, 0.1, 0.03);
    const rightPalm = new THREE.Mesh(rightPalmGeo, skinMat);
    rightHand.add(rightPalm);

    avatarRig.current = {
      root: rigRoot,
      head,
      leftEye,
      rightEye,
      mouth,
      leftShoulder,
      rightShoulder,
      leftElbow,
      rightElbow,
      leftHand,
      rightHand,
    };

    // Animation Render Loop
    let clock = new THREE.Clock();

    const animate = () => {
      animFrameId.current = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      if (avatarRig.current) {
        const rig = avatarRig.current;
        const currentActive = signTokens[activeTokenIndex]?.gloss?.toUpperCase() || displayGloss.toUpperCase();

        // Idle gentle breathing sway
        const idle = Math.sin(elapsedTime * 2) * 0.03;
        rig.head.position.y = 1.18 + idle * 0.5;

        // Animate facial expression
        if (facialExpression === 'question_wh' || facialExpression === 'question_yes_no') {
          rig.head.rotation.z = Math.sin(elapsedTime * 3) * 0.06; // inquisitive head tilt
          rig.mouth.scale.set(0.8, 1.8, 1); // open questioning mouth
        } else if (facialExpression === 'urgent' || facialExpression === 'concern') {
          rig.head.position.z = 0.05 + Math.sin(elapsedTime * 6) * 0.02;
          rig.mouth.scale.set(1.2, 0.7, 1);
        } else if (facialExpression === 'happy') {
          rig.mouth.scale.set(1.3, 0.8, 1);
          rig.head.rotation.x = -0.05;
        } else {
          rig.mouth.scale.set(1, 1, 1);
          rig.head.rotation.set(0, 0, 0);
        }

        // Procedural signing gestures based on gloss patterns
        if (isPlaying && (signTokens.length > 0 || externalIsSigning)) {
          const t = (elapsedTime * 4 * speed) % (Math.PI * 2);

          if (currentActive.includes('HELLO') || currentActive.includes('HI') || currentActive.includes('NAMASTE')) {
            // Right hand wave / greeting gesture near temple
            rig.rightShoulder.rotation.set(0.6, 0.3, -0.6);
            rig.rightElbow.rotation.set(-1.4, 0, 0);
            rig.rightHand.rotation.set(0, 0, Math.sin(t * 3) * 0.4);

            rig.leftShoulder.rotation.set(0.2, 0, 0.2);
            rig.leftElbow.rotation.set(-0.3, 0, 0);
          } else if (currentActive.includes('THANK') || currentActive.includes('PLEASE')) {
            // Palm touches chin and extends forward
            const wave = (Math.sin(t) + 1) / 2;
            rig.rightShoulder.rotation.set(0.8 + wave * 0.3, 0.1, -0.2);
            rig.rightElbow.rotation.set(-1.6 + wave * 0.6, 0, 0);
            rig.rightHand.rotation.set(wave * 0.4, 0, 0);

            rig.leftShoulder.rotation.set(0.4, 0, 0.2);
            rig.leftElbow.rotation.set(-0.5, 0, 0);
          } else if (currentActive.includes('TRAIN') || currentActive.includes('PLATFORM') || currentActive.includes('BUS')) {
            // Symmetrical forward moving parallel gesture
            const sweep = Math.sin(t) * 0.25;
            rig.leftShoulder.rotation.set(0.7, -0.2, 0.3);
            rig.leftElbow.rotation.set(-1.2, 0, sweep);
            rig.rightShoulder.rotation.set(0.7, 0.2, -0.3);
            rig.rightElbow.rotation.set(-1.2, 0, -sweep);
          } else if (currentActive.includes('DOCTOR') || currentActive.includes('MEDICINE') || currentActive.includes('HOSPITAL')) {
            // Two fingers / hand check wrist pulse then to mouth
            const cycle = Math.sin(t);
            rig.leftShoulder.rotation.set(0.5, 0, 0.3);
            rig.leftElbow.rotation.set(-1.0, 0.4, 0);
            rig.rightShoulder.rotation.set(0.8, -0.2, -0.3);
            rig.rightElbow.rotation.set(-1.5 + cycle * 0.3, 0, 0);
          } else if (currentActive.includes('EMERGENCY') || currentActive.includes('HELP') || currentActive.includes('DANGER')) {
            // Emphatic raised alert gestures
            const alertPulse = Math.sin(t * 3) * 0.3;
            rig.leftShoulder.rotation.set(1.1 + alertPulse, 0, 0.4);
            rig.leftElbow.rotation.set(-1.4, 0, 0);
            rig.rightShoulder.rotation.set(1.1 + alertPulse, 0, -0.4);
            rig.rightElbow.rotation.set(-1.4, 0, 0);
          } else {
            // Default generic expressive conversational signing movement
            const waveA = Math.sin(t) * 0.4;
            const waveB = Math.cos(t) * 0.3;
            rig.leftShoulder.rotation.set(0.6 + waveA * 0.2, -0.2, 0.4);
            rig.leftElbow.rotation.set(-1.1 + waveB * 0.3, 0.2, 0);
            rig.rightShoulder.rotation.set(0.6 - waveA * 0.2, 0.2, -0.4);
            rig.rightElbow.rotation.set(-1.1 - waveB * 0.3, -0.2, 0);
          }
        } else {
          // Relaxed neutral ready stance
          rig.leftShoulder.rotation.set(0.2, 0, 0.15);
          rig.leftElbow.rotation.set(-0.35, 0, 0);
          rig.leftHand.rotation.set(0, 0, 0);
          rig.rightShoulder.rotation.set(0.2, 0, -0.15);
          rig.rightElbow.rotation.set(-0.35, 0, 0);
          rig.rightHand.rotation.set(0, 0, 0);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // Responsive Canvas Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW && newH && cameraRef.current && rendererRef.current) {
          cameraRef.current.aspect = newW / newH;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(newW, newH);
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      resizeObserver.disconnect();
      renderer.dispose();
    };
  }, [displayGloss, facialExpression, isPlaying, speed, signTokens, externalIsSigning, activeTokenIndex]);

  // Voice narration helper using Web Speech API
  const handleVoiceNarration = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(displayMeaning || displayGloss);
      utterance.rate = 0.95;
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleReset = () => {
    setActiveTokenIndex(0);
    setIsPlaying(true);
  };

  return (
    <div className={`relative flex flex-col bg-slate-900 rounded-2xl overflow-hidden shadow-xl border border-slate-800 ${height} w-full`}>
      {/* 3D Viewport Header Overlay */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/60 shadow-lg">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold tracking-wide text-slate-200">
            3D ISL Avatar • Indian Sign Language
          </span>
          {facialExpression !== 'neutral' && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] bg-sky-900/60 text-sky-200 px-2 py-0.5 rounded-md border border-sky-600/40">
              <Smile className="w-3 h-3" /> {facialExpression.replace('_', ' ')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md px-2 py-1 rounded-full border border-slate-700/60">
          <button
            onClick={() => setSpeed((s) => (s === 0.75 ? 1 : s === 1 ? 1.25 : 0.75))}
            className="text-xs font-medium text-slate-300 hover:text-white px-2 py-1 rounded hover:bg-slate-800 transition"
            title="Adjust signing speed"
          >
            {speed}x
          </button>
          <button
            onClick={handleVoiceNarration}
            className="p-1.5 text-slate-300 hover:text-sky-300 hover:bg-slate-800 rounded transition"
            title="Speak aloud"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Three.js Canvas Container */}
      <div ref={containerRef} className="flex-1 w-full h-full min-h-[200px]" />

      {/* Floating ISL Gloss & Subtitle Panel */}
      <div className="absolute bottom-3 left-3 right-3 z-10 bg-slate-950/85 backdrop-blur-md p-3 rounded-xl border border-slate-700/70 shadow-2xl">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
              ISL GLOSS
            </span>
            <span className="text-sm sm:text-base font-black tracking-wide text-white truncate">
              {displayGloss}
            </span>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition shadow-sm"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleReset}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
              title="Replay sequence"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Plain Language Subtitle */}
        <p className="text-xs text-slate-300 line-clamp-2">
          {displayMeaning}
        </p>

        {/* Progress Bar for Sign Tokens Sequence */}
        {signTokens.length > 1 && (
          <div className="mt-2 flex gap-1 w-full">
            {signTokens.map((token, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setActiveTokenIndex(idx);
                  setIsPlaying(true);
                }}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  idx === activeTokenIndex
                    ? 'bg-sky-400 ring-2 ring-sky-400/40'
                    : idx < activeTokenIndex
                    ? 'bg-slate-600'
                    : 'bg-slate-800'
                }`}
                title={`${token.gloss}: ${token.meaning}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
