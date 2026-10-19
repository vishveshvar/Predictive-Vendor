import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import SalesTrendExplorer from '../../components/charts/SalesTrendExplorer';
import ProfitabilityTreemap from '../../components/charts/ProfitabilityTreemap';
import LossRootCauseChart from '../../components/charts/LossRootCauseChart';
import TopVsDeadstockChart from '../../components/charts/TopVsDeadstockChart';
import Skeleton from '../../components/ui/Skeleton';
import {
  BarChart3,
  Calendar,
  Download,
  Filter,
  Layers,
  Sparkles,
  TrendingUp,
  DollarSign,
} from 'lucide-react';

export default function ClientAnalytics() {
  const { storeClientId } = useAuth();
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [inventory, setInventory] = useState(null);

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      try {
        const [prof, inv] = await Promise.all([
          api.getClientProfitability(days),
          api.getClientInventory(),
        ]);
        setData(prof);
        setInventory(inv);
      } catch (err) {
        console.error('Failed to load client analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, [days, storeClientId]);

  // Derive top items and deadstock items from inventory
  const topItems = inventory?.items
    ?.filter((i) => !i.is_deadstock)
    ?.slice(0, 5)
    ?.map((i) => ({
      name: i.product_name,
      metric: i.stock_level * i.unit_price,
      label: 'Inventory Value ($)',
      color: '#06b6d4',
    })) || [];

  const deadstockItems = inventory?.items
    ?.filter((i) => i.is_deadstock || i.days_stock_cover > 60)
    ?.slice(0, 5)
    ?.map((i) => ({
      name: i.product_name,
      metric: Math.round(i.stock_level * i.unit_cost),
      label: 'Carrying Cost ($)',
      color: '#f43f5e',
    })) || [];

  return (
    <div className="space-y-6">
      {/* Header with Period Presets */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-800/80 border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl sm:text-2xl font-black font-display text-white">
              Store Analytics
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Sales performance, product margins, and inventory metrics for store {storeClientId}.
          </p>
        </div>

        {/* Date presets */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-800/90 border border-slate-700/80">
          {[
            { label: '7 Days', val: 7 },
            { label: '30 Days', val: 30 },
            { label: '90 Days', val: 90 },
            { label: '365 Days', val: 365 },
          ].map((preset) => (
            <button
              key={preset.val}
              onClick={() => setDays(preset.val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                days === preset.val
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <Skeleton variant="chart" height="360px" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton variant="chart" height="300px" />
            <Skeleton variant="chart" height="300px" />
          </div>
        </div>
      ) : (
        <>
          {/* Main Sales Trend with Brush Zoom */}
          <div className="glass-panel p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Sales Trend ({days} Days)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Total Revenue: ${data?.total_revenue?.toLocaleString()} &bull; Gross Margin: {data?.margin_percentage}%
                </p>
              </div>
            </div>
            <SalesTrendExplorer data={data?.daily_trend || []} storeId={storeClientId} />
          </div>

          {/* Secondary Charts: Category Breakdown & Top vs Deadstock */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProfitabilityTreemap categories={data?.category_breakdown || []} />
            <TopVsDeadstockChart topItems={topItems} deadstockItems={deadstockItems} />
          </div>

          {/* Loss Root Cause Analysis */}
          <LossRootCauseChart />
        </>
      )}
    </div>
  );
}
