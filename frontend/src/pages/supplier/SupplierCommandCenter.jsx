import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import StatCard from '../../components/ui/StatCard';
import Skeleton from '../../components/ui/Skeleton';
import GeographicShipmentMap from '../../components/charts/GeographicShipmentMap';
import SalesTrendExplorer from '../../components/charts/SalesTrendExplorer';
import {
  Globe2,
  DollarSign,
  Users,
  Truck,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Activity,
  Layers,
} from 'lucide-react';

export default function SupplierCommandCenter() {
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [clients, setClients] = useState([]);
  const [orders, setOrders] = useState([]);
  const [velocityData, setVelocityData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [sumRes, cliRes, ordRes, velRes] = await Promise.all([
        api.getSupplierSalesSummary(),
        api.getSupplierClients(),
        api.listOrders(),
        api.getVelocity(30),
      ]);
      setSummary(sumRes);
      setClients(Array.isArray(cliRes) ? cliRes : (cliRes?.clients || []));
      setOrders(Array.isArray(ordRes) ? ordRes : (ordRes?.orders || []));
      setVelocityData(velRes?.velocity || velRes?.daily_trend || sumRes?.daily_trend || []);
    } catch (err) {
      console.error('Failed to load supplier command center data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const mapStores = clients.map((c) => ({
    name: c.name,
    city: c.city,
    lat: c.lat,
    lng: c.lng,
    orders: c.order_count || 5,
  }));

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-800/80 border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-brand-400" />
            <h1 className="text-xl sm:text-2xl font-black font-display text-white">
              Supplier Dashboard
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Wholesale fulfillment, multi-store demand, and logistics overview.
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
            onClick={() => navigate('/supplier/orders')}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-md shadow-brand-500/20"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Create Order</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton variant="card" height="110px" />
            <Skeleton variant="card" height="110px" />
            <Skeleton variant="card" height="110px" />
            <Skeleton variant="card" height="110px" />
          </div>
          <Skeleton variant="chart" height="380px" />
        </div>
      ) : (
        <>
          {/* 4 KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Network Gross Revenue"
              value={`$${(summary?.total_revenue || 0).toLocaleString()}`}
              subtitle={`${summary?.margin_percentage || 0}% overall gross margin`}
              icon={DollarSign}
              color="emerald"
            />

            <StatCard
              title="Active Retail Partners"
              value={`${summary?.active_partner_stores || 8} Stores`}
              subtitle={`${summary?.total_orders_processed || 0} batches processed`}
              icon={Users}
              color="brand"
            />

            <StatCard
              title="Total Units Shipped"
              value={`${(summary?.total_units_sold || 0).toLocaleString()}`}
              subtitle="Across all catalog categories"
              icon={Truck}
              color="cyan"
            />

            <StatCard
              title="Open Returns & Claims"
              value={`${summary?.open_rma_tickets || 0} Open Claims`}
              subtitle="Awaiting review or replacement"
              icon={RotateCcw}
              color={summary?.open_rma_tickets > 0 ? 'amber' : 'emerald'}
            />
          </div>

          {/* Logistics Map */}
          <GeographicShipmentMap stores={mapStores} orders={orders} />

          {/* Network-wide Sales Trend */}
          <div className="glass-panel p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Network Sales Velocity (30 Days)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Fulfillment volume and sales across all retail client stores
                </p>
              </div>
            </div>
            <SalesTrendExplorer data={velocityData.length > 0 ? velocityData : (summary?.daily_trend || [])} storeId="NETWORK" title="Network Sales Velocity (30 Days)" />
          </div>

          {/* Retail Partners Table */}
          <div className="glass-panel p-5">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200/80 dark:border-slate-800/80">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span>Retail Stores</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Store status and total order volume
                </p>
              </div>
              <button
                onClick={() => navigate('/supplier/clients')}
                className="text-xs font-semibold text-cyan-500 hover:text-cyan-400 flex items-center gap-1"
              >
                <span>View All Stores</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                    <th className="pb-3">Store ID & Name</th>
                    <th className="pb-3">Location</th>
                    <th className="pb-3 text-right">Orders</th>
                    <th className="pb-3 text-right">Volume</th>
                    <th className="pb-3 text-right">Gross Revenue</th>
                    <th className="pb-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {clients.map((c) => (
                    <tr key={c.store_client_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 font-semibold text-slate-900 dark:text-white">
                        <div>{c.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {c.store_client_id} &bull; {c.owner_email}
                        </div>
                      </td>
                      <td className="py-3 text-slate-400">
                        {c.city}, {c.region}
                      </td>
                      <td className="py-3 text-right font-mono text-slate-300">
                        {c.order_count}
                      </td>
                      <td className="py-3 text-right font-mono text-slate-300">
                        {c.total_units.toLocaleString()} units
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-cyan-400">
                        ${c.total_revenue.toLocaleString()}
                      </td>
                      <td className="py-3 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase">
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
