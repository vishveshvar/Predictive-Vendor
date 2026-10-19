import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import {
  Users,
  Search,
  MapPin,
  Mail,
  DollarSign,
  Package,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

export default function SupplierClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadClients() {
      try {
        const data = await api.getSupplierClients();
        setClients(data || []);
      } catch (err) {
        console.error('Failed to load supplier clients:', err);
      } finally {
        setLoading(false);
      }
    }
    loadClients();
  }, []);

  const filteredClients = clients.filter((c) => {
    return (
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.store_client_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.region.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-800/80 border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-400" />
            <h1 className="text-xl sm:text-2xl font-black font-display text-white">
              Retail Stores
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Connected retail stores, order fulfillment volume, and return claim history.
          </p>
        </div>

        <div className="text-xs font-mono px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-300">
          {clients.length} Active Stores
        </div>
      </div>

      {/* Search Bar */}
      <div className="glass-panel p-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by store name, ID, city, or region..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Clients Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="card" height="220px" />
          ))}
        </div>
      ) : filteredClients.length === 0 ? (
        <EmptyState
          title="No partner stores match your search"
          description="Try modifying search keywords or clearing the filter."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((store) => (
            <div
              key={store.store_client_id}
              className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4 group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-base font-bold text-white font-display group-hover:text-cyan-400 transition-colors">
                      {store.name}
                    </h3>
                    <div className="text-xs font-mono text-cyan-400 mt-0.5">
                      {store.store_client_id}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shrink-0">
                    {store.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      {store.city}, {store.region} ({store.lat.toFixed(2)}, {store.lng.toFixed(2)})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span className="font-mono text-slate-300">{store.owner_email}</span>
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800 text-center">
                <div className="p-2 rounded-xl bg-slate-800/40">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Revenue
                  </span>
                  <span className="text-xs font-bold text-emerald-400 font-mono">
                    ${(store.total_revenue / 1000).toFixed(0)}k
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-slate-800/40">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Orders
                  </span>
                  <span className="text-xs font-bold text-white font-mono">
                    {store.order_count}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-slate-800/40">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    RMAs
                  </span>
                  <span className="text-xs font-bold text-amber-400 font-mono">
                    {store.rma_count}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
