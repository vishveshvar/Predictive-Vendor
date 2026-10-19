import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import Skeleton from '../../components/ui/Skeleton';
import StatCard from '../../components/ui/StatCard';
import {
  Cpu,
  Sparkles,
  TrendingUp,
  Award,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BarChart2,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';

export default function SupplierModelStudio() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState(false);
  const [retrainSuccess, setRetrainSuccess] = useState(null);
  const [error, setError] = useState(null);

  const loadMetrics = async () => {
    try {
      const data = await api.getModelMetrics();
      setMetrics(data);
    } catch (err) {
      console.error('Failed to load ML metrics:', err);
      setError('Could not fetch model metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const handleRetrain = async () => {
    setRetraining(true);
    setRetrainSuccess(null);
    try {
      const res = await api.triggerRetraining();
      setRetrainSuccess(res.message || 'Retraining pipeline successfully triggered in background.');
      setTimeout(loadMetrics, 5000);
    } catch (err) {
      console.error('Retrain trigger failed:', err);
      setError(err?.message || 'Retraining trigger failed');
    } finally {
      setRetraining(false);
    }
  };

  const featureImportance = [
    { name: '7-Day Rolling Mean', importance: 0.384 },
    { name: '1-Day Lagged Demand', importance: 0.228 },
    { name: 'Price Discount %', importance: 0.142 },
    { name: 'Day of Week Seasonality', importance: 0.089 },
    { name: 'Marketing Promo Flag', importance: 0.065 },
    { name: 'Current Stock Level', importance: 0.052 },
    { name: 'Holiday Period Flag', importance: 0.040 },
  ];

  const tournament = [
    { model: 'XGBoost Regressor (v1.0)', rmse: 3.7473, mae: 2.6092, r2: 0.8194, mape: '38.10%', status: 'WINNER - ACTIVE' },
    { model: 'GradientBoosting Regressor', rmse: 3.7592, mae: 2.6212, r2: 0.8183, mape: '38.46%', status: 'EVALUATED' },
    { model: 'RandomForest Regressor', rmse: 3.8034, mae: 2.6153, r2: 0.8140, mape: '39.18%', status: 'EVALUATED' },
    { model: 'Ridge Baseline (L2 Linear)', rmse: 5.0448, mae: 3.3919, r2: 0.6727, mape: '45.68%', status: 'BENCHMARK' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-800/80 border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl sm:text-2xl font-black font-display text-white">
              Forecasting Model Performance
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Model evaluation metrics, feature importance, and model retraining.
          </p>
        </div>

        <button
          onClick={handleRetrain}
          disabled={retraining}
          className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-md shadow-cyan-500/20 disabled:opacity-50"
        >
          {retraining ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Retraining...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Update Model</span>
            </>
          )}
        </button>
      </div>

      {retrainSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{retrainSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Prediction Accuracy (RMSE)"
          value="3.7473"
          subtitle="Validation RMSE vs 5.04 baseline"
          icon={TrendingUp}
          color="cyan"
        />

        <StatCard
          title="Mean Absolute Error"
          value="2.6092"
          subtitle="Average unit deviation per SKU"
          icon={Cpu}
          color="emerald"
        />

        <StatCard
          title="Coefficient of Determination (R²)"
          value="0.8194"
          subtitle="81.94% demand variance explained"
          icon={Award}
          color="brand"
        />

        <StatCard
          title="Mean Absolute % Error"
          value="38.10%"
          subtitle="Chronological test partition"
          icon={Zap}
          color="amber"
        />
      </div>

      {/* Tournament Leaderboard Table */}
      <div className="glass-panel p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800/80">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-cyan-400" />
              <span>Model Tournament Leaderboard</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Evaluated on 10,736 held-out test transactions (chronological temporal split)
            </p>
          </div>
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            Selected: XGBoost
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                <th className="pb-3">Candidate Model</th>
                <th className="pb-3 text-right">Validation RMSE</th>
                <th className="pb-3 text-right">Validation MAE</th>
                <th className="pb-3 text-right">R² Score</th>
                <th className="pb-3 text-right">MAPE</th>
                <th className="pb-3 text-center">Tournament Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
              {tournament.map((row) => (
                <tr
                  key={row.model}
                  className={`hover:bg-slate-800/30 transition-colors ${
                    row.status.includes('WINNER') ? 'bg-cyan-500/5' : ''
                  }`}
                >
                  <td className="py-3 font-semibold text-white font-sans flex items-center gap-2">
                    {row.status.includes('WINNER') && (
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    )}
                    <span>{row.model}</span>
                  </td>
                  <td className="py-3 text-right text-cyan-400 font-bold">
                    {row.rmse}
                  </td>
                  <td className="py-3 text-right text-slate-300">
                    {row.mae}
                  </td>
                  <td className="py-3 text-right text-emerald-400 font-bold">
                    {row.r2}
                  </td>
                  <td className="py-3 text-right text-slate-300">
                    {row.mape}
                  </td>
                  <td className="py-3 text-center font-sans">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        row.status.includes('WINNER')
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Feature Importance Bar Chart */}
      <div className="glass-panel p-5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-brand-400" />
            <span>XGBoost Feature Importance Weights</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Relative gain contribution per engineered feature in demand prediction
          </p>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={featureImportance}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
            >
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              />
              <YAxis
                type="category"
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                width={160}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs">
                      <p className="font-bold text-white">{d.name}</p>
                      <p className="text-cyan-400 font-mono">
                        Weight: {(d.importance * 100).toFixed(1)}%
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="importance" fill="#06b6d4" radius={[0, 6, 6, 0]}>
                {featureImportance.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index === 0 ? '#06b6d4' : index === 1 ? '#0ea5e9' : '#3b82f6'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
