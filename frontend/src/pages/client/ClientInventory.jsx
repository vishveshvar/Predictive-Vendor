import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import {
  Boxes,
  Search,
  Filter,
  AlertTriangle,
  Sparkles,
  ArrowUpDown,
  CheckCircle2,
  DollarSign,
  TrendingDown,
  RefreshCw,
} from 'lucide-react';

export default function ClientInventory() {
  const { storeClientId } = useAuth();
  const navigate = useNavigate();

  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const loadInventory = async () => {
    try {
      const data = await api.getClientInventory();
      setInventory(data);
    } catch (err) {
      console.error('Failed to load client inventory:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, [storeClientId]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadInventory();
  };

  const categories = Array.from(
    new Set((inventory?.items || []).map((i) => i.product_category))
  ).filter(Boolean);

  const filteredItems = (inventory?.items || []).filter((item) => {
    const matchesSearch =
      item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === 'ALL' || item.product_category === categoryFilter;
    const matchesRisk =
      riskFilter === 'ALL' || item.risk_level === riskFilter;
    return matchesSearch && matchesCategory && matchesRisk;
  });

  const totalCapital = (inventory?.items || []).reduce(
    (sum, i) => sum + i.stock_level * i.unit_cost,
    0
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-800/80 border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl sm:text-2xl font-black font-display text-white">
              Inventory Management
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Stock levels, days of supply, and restock risk for store {storeClientId}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
            Total SKUs
          </span>
          <div className="text-xl font-extrabold text-white">
            {inventory?.total_skus || 0}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
            Critical Stock (&le;7d)
          </span>
          <div className="text-xl font-extrabold text-rose-500">
            {inventory?.critical_count || 0} SKUs
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
            Low Stock (&le;10d)
          </span>
          <div className="text-xl font-extrabold text-amber-500">
            {inventory?.high_risk_count || 0} SKUs
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
            Inventory Value
          </span>
          <div className="text-xl font-extrabold text-cyan-400">
            ${Math.round(totalCapital).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by product name or SKU..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-slate-800/80 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Risk Level Filter */}
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-slate-800/80 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="Critical">Critical (&le; Lead Time)</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low (Healthy)</option>
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="glass-panel p-5 overflow-x-auto">
        {loading ? (
          <Skeleton variant="card" height="300px" />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            title="No inventory records matched"
            description="Try changing your search query or relaxing filter conditions."
          />
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                <th className="pb-3">SKU & Product</th>
                <th className="pb-3">Category</th>
                <th className="pb-3 text-right">In Stock</th>
                <th className="pb-3 text-right">Reorder Pt</th>
                <th className="pb-3 text-right">Lead Time</th>
                <th className="pb-3 text-right">Days Cover</th>
                <th className="pb-3 text-center">Risk Level</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredItems.map((item) => (
                <tr
                  key={item.sku}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3 pr-4">
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {item.product_name}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      {item.sku} &bull; ${item.unit_price} MSRP
                    </div>
                  </td>
                  <td className="py-3 text-slate-600 dark:text-slate-300">
                    {item.product_category}
                  </td>
                  <td className="py-3 text-right font-bold text-slate-900 dark:text-white">
                    {item.stock_level}
                  </td>
                  <td className="py-3 text-right font-mono text-slate-500">
                    {item.reorder_point}
                  </td>
                  <td className="py-3 text-right font-mono text-slate-500">
                    {item.lead_time_days}d
                  </td>
                  <td className="py-3 text-right">
                    <span
                      className={`font-mono font-bold ${
                        item.days_stock_cover <= item.lead_time_days
                          ? 'text-rose-500'
                          : item.days_stock_cover <= item.lead_time_days + 3
                          ? 'text-amber-500'
                          : 'text-emerald-500'
                      }`}
                    >
                      {item.days_stock_cover}d
                    </span>
                  </td>
                  <td className="py-3 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase inline-block ${
                        item.risk_level === 'Critical'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          : item.risk_level === 'High'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : item.risk_level === 'Medium'
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {item.risk_level}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => navigate(`/client/predictions?sku=${item.sku}`)}
                      className="px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[11px] transition-colors inline-flex items-center gap-1 shadow-sm"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Forecast</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
