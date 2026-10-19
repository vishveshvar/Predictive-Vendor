import React from 'react';
import { motion } from 'framer-motion';
import { Check, Clock, Truck, Package, CheckCircle2 } from 'lucide-react';

export default function OrderTimelineStepper({ order }) {
  if (!order) return null;

  const steps = [
    { id: 'Manufactured', label: 'Manufactured', icon: Package },
    { id: 'Dispatched', label: 'Dispatched', icon: Clock },
    { id: 'In-Transit', label: 'In-Transit', icon: Truck },
    { id: 'Delivered', label: 'Delivered', icon: CheckCircle2 },
  ];

  const statusWeights = {
    Manufactured: 0,
    Dispatched: 1,
    'In-Transit': 2,
    Delivered: 3,
  };

  const currentIdx = statusWeights[order.status] ?? 0;
  const progressPct = (currentIdx / (steps.length - 1)) * 100;

  // Find timeline timestamp entry if available
  const getTimestampFor = (stepId) => {
    const entry = order.timeline?.find((t) => t.status === stepId);
    if (!entry) return null;
    return new Date(entry.timestamp).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="glass-panel p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Logistics Stepper
          </span>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            Order {order.order_id} &bull; Carrier: {order.carrier || 'Express'}
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">Tracking: {order.tracking_number}</span>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            {order.status}
          </span>
        </div>
      </div>

      {/* Horizontal Stepper */}
      <div className="relative pt-4 pb-2">
        {/* Background Track */}
        <div className="absolute top-8 left-6 right-6 h-1 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 z-0" />

        {/* Animated Active Progress Fill */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="absolute top-8 left-6 h-1 bg-gradient-to-r from-brand-600 via-cyan-500 to-emerald-500 -translate-y-1/2 z-0 max-w-[calc(100%-3rem)]"
        />

        {/* Milestone Steps */}
        <div className="relative z-10 flex justify-between items-start">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            const isCompleted = idx <= currentIdx;
            const isCurrent = idx === currentIdx;
            const timeStr = getTimestampFor(s.id);

            return (
              <div key={s.id} className="flex flex-col items-center text-center max-w-[80px]">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    isCurrent
                      ? 'bg-cyan-500 text-slate-950 ring-4 ring-cyan-500/20 shadow-lg shadow-cyan-500/30'
                      : isCompleted
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span
                  className={`text-xs font-semibold mt-2.5 ${
                    isCurrent
                      ? 'text-cyan-500 dark:text-cyan-400'
                      : isCompleted
                      ? 'text-slate-800 dark:text-slate-200'
                      : 'text-slate-400'
                  }`}
                >
                  {s.label}
                </span>
                {timeStr && (
                  <span className="text-[10px] text-slate-400 mt-0.5 leading-tight">{timeStr}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
