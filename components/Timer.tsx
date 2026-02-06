'use client';

import { useEffect, useState } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

interface TimerProps {
  startTime: number;
  duration: number; // in minutes
  onTimeUp: () => void;
}

export default function Timer({ startTime, duration, onTimeUp }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration * 60);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = duration * 60 - elapsed;

      if (remaining <= 0) {
        setTimeLeft(0);
        clearInterval(interval);
        onTimeUp();
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, duration, onTimeUp]);

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  const isLowTime = timeLeft < 300; // Less than 5 minutes
  const isCritical = timeLeft < 60; // Less than 1 minute

  // Calculate progress for visual indicator
  const totalSeconds = duration * 60;
  const progressPercent = (timeLeft / totalSeconds) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        relative flex items-center gap-3 px-5 py-3 rounded-xl font-mono text-lg
        transition-all duration-500 overflow-hidden
        ${isCritical
          ? 'timer-critical'
          : isLowTime
            ? 'timer-warning'
            : 'timer-normal'
        }
      `}
    >
      {/* Background progress indicator */}
      <div
        className="absolute inset-0 opacity-20 transition-all duration-1000"
        style={{
          background: `linear-gradient(90deg, currentColor ${progressPercent}%, transparent ${progressPercent}%)`
        }}
      />

      {/* Icon with animation */}
      <div className="relative z-10">
        {isCritical ? (
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            <AlertTriangle className="w-5 h-5" />
          </motion.div>
        ) : (
          <Clock className={`w-5 h-5 ${isLowTime ? 'animate-gentle-pulse' : ''}`} />
        )}
      </div>

      {/* Time display */}
      <div className="relative z-10 flex items-baseline gap-0.5">
        {hours > 0 && (
          <>
            <span className="font-bold text-xl tabular-nums">
              {hours.toString().padStart(2, '0')}
            </span>
            <span className="text-sm opacity-70 mx-0.5">:</span>
          </>
        )}
        <span className="font-bold text-xl tabular-nums">
          {minutes.toString().padStart(2, '0')}
        </span>
        <span className="text-sm opacity-70 mx-0.5">:</span>
        <motion.span
          key={seconds}
          initial={{ opacity: 0.5, y: -2 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-bold text-xl tabular-nums"
        >
          {seconds.toString().padStart(2, '0')}
        </motion.span>
      </div>

      {/* Time label */}
      <span className="relative z-10 text-xs uppercase tracking-wider opacity-60 hidden sm:inline">
        {isCritical ? 'Hurry!' : isLowTime ? 'Low Time' : 'Remaining'}
      </span>
    </motion.div>
  );
}
