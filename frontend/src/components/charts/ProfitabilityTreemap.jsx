import React, { useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { DollarSign, Layers } from 'lucide-react';

export default function ProfitabilityTreemap({ categories = [] }) {
  const [selectedCat, setSelectedCat] = useState(null);

  const colors = [
    '#0284c7', '#06b6d4', '#10b981', '#6366f1',
    '#8b5cf6', '#ec4899', '#f59e0b', '#3b82f6',
    '#14b8a6', '#f43f5e', '#84cc16', '#a855f7'
  ];

  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Category Profitability & Margin Breakdown
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Click any category bar to inspect margin contributions and turnover.
          </p>
        </div>
        {selectedCat && (
          <button
            onClick={() => setSelectedCat(null)}
            className="text-xs text-brand-600 dark:text-brand-400 underline font-medium"
          >
            Clear selection
          </button>
        )}
      </div>

      <div className="h-64 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={categories} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <YAxis
              type="category"
              dataKey="category"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#64748b' }}
              width={100}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                const marginPct = d.revenue > 0 ? ((d.margin / d.revenue) * 100).toFixed(1) : 0;
                return (
                  <div className="glass-panel p-3 shadow-xl border border-slate-200 dark:border-slate-700 text-xs">
                    <p className="font-bold text-slate-900 dark:text-white mb-1">{d.category}</p>
                    <p className="text-slate-500">Gross Margin: <span className="font-bold text-emerald-500">${d.margin?.toLocaleString()}</span></p>
                    <p className="text-slate-500">Total Revenue: <span className="font-bold text-sky-500">${d.revenue?.toLocaleString()}</span></p>
                    <p className="text-slate-500">Units Sold: <span className="font-semibold text-slate-800 dark:text-slate-200">{d.units?.toLocaleString()}</span></p>
                    <p className="text-cyan-500 font-bold mt-1">Margin Yield: {marginPct}%</p>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="margin"
              radius={[0, 4, 4, 0]}
              onClick={(entry) => setSelectedCat(entry)}
              cursor="pointer"
            >
              {categories.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={selectedCat?.category === entry.category ? '#06b6d4' : colors[index % colors.length]}
                  opacity={selectedCat && selectedCat.category !== entry.category ? 0.35 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {selectedCat && (
        <div className="glass-card p-3 border-cyan-500/30 bg-cyan-500/5 text-xs flex justify-between items-center animate-in fade-in duration-150">
          <div>
            <span className="font-bold text-slate-900 dark:text-white">{selectedCat.category} Highlight</span>
            <p className="text-slate-500">Delivering ${selectedCat.margin?.toLocaleString()} margin on {selectedCat.units?.toLocaleString()} units.</p>
          </div>
          <span className="px-2.5 py-1 rounded bg-cyan-500 text-slate-950 font-bold text-[11px]">
            {((selectedCat.margin / selectedCat.revenue) * 100).toFixed(1)}% Margin
          </span>
        </div>
      )}
    </div>
  );
}
