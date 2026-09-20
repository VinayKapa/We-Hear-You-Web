import React, { useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';

interface AudioWaveformVisualizerProps {
  isActive: boolean;
  mode?: 'recording' | 'playback' | 'idle';
  label?: string;
  className?: string;
}

export const AudioWaveformVisualizer: React.FC<AudioWaveformVisualizerProps> = ({
  isActive,
  mode = 'recording',
  label,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animIdRef = useRef<number | null>(null);
  const { isDark } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;
    const barCount = 32;

    const render = () => {
      animIdRef.current = requestAnimationFrame(render);
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      phase += isActive ? 0.08 : 0.02;

      const barWidth = width / barCount;
      const centerY = height / 2;

      for (let i = 0; i < barCount; i++) {
        // Create an organic wave modulation
        const distFromCenter = Math.abs(i - barCount / 2) / (barCount / 2);
        const envelope = Math.cos(distFromCenter * (Math.PI / 2));
        
        let amplitude = 0.15;
        if (isActive) {
          // Dynamic wave with multi-frequency modulation
          amplitude = 
            Math.sin(phase + i * 0.3) * 0.35 +
            Math.cos(phase * 1.5 + i * 0.5) * 0.25 +
            Math.sin(phase * 0.7 + i * 0.1) * 0.25 +
            0.2;
          amplitude = Math.max(0.15, amplitude * envelope);
        } else {
          // Gentle resting breathing wave
          amplitude = (Math.sin(phase * 0.5 + i * 0.2) * 0.08 + 0.1) * envelope;
        }

        const barHeight = Math.max(4, amplitude * (height * 0.85));
        const x = i * barWidth + barWidth * 0.2;
        const actualWidth = barWidth * 0.6;
        const y = centerY - barHeight / 2;

        // Gradient based on mode and theme
        const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
        if (mode === 'recording') {
          // Vibrant Rose to Coral Red
          grad.addColorStop(0, '#fb7185');
          grad.addColorStop(1, '#e11d48');
        } else if (mode === 'playback') {
          // Sky to Indigo Violet
          grad.addColorStop(0, '#38bdf8');
          grad.addColorStop(1, '#6366f1');
        } else {
          // Neutral Slate
          grad.addColorStop(0, isDark ? '#475569' : '#94a3b8');
          grad.addColorStop(1, isDark ? '#334155' : '#cbd5e1');
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, actualWidth, barHeight, [actualWidth / 2]);
        ctx.fill();
      }
    };

    render();

    return () => {
      if (animIdRef.current) {
        cancelAnimationFrame(animIdRef.current);
      }
    };
  }, [isActive, mode, isDark]);

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <canvas
        ref={canvasRef}
        width={240}
        height={48}
        className="w-full max-w-[240px] h-10 rounded-xl"
      />
      {label && (
        <span className="text-[10px] font-bold tracking-wider uppercase mt-1 text-slate-500 dark:text-slate-400">
          {label}
        </span>
      )}
    </div>
  );
};
