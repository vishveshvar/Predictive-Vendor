import React, { useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { AlertOctagon, TrendingDown } from 'lucide-react';

export default function LossRootCauseChart({ lossData = [] }) {
  const [activeIndex, setActiveIndex] = useState(null);

  const defaultData = [
    { name: 'Theft / Shrinkage', value: 34, impact: 12450, color: '#f43f5e' },
    { name: 'Dead-on-Arrival', value: 24, impact: 8900, color: '#f97316' },
    { name: 'Manufacturer Defect', value: 20, impact: 7400, color: '#eab308' },
    { name: 'Transit Damage', value: 15, impact: 5800, color: '#06b6d4' },
    { name: 'Expired Promotion', value: 7, impact: 2100, color: '#8b5cf6' },
  ];

  const chartData = lossData.length > 0 ? lossData : defaultData;
  const totalImpact = chartData.reduce((acc, curr) => acc + (curr.impact || curr.value * 250), 0);

  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-rose-500" />
            <span>Loss & Defect Distribution</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Breakdown of write-offs, damages, and returns driving inventory shrinkage.
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase font-bold text-slate-400">Total Loss Impact</span>
          <p className="text-sm font-extrabold text-rose-500">${totalImpact.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        {/* Donut Pie Chart */}
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="glass-panel p-2.5 shadow-xl border border-slate-200 dark:border-slate-700 text-xs">
                      <p className="font-bold text-slate-900 dark:text-white">{d.name}</p>
                      <p className="text-slate-500">Incident Share: <span className="font-semibold text-rose-500">{d.value}%</span></p>
                      <p className="text-slate-500">Estimated Cost: <span className="font-semibold text-amber-500">${(d.impact || d.value * 250).toLocaleString()}</span></p>
                    </div>
                  );
                }}
              />
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color || ['#f43f5e', '#f97316', '#eab308', '#06b6d4', '#8b5cf6'][index % 5]}
                    opacity={activeIndex === null || activeIndex === index ? 1 : 0.4}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Breakdown List */}
        <div className="space-y-2.5">
          {chartData.map((item, idx) => (
            <div
              key={idx}
              className={`p-2 rounded-lg border transition-all ${
                activeIndex === idx
                  ? 'border-cyan-500/50 bg-cyan-500/10'
                  : 'border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40'
              }`}
            >
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: item.color || '#06b6d4' }}
                  />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{item.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900 dark:text-white mr-2">{item.value}%</span>
                  <span className="text-[11px] text-slate-400">
                    ${(item.impact || item.value * 250).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
