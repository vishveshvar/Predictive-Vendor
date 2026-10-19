import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { AlertCircle, Calendar, Sparkles, ShieldCheck } from 'lucide-react';

export default function ForecastDemandChart({ prediction }) {
  if (!prediction) return null;

  const {
    product_name,
    sku,
    forecast_7d,
    forecast_14d,
    forecast_30d,
    daily_velocity,
    days_to_stockout,
    projected_stockout_date,
    risk_level,
    safety_stock,
    recommended_qty,
    daily_forecast = [],
    historical_trajectory = [],
  } = prediction;

  // Merge history and future forecast into continuous timeline
  const chartPoints = [];

  // 1. Add historical points
  historical_trajectory.forEach((h) => {
    chartPoints.push({
      date: h.date,
      type: 'Historical',
      actual: h.units_sold,
      forecast: null,
      lower: null,
      upper: null,
      stock: h.stock_level,
    });
  });

  // 2. Add future prediction points
  daily_forecast.forEach((f) => {
    chartPoints.push({
      date: f.date,
      type: 'Forecast',
      actual: null,
      forecast: f.predicted_demand,
      lower: f.demand_lower,
      upper: f.demand_upper,
      stock: f.projected_stock,
    });
  });

  const riskBadgeStyles = {
    Critical: 'bg-rose-500/10 text-rose-500 border-rose-500/30',
    High: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
    Medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
    Low: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  };

  return (
    <div className="glass-panel p-5 space-y-4">
      {/* Title & Key Highlights */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {product_name} <span className="font-mono text-xs text-slate-400">({sku})</span>
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Projected demand and inventory depletion timeline.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full border ${
              riskBadgeStyles[risk_level] || riskBadgeStyles.Low
            }`}
          >
            {risk_level} Stockout Risk
          </span>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="glass-card p-3">
          <span className="text-[10px] uppercase font-bold text-slate-400">7-Day Forecast</span>
          <p className="text-lg font-extrabold text-slate-900 dark:text-white mt-1">
            {forecast_7d} <span className="text-xs font-normal text-slate-400">units</span>
          </p>
        </div>
        <div className="glass-card p-3">
          <span className="text-[10px] uppercase font-bold text-slate-400">30-Day Demand</span>
          <p className="text-lg font-extrabold text-slate-900 dark:text-white mt-1">
            {forecast_30d} <span className="text-xs font-normal text-slate-400">units</span>
          </p>
        </div>
        <div className="glass-card p-3">
          <span className="text-[10px] uppercase font-bold text-slate-400">Daily Velocity</span>
          <p className="text-lg font-extrabold text-cyan-500 mt-1">
            {daily_velocity} <span className="text-xs font-normal text-slate-400">/day</span>
          </p>
        </div>
        <div className="glass-card p-3">
          <span className="text-[10px] uppercase font-bold text-slate-400">Days to Stockout</span>
          <p
            className={`text-lg font-extrabold mt-1 ${
              days_to_stockout <= 7 ? 'text-rose-500' : 'text-slate-900 dark:text-white'
            }`}
          >
            {days_to_stockout} <span className="text-xs font-normal text-slate-400">days</span>
          </p>
        </div>
        <div className="glass-card p-3 border-brand-500/30 bg-brand-500/5">
          <span className="text-[10px] uppercase font-bold text-brand-600 dark:text-brand-400">
            Recommended Order
          </span>
          <p className="text-lg font-extrabold text-brand-600 dark:text-brand-400 mt-1">
            {recommended_qty} <span className="text-xs font-normal">units</span>
          </p>
        </div>
      </div>

      {/* Main Forecast Chart */}
      <div className="h-80 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartPoints} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="confidenceBand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickFormatter={(d) => (d ? d.slice(5) : '')}
            />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="glass-panel p-3 shadow-xl border border-slate-200 dark:border-slate-700 text-xs">
                    <p className="font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center justify-between gap-4">
                      <span>{label}</span>
                      <span className="text-[10px] font-normal text-slate-400">({d.type})</span>
                    </p>
                    <div className="space-y-1">
                      {d.actual !== null && (
                        <p className="flex justify-between gap-4 text-slate-600 dark:text-slate-400">
                          <span>Actual Sold:</span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {d.actual} units
                          </span>
                        </p>
                      )}
                      {d.forecast !== null && (
                        <>
                          <p className="flex justify-between gap-4 text-slate-600 dark:text-slate-400">
                            <span>Predicted Demand:</span>
                            <span className="font-semibold text-cyan-400">{d.forecast} units</span>
                          </p>
                          <p className="flex justify-between gap-4 text-slate-400 text-[11px]">
                            <span>95% Confidence Band:</span>
                            <span>
                              [{d.lower} – {d.upper}]
                            </span>
                          </p>
                        </>
                      )}
                      <p className="flex justify-between gap-4 text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-1 mt-1">
                        <span>Projected On-Hand:</span>
                        <span className="font-semibold text-amber-500">{d.stock} units</span>
                      </p>
                    </div>
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />

            {/* Confidence Interval Upper/Lower Area */}
            <Area
              name="Confidence Band"
              dataKey="upper"
              stroke="none"
              fill="url(#confidenceBand)"
              isAnimationActive={false}
            />

            {/* Historical Sales Line */}
            <Line
              name="Historical Actuals"
              type="monotone"
              dataKey="actual"
              stroke="#64748b"
              strokeWidth={2}
              dot={{ r: 3 }}
            />

            {/* ML Demand Forecast Line */}
            <Line
              name="ML Forecast Demand"
              type="monotone"
              dataKey="forecast"
              stroke="#06b6d4"
              strokeWidth={2.5}
              strokeDasharray="4 4"
              dot={{ r: 3.5, fill: '#06b6d4' }}
            />

            {/* Projected Stock Depletion Curve */}
            <Line
              name="Projected Stock Level"
              type="stepAfter"
              dataKey="stock"
              stroke="#f59e0b"
              strokeWidth={1.5}
              dot={false}
            />

            {/* Stockout Date Pin Marker */}
            {projected_stockout_date && (
              <ReferenceLine
                x={projected_stockout_date}
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="3 3"
                label={{
                  value: 'Stockout Zero',
                  fill: '#ef4444',
                  fontSize: 10,
                  position: 'top',
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
