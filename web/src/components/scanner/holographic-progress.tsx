"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface HolographicProgressProps {
  progress: number;
  phase?: string;
  phaseNumber?: number;
  totalPhases?: number;
  fuzzProgress?: number;
  fuzzTotal?: number;
  size?: number;
}

export function HolographicProgress({
  progress,
  phase,
  phaseNumber = 0,
  totalPhases = 13,
  fuzzProgress,
  fuzzTotal,
  size = 200,
}: HolographicProgressProps) {
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00F0FF" />
              <stop offset="100%" stopColor="#7C3AED" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={stroke}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#progressGradient)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            filter="url(#glow)"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <motion.span
            key={progress}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-3xl font-bold font-mono text-cyan-400"
          >
            {Math.round(progress)}%
          </motion.span>
          {phaseNumber > 0 && (
            <span className="text-xs text-slate-400 mt-1">
              Phase {phaseNumber}/{totalPhases}
            </span>
          )}
          {phase && <span className="text-xs text-purple-400 mt-0.5 max-w-[140px] truncate">{phase}</span>}
        </div>
      </div>
      {fuzzProgress !== undefined && fuzzTotal !== undefined && (
        <div className="w-full max-w-xs">
          <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
            <span>Fuzzing</span>
            <span>
              {fuzzProgress.toLocaleString()} / {fuzzTotal.toLocaleString()}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${(fuzzProgress / fuzzTotal) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function PhaseList({
  phases,
  currentPhase,
}: {
  phases: string[];
  currentPhase: number;
}) {
  return (
    <div className="space-y-1">
      {phases.map((phase, i) => {
        const idx = i + 1;
        const isActive = idx === currentPhase;
        const isDone = idx < currentPhase;
        return (
          <motion.div
            key={phase}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
              isActive && "bg-cyan-500/10 border-l-2 border-cyan-400 text-cyan-300",
              isDone && "text-slate-500",
              !isActive && !isDone && "text-slate-600"
            )}
          >
            <span
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono border",
                isActive && "border-cyan-400 text-cyan-400 animate-pulse",
                isDone && "border-green-500/50 text-green-500 bg-green-500/10",
                !isActive && !isDone && "border-white/10"
              )}
            >
              {isDone ? "✓" : idx}
            </span>
            <span className="truncate">{phase}</span>
          </motion.div>
        );
      })}
    </div>
  );
}
