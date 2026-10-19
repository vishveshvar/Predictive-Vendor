import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import StatCard from '../../components/ui/StatCard';
import Skeleton from '../../components/ui/Skeleton';
import SalesTrendExplorer from '../../components/charts/SalesTrendExplorer';
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Package,
  RotateCcw,
  Sparkles,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

export default function ClientDashboard() {
  const { user, storeClientId } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [profitability, setProfitability] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [orders, setOrders] = useState([]);
  const [rmas, setRmas] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [profData, invData, ordData, rmaData] = await Promise.all([
        api.getClientProfitability(30),
        api.getClientInventory(),
        api.getClientOrders(),
        api.listRMATickets(),
      ]);
      setProfitability(profData);
      setInventory(invData);
      setOrders(ordData.orders || []);
      setRmas(rmaData.tickets || []);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [storeClientId]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton variant="card" height="100px" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton variant="card" height="110px" />
          <Skeleton variant="card" height="110px" />
          <Skeleton variant="card" height="110px" />
          <Skeleton variant="card" height="110px" />
        </div>
        <Skeleton variant="chart" height="340px" />
      </div>
    );
  }

  const criticalItems = (inventory?.items || []).filter(
    (i) => i.risk_level === 'Critical' || i.risk_level === 'High'
  ).slice(0, 5);

  const inTransitOrders = orders.filter(
    (o) => o.status === 'In-Transit' || o.status === 'Dispatched'
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-800/80 border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black font-display text-white">
              Store Dashboard
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-bold font-mono rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              {storeClientId}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Store performance, inventory alerts, and order status.
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
          <button
            onClick={() => navigate('/client/predictions')}
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Restock Forecast</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="30-Day Gross Revenue"
          value={`$${(profitability?.total_revenue || 0).toLocaleString()}`}
          subtitle={`${(profitability?.units_sold || 0).toLocaleString()} units sold`}
          icon={DollarSign}
          color="emerald"
        />

        <StatCard
          title="Gross Profit Margin"
          value={`${profitability?.margin_percentage || 0}%`}
          subtitle={`$${(profitability?.gross_margin || 0).toLocaleString()} gross profit`}
          icon={TrendingUp}
          color="cyan"
        />

        <StatCard
          title="Stockout Risk Level"
          value={`${inventory?.critical_count || 0} Critical`}
          subtitle={`${inventory?.high_risk_count || 0} high-risk SKUs`}
          icon={AlertTriangle}
          color={inventory?.critical_count > 0 ? 'rose' : 'amber'}
        />

        <StatCard
          title="Active Restocks"
          value={`${inTransitOrders.length} In-Transit`}
          subtitle={`${orders.length} total orders placed`}
          icon={Package}
          color="brand"
        />
      </div>

      {/* Main Chart: Sales & Profit Trend */}
      <div className="glass-panel p-5">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            30-Day Sales & Profit Margin
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Revenue and profit performance for store {storeClientId}
          </p>
        </div>
        <SalesTrendExplorer
          data={profitability?.daily_trend || []}
          storeId={storeClientId}
        />
      </div>

      {/* Bottom Grid: Urgency Watchlist & Active Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Urgency Watchlist */}
        <div className="lg:col-span-2 glass-panel p-5">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200/80 dark:border-slate-800/80">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                <span>Low Stock Alerts</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Products nearing safety stock threshold
              </p>
            </div>
            <Link
              to="/client/inventory"
              className="text-xs font-semibold text-cyan-500 hover:text-cyan-400 flex items-center gap-1"
            >
              <span>View All ({inventory?.total_skus || 0})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                  <th className="pb-2.5">SKU & Product</th>
                  <th className="pb-2.5">Stock</th>
                  <th className="pb-2.5">Days Cover</th>
                  <th className="pb-2.5">Risk Status</th>
                  <th className="pb-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {criticalItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      No low stock items currently detected. All inventory is healthy.
                    </td>
                  </tr>
                ) : (
                  criticalItems.map((item) => (
                    <tr key={item.sku} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 pr-3">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {item.product_name}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {item.sku} &bull; {item.product_category}
                        </div>
                      </td>
                      <td className="py-3 font-semibold text-slate-800 dark:text-slate-200">
                        {item.stock_level} units
                      </td>
                      <td className="py-3">
                        <span className="font-mono font-semibold text-amber-500">
                          {item.days_stock_cover}d
                        </span>
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            item.risk_level === 'Critical'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {item.risk_level}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => navigate(`/client/predictions?sku=${item.sku}`)}
                          className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-slate-950 font-bold text-[11px] border border-cyan-500/30 transition-all inline-flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Forecast</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Recent Orders & Grievances */}
        <div className="space-y-6">
          {/* Active Shipments Card */}
          <div className="glass-panel p-5">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/80 dark:border-slate-800/80">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-cyan-500" />
                <span>Recent Shipments</span>
              </h3>
              <Link
                to="/client/orders"
                className="text-xs font-semibold text-cyan-500 hover:text-cyan-400"
              >
                View Orders
              </Link>
            </div>

            <div className="space-y-3">
              {orders.slice(0, 3).map((ord) => (
                <div
                  key={ord.order_id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-white font-mono">
                      {ord.order_id}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {ord.carrier} &bull; {ord.items?.length || 1} SKUs
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                    {ord.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Grievance Status */}
          <div className="glass-panel p-5">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/80 dark:border-slate-800/80">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-500" />
                <span>Returns & Claims</span>
              </h3>
              <Link
                to="/client/rma"
                className="text-xs font-semibold text-cyan-500 hover:text-cyan-400"
              >
                View Claims
              </Link>
            </div>

            <div className="space-y-2">
              {rmas.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">
                  No active return claims on file.
                </p>
              ) : (
                rmas.slice(0, 3).map((t) => (
                  <div
                    key={t.ticket_id}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-white font-mono">
                        {t.ticket_id}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {t.sku} &bull; {t.reason}
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-amber-400">
                      {t.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
