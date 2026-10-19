import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Brush,
} from 'recharts';
import { Download, Calendar, Filter } from 'lucide-react';

export default function SalesTrendExplorer({ data = [], title = 'Sales & Revenue Trend Explorer' }) {
  const [timeRange, setTimeRange] = useState('30d');
  const [metric, setMetric] = useState('revenue'); // 'revenue' or 'units' or 'margin'

  const presets = [
    { id: '7d', label: '7 Days', count: 7 },
    { id: '30d', label: '30 Days', count: 30 },
    { id: '90d', label: '90 Days', count: 90 },
    { id: 'all', label: 'All Time', count: data.length },
  ];

  const activePreset = presets.find((p) => p.id === timeRange);
  const slicedData = activePreset ? data.slice(-activePreset.count) : data;

  const handleDownloadCSV = () => {
    if (!data.length) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map((d) => Object.values(d).join(',')).join('\n');
    const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sales_Trend_${timeRange}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const metricColors = {
    revenue: { stroke: '#0284c7', fill: '#0284c7' },
    margin: { stroke: '#10b981', fill: '#10b981' },
    units: { stroke: '#06b6d4', fill: '#06b6d4' },
  };

  const currentMetric = metricColors[metric] || metricColors.revenue;

  return (
    <div className="glass-panel p-5 space-y-4">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Interactive brush zoom, hover crosshairs, and multi-period presets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Metric Selector */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            {['revenue', 'margin', 'units'].map((m) => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md capitalize transition-all ${
                  metric === m
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Date Presets */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            {presets.map((p) => (
              <button
                key={p.id}
                onClick={() => setTimeRange(p.id)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                  timeRange === p.id
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* CSV Export */}
          <button
            onClick={handleDownloadCSV}
            title="Download CSV"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={slicedData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${metric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={currentMetric.fill} stopOpacity={0.4} />
                <stop offset="95%" stopColor={currentMetric.fill} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickFormatter={(d) => (d ? d.slice(5) : '')}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickFormatter={(val) =>
                metric === 'units' ? val : `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`
              }
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="glass-panel p-3 shadow-xl border border-slate-200 dark:border-slate-700 text-xs">
                    <p className="font-bold text-slate-800 dark:text-slate-200 mb-1.5">{label}</p>
                    <div className="space-y-1">
                      <p className="flex justify-between gap-4 text-slate-600 dark:text-slate-400">
                        <span>Revenue:</span>
                        <span className="font-semibold text-sky-500">${d.revenue?.toLocaleString()}</span>
                      </p>
                      <p className="flex justify-between gap-4 text-slate-600 dark:text-slate-400">
                        <span>Gross Margin:</span>
                        <span className="font-semibold text-emerald-500">${d.margin?.toLocaleString()}</span>
                      </p>
                      <p className="flex justify-between gap-4 text-slate-600 dark:text-slate-400">
                        <span>Units Sold:</span>
                        <span className="font-semibold text-cyan-400">{d.units?.toLocaleString()}</span>
                      </p>
                    </div>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey={metric}
              stroke={currentMetric.stroke}
              strokeWidth={2.5}
              fillOpacity={1}
              fill={`url(#grad-${metric})`}
            />
            <Brush dataKey="date" height={24} stroke="#0284c7" fill="#0f172a" opacity={0.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
