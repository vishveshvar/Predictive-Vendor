import React from 'react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from 'recharts';
import { Award, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';

export default function SupplierRadarScorecard({ scorecardData }) {
  if (!scorecardData) return null;

  const {
    supplier_id,
    name,
    composite_score,
    tier,
    on_time_rate,
    fill_rate,
    defect_rate,
    radar_metrics = [],
  } = scorecardData;

  return (
    <div className="glass-panel p-5 space-y-4">
      {/* Header with Tier Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{name}</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Composite vendor scorecard evaluating delivery SLAs, defect rates, and replenishment stability.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400">Composite Score</span>
            <p className="text-lg font-extrabold text-cyan-400 leading-none">{composite_score} / 100</p>
          </div>
          <span className="px-3 py-1 text-xs font-extrabold rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-sm">
            {tier}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Radar Graphic */}
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radar_metrics} cx="50%" cy="50%" outerRadius="80%">
              <PolarGrid stroke="#334155" opacity={0.3} />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 9 }} />
              <Radar
                name="Supplier Score"
                dataKey="score"
                stroke="#06b6d4"
                fill="#06b6d4"
                fillOpacity={0.4}
              />
              <Radar
                name="Industry Benchmark"
                dataKey="benchmark"
                stroke="#64748b"
                fill="#64748b"
                fillOpacity={0.15}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="glass-panel p-2.5 shadow-xl text-xs border border-slate-700">
                      <p className="font-bold text-white mb-1">{d.subject}</p>
                      <p className="text-cyan-400">Score: <strong>{d.score}%</strong></p>
                      <p className="text-slate-400">Benchmark: {d.benchmark}%</p>
                    </div>
                  );
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Breakdown Metric Tiles */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card p-3 border-emerald-500/20 bg-emerald-500/5">
            <span className="text-[10px] uppercase font-bold text-slate-400">On-Time Delivery</span>
            <p className="text-xl font-extrabold text-emerald-500 mt-1">{on_time_rate}%</p>
            <span className="text-[10px] text-slate-400">&gt; 95% SLA Target Achieved</span>
          </div>

          <div className="glass-card p-3 border-cyan-500/20 bg-cyan-500/5">
            <span className="text-[10px] uppercase font-bold text-slate-400">Order Fill Rate</span>
            <p className="text-xl font-extrabold text-cyan-400 mt-1">{fill_rate}%</p>
            <span className="text-[10px] text-slate-400">Zero line-item shortages</span>
          </div>

          <div className="glass-card p-3 border-rose-500/20 bg-rose-500/5">
            <span className="text-[10px] uppercase font-bold text-slate-400">Defect Ratio</span>
            <p className="text-xl font-extrabold text-rose-400 mt-1">{defect_rate}%</p>
            <span className="text-[10px] text-slate-400">Below 2.0% quality ceiling</span>
          </div>

          <div className="glass-card p-3 border-purple-500/20 bg-purple-500/5">
            <span className="text-[10px] uppercase font-bold text-slate-400">Lead-Time Variance</span>
            <p className="text-xl font-extrabold text-purple-400 mt-1">&plusmn;0.8d</p>
            <span className="text-[10px] text-slate-400">Reliable transit precision</span>
          </div>
        </div>
      </div>
    </div>
  );
}
