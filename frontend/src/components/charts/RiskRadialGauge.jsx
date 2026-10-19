import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

export default function RiskRadialGauge({ riskLevel = 'Low', daysRemaining = 24.5, title = 'Stockout Risk Gauge' }) {
  // Map risk level to gauge percentage and color
  const riskMap = {
    Critical: { score: 92, color: '#ef4444', label: 'Critical Risk', desc: 'Depletion < Lead Time' },
    High: { score: 75, color: '#f97316', label: 'High Priority', desc: 'Stockout within 3 days of lead time' },
    Medium: { score: 45, color: '#eab308', label: 'Moderate Risk', desc: 'Stockout within 7 days of lead time' },
    Low: { score: 18, color: '#10b981', label: 'Healthy Stock', desc: 'Adequate safety stock buffer' },
  };

  const current = riskMap[riskLevel] || riskMap.Low;

  // Arc calculation (240 degree gauge)
  const radius = 60;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius * (240 / 360);
  const strokeDashoffset = circumference - (current.score / 100) * circumference;

  return (
    <div className="glass-panel p-5 flex flex-col items-center justify-center text-center space-y-3">
      <div className="flex items-center justify-between w-full pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</span>
        {riskLevel === 'Critical' || riskLevel === 'High' ? (
          <ShieldAlert className="w-4 h-4 text-rose-500" />
        ) : (
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
        )}
      </div>

      {/* SVG Semicircle Radial Gauge */}
      <div className="relative w-40 h-40 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-[210deg]" viewBox="0 0 160 160">
          {/* Background Arc */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="currentColor"
            className="text-slate-200 dark:text-slate-800"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeLinecap="round"
          />
          {/* Animated Active Arc */}
          <motion.circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={current.color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            strokeLinecap="round"
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-black font-display tracking-tight" style={{ color: current.color }}>
            {current.score}%
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Risk Index
          </span>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1">
        <span
          className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold"
          style={{ backgroundColor: `${current.color}20`, color: current.color }}
        >
          {current.label}
        </span>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Estimated <strong>{daysRemaining} days</strong> of stock coverage remaining.
        </p>
      </div>
    </div>
  );
}
