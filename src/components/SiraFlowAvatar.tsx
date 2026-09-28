import React, { useEffect, useRef } from 'react';
import { Sparkles, Mic, Volume2, ShieldCheck, CheckCircle2 } from 'lucide-react';

export type SiraFlowState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface SiraFlowAvatarProps {
  state: SiraFlowState;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isSpeaking?: boolean;
  onClick?: () => void;
  className?: string;
  showStatusLabel?: boolean;
  showBadges?: boolean;
}

export const SiraFlowAvatar: React.FC<SiraFlowAvatarProps> = ({
  state = 'idle',
  size = 'lg',
  isSpeaking = false,
  onClick,
  className = '',
  showStatusLabel = true,
  showBadges = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Dynamic dimension resolution
  const getDimension = () => {
    switch (size) {
      case 'sm': return 44;
      case 'md': return 72;
      case 'lg': return 120;
      case 'xl': return 170;
      default: return 120;
    }
  };

  const dim = getDimension();

  // Waveform / Orb Particle Animation Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let angle = 0;
    const radius = dim / 2;

    const render = () => {
      ctx.clearRect(0, 0, dim, dim);

      const centerX = dim / 2;
      const centerY = dim / 2;

      // Glow Base
      const gradient = ctx.createRadialGradient(
        centerX, centerY, radius * 0.2,
        centerX, centerY, radius
      );

      if (state === 'listening') {
        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.45)');
        gradient.addColorStop(0.5, 'rgba(6, 182, 212, 0.25)');
        gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
      } else if (state === 'thinking') {
        gradient.addColorStop(0, 'rgba(168, 85, 247, 0.5)');
        gradient.addColorStop(0.5, 'rgba(236, 72, 153, 0.25)');
        gradient.addColorStop(1, 'rgba(168, 85, 247, 0)');
      } else if (state === 'speaking' || isSpeaking) {
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.6)');
        gradient.addColorStop(0.6, 'rgba(99, 102, 241, 0.3)');
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
      } else {
        // Idle
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.35)');
        gradient.addColorStop(0.5, 'rgba(147, 51, 234, 0.15)');
        gradient.addColorStop(1, 'rgba(30, 41, 59, 0)');
      }

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius - 2, 0, Math.PI * 2);
      ctx.fill();

      // Outer Rotating Quantum Rings
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle);

      const ringCount = state === 'speaking' ? 4 : 2;
      for (let r = 0; r < ringCount; r++) {
        ctx.beginPath();
        const curR = (radius * 0.65) + (r * 7) + (Math.sin(angle * 2 + r) * (state === 'speaking' ? 5 : 2));
        ctx.ellipse(0, 0, curR, curR * (0.8 + (r * 0.05)), (r * Math.PI) / 3, 0, Math.PI * 2);

        if (state === 'listening') {
          ctx.strokeStyle = `rgba(52, 211, 153, ${0.4 + r * 0.2})`;
        } else if (state === 'thinking') {
          ctx.strokeStyle = `rgba(216, 180, 254, ${0.4 + r * 0.2})`;
        } else if (state === 'speaking') {
          ctx.strokeStyle = `rgba(147, 197, 253, ${0.5 + r * 0.2})`;
        } else {
          ctx.strokeStyle = `rgba(96, 165, 250, ${0.25 + r * 0.15})`;
        }

        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 6]);
        ctx.stroke();
      }
      ctx.restore();

      // Dynamic Audio Equalizer Waveform Bars around core when speaking/listening
      if (state === 'speaking' || state === 'listening' || isSpeaking) {
        const barCount = 24;
        for (let b = 0; b < barCount; b++) {
          const theta = (b / barCount) * Math.PI * 2 + angle;
          const amp = state === 'speaking'
            ? Math.abs(Math.sin(angle * 4 + b * 0.8)) * 12 + 4
            : Math.abs(Math.sin(angle * 2 + b * 0.5)) * 8 + 2;

          const innerR = radius * 0.45;
          const outerR = innerR + amp;

          const x1 = centerX + Math.cos(theta) * innerR;
          const y1 = centerY + Math.sin(theta) * innerR;
          const x2 = centerX + Math.cos(theta) * outerR;
          const y2 = centerY + Math.sin(theta) * outerR;

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = state === 'speaking' ? 'rgba(96, 165, 250, 0.85)' : 'rgba(52, 211, 153, 0.85)';
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          ctx.stroke();
        }
      }

      // Internal Holographic Core
      const coreGradient = ctx.createRadialGradient(
        centerX - radius * 0.1,
        centerY - radius * 0.1,
        2,
        centerX,
        centerY,
        radius * 0.38
      );

      if (state === 'listening') {
        coreGradient.addColorStop(0, '#6ee7b7');
        coreGradient.addColorStop(0.6, '#059669');
        coreGradient.addColorStop(1, '#064e3b');
      } else if (state === 'thinking') {
        coreGradient.addColorStop(0, '#f472b6');
        coreGradient.addColorStop(0.6, '#9333ea');
        coreGradient.addColorStop(1, '#3b0764');
      } else if (state === 'speaking') {
        coreGradient.addColorStop(0, '#93c5fd');
        coreGradient.addColorStop(0.5, '#3b82f6');
        coreGradient.addColorStop(1, '#1e3a8a');
      } else {
        coreGradient.addColorStop(0, '#60a5fa');
        coreGradient.addColorStop(0.5, '#2563eb');
        coreGradient.addColorStop(1, '#0f172a');
      }

      ctx.fillStyle = coreGradient;
      ctx.beginPath();
      const corePulse = Math.sin(angle * 2) * (state === 'speaking' ? 3 : 1.5);
      ctx.arc(centerX, centerY, radius * 0.34 + corePulse, 0, Math.PI * 2);
      ctx.fill();

      // Specular Highlight
      ctx.beginPath();
      ctx.arc(centerX - radius * 0.12, centerY - radius * 0.12, radius * 0.09, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.fill();

      // Rotation Speed based on state
      const speed = state === 'thinking' ? 0.06 : state === 'speaking' ? 0.04 : state === 'listening' ? 0.03 : 0.015;
      angle += speed;

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [state, dim, isSpeaking]);

  const getStateLabel = () => {
    switch (state) {
      case 'listening': return { text: 'سایرافلو در حال شنیدن صدای شما...', color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/80', icon: Mic };
      case 'thinking': return { text: 'تحلیل داده‌های دفاتر و ارکستراسیون...', color: 'text-purple-400 bg-purple-950/60 border-purple-800/80', icon: Sparkles };
      case 'speaking': return { text: 'سایرافلو در حال پاسخ صوتی...', color: 'text-blue-400 bg-blue-950/60 border-blue-800/80', icon: Volume2 };
      default: return { text: 'سایرافلو آماده دریافت دستور', color: 'text-slate-300 bg-slate-900/60 border-slate-800', icon: Sparkles };
    }
  };

  const statusInfo = getStateLabel();
  const StatusIcon = statusInfo.icon;

  return (
    <div className={`flex flex-col items-center select-none ${className}`} id="siraflow-avatar-container">
      {/* Interactive Avatar Orb Wrapper */}
      <div
        onClick={onClick}
        className={`relative group flex items-center justify-center cursor-pointer transition-transform duration-200 active:scale-95 ${
          onClick ? 'hover:scale-105' : ''
        }`}
        style={{ width: dim, height: dim }}
        title="آواتار هوش مصنوعی سایرافلو (SiraFlow Orchestrator)"
      >
        <canvas
          ref={canvasRef}
          width={dim}
          height={dim}
          className="rounded-full drop-shadow-[0_0_20px_rgba(59,130,246,0.35)]"
        />

        {/* Ambient Halo Pulse */}
        <div
          className={`absolute inset-0 rounded-full pointer-events-none transition-opacity duration-300 ${
            state === 'listening'
              ? 'ring-4 ring-emerald-400/40 animate-ping opacity-75'
              : state === 'speaking'
              ? 'ring-4 ring-blue-400/50 animate-pulse opacity-90'
              : state === 'thinking'
              ? 'ring-4 ring-purple-500/40 animate-spin opacity-80'
              : 'opacity-0 group-hover:opacity-40 ring-2 ring-blue-400/30'
          }`}
        />

        {/* Center Persian Identity Symbol 'س' / Logo */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="font-extrabold text-white text-xs drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] opacity-90 font-serif">
            {size === 'xl' ? 'سایرافلو' : 'س'}
          </span>
        </div>
      </div>

      {/* Status Badge & Voice Feedback */}
      {showStatusLabel && (
        <div className="mt-3 flex flex-col items-center gap-1.5">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border backdrop-blur-md transition-all ${statusInfo.color}`}>
            <StatusIcon className={`w-3.5 h-3.5 ${state === 'listening' ? 'animate-bounce' : state === 'thinking' ? 'animate-spin' : ''}`} />
            <span className="font-medium text-[11px]">{statusInfo.text}</span>
          </div>

          {showBadges && (
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span>نسخه بازار تأییدشده</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-mono font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-blue-500" />
                <span>رودمپ Pro فعال</span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
