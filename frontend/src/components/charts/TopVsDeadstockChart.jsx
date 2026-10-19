import React, { useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { TrendingUp, AlertTriangle } from 'lucide-react';

export default function TopVsDeadstockChart({ topItems = [], deadstockItems = [] }) {
  const [mode, setMode] = useState('top'); // 'top' or 'deadstock'

  const defaultTop = [
    { name: 'AeroBuds ANC Ultra', metric: 233176, label: 'Units Sold', color: '#0284c7' },
    { name: 'Apex Pulse Pro Watch', metric: 116818, label: 'Units Sold', color: '#0ea5e9' },
    { name: 'HyperVolt 100W GaN', metric: 210498, label: 'Units Sold', color: '#06b6d4' },
    { name: 'TactilePro RGB 75%', metric: 69254, label: 'Units Sold', color: '#38bdf8' },
    { name: 'MegaPack 25,000mAh', metric: 145342, label: 'Units Sold', color: '#7dd3fc' },
  ];

  const defaultDeadstock = [
    { name: 'Micro-USB Car Mount 2018', metric: 4200, label: 'Capital Tied ($)', color: '#f43f5e' },
    { name: 'Retro 30-Pin Legacy Dock', metric: 3500, label: 'Capital Tied ($)', color: '#fb7185' },
    { name: 'ClearView 720p Webcam Gen1', metric: 2800, label: 'Capital Tied ($)', color: '#fda4af' },
    { name: 'Mini-DisplayPort Dongle', metric: 1950, label: 'Capital Tied ($)', color: '#fecdd3' },
  ];

  const isTop = mode === 'top';
  const data = isTop
    ? topItems.length > 0 ? topItems : defaultTop
    : deadstockItems.length > 0 ? deadstockItems : defaultDeadstock;

  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            {isTop ? (
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            )}
            <span>{isTop ? 'Top Velocity Electronics' : 'Deadstock & Stagnant Inventory'}</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isTop
              ? 'Ranked highest-demand catalog products.'
              : 'Sluggish velocity items causing carrying cost drag.'}
          </p>
        </div>

        {/* Mode Toggle Switch */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setMode('top')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              isTop
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            Top Performers
          </button>
          <button
            onClick={() => setMode('deadstock')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              !isTop
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            Deadstock Items
          </button>
        </div>
      </div>

      <div className="h-64 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickFormatter={(v) => (isTop ? `${(v / 1000).toFixed(0)}k` : `$${v}`)}
            />
            <YAxis
              type="category"
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#64748b' }}
              width={140}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="glass-panel p-2.5 shadow-xl border border-slate-200 dark:border-slate-700 text-xs">
                    <p className="font-bold text-slate-900 dark:text-white mb-1">{d.name}</p>
                    <p className="text-slate-500">
                      {d.label || (isTop ? 'Total Units' : 'Tied Capital')}:{' '}
                      <span className="font-bold text-cyan-400">
                        {isTop ? d.metric.toLocaleString() : `$${d.metric.toLocaleString()}`}
                      </span>
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="metric" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || (isTop ? '#0284c7' : '#f43f5e')}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
