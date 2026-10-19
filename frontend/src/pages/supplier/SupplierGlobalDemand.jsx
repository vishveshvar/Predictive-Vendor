import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import InventoryHeatmap from '../../components/charts/InventoryHeatmap';
import Skeleton from '../../components/ui/Skeleton';
import {
  Globe2,
  TrendingUp,
  Boxes,
  PieChart,
  BarChart3,
  MapPin,
  Sparkles,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart as RechartsPie,
  Pie,
} from 'recharts';

export default function SupplierGlobalDemand() {
  const [demandData, setDemandData] = useState(null);
  const [heatmapData, setHeatmapData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDemand() {
      try {
        const [demRes, heatRes] = await Promise.all([
          api.getSupplierDemandAggregate(),
          api.getInventoryHeatmap(),
        ]);
        setDemandData(demRes);
        setHeatmapData(heatRes);
      } catch (err) {
        console.error('Failed to load global demand:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDemand();
  }, []);

  const regionColors = ['#0284c7', '#06b6d4', '#10b981', '#6366f1'];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-800/80 border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-brand-400" />
            <h1 className="text-xl sm:text-2xl font-black font-display text-white">
              Demand Forecast & Inventory Distribution
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Network demand forecasting, category sales velocity, and inventory distribution.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton variant="chart" height="300px" />
            <Skeleton variant="chart" height="300px" />
          </div>
          <Skeleton variant="chart" height="380px" />
        </div>
      ) : (
        <>
          {/* Top Charts: Category Demand & Regional Share */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Demand Bar Chart */}
            <div className="glass-panel p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  <span>Demand by Product Category</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Total fulfillment volume and revenue generated across all stores
                </p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={demandData?.categories || []}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
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
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      width={100}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 shadow-xl text-xs space-y-1">
                            <p className="font-bold text-white">{d.category}</p>
                            <p className="text-cyan-400 font-mono">
                              Revenue: ${d.revenue?.toLocaleString()}
                            </p>
                            <p className="text-slate-400 font-mono">
                              Units Sold: {d.units?.toLocaleString()}
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="revenue" fill="#06b6d4" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Regional Demand Distribution */}
            <div className="glass-panel p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-brand-400" />
                  <span>Regional Demand Distribution</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Gross wholesale demand by territory (West, East, South, North)
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={demandData?.regions || []}
                        dataKey="revenue"
                        nameKey="region"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                      >
                        {(demandData?.regions || []).map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={regionColors[index % regionColors.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs">
                              <p className="font-bold text-white">{d.region} Region</p>
                              <p className="text-cyan-400 font-mono">
                                ${d.revenue?.toLocaleString()} ({d.units?.toLocaleString()} units)
                              </p>
                            </div>
                          );
                        }}
                      />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2">
                  {(demandData?.regions || []).map((r, i) => (
                    <div
                      key={r.region}
                      className="p-2 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: regionColors[i % regionColors.length] }}
                        />
                        <span className="font-semibold text-slate-300">
                          {r.region} Region
                        </span>
                      </div>
                      <span className="font-mono font-bold text-white">
                        ${r.revenue.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Heatmap Matrix */}
          <InventoryHeatmap matrixData={heatmapData} />
        </>
      )}
    </div>
  );
}
