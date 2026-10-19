import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import RMAKanbanBoard from '../../components/charts/RMAKanbanBoard';
import Skeleton from '../../components/ui/Skeleton';
import StatCard from '../../components/ui/StatCard';
import {
  RotateCcw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Layers,
} from 'lucide-react';

export default function SupplierRMA() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTickets = async () => {
    try {
      const res = await api.listRMATickets();
      setTickets(Array.isArray(res) ? res : (res?.tickets || []));
    } catch (err) {
      console.error('Failed to load RMA tickets:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadTickets();
  };

  const openCount = tickets.filter((t) => t.status === 'Open' || t.status === 'OPEN').length;
  const inReviewCount = tickets.filter((t) => t.status === 'In Review' || t.status === 'IN_REVIEW').length;
  const approvedCount = tickets.filter((t) => t.status === 'Approved' || t.status === 'APPROVED').length;
  const closedCount = tickets.filter((t) => t.status === 'Closed' || t.status === 'CLOSED').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-800/80 border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-brand-400" />
            <h1 className="text-xl sm:text-2xl font-black font-display text-white">
              Returns & Claims (RMA)
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage returns, defect claims, and replacement orders.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Open Claims"
          value={`${openCount} Pending`}
          subtitle="Awaiting initial review"
          icon={AlertTriangle}
          color="amber"
        />

        <StatCard
          title="In Review"
          value={`${inReviewCount} Active`}
          subtitle="Under investigation"
          icon={Clock}
          color="cyan"
        />

        <StatCard
          title="Approved"
          value={`${approvedCount} Queued`}
          subtitle="Replacements authorized"
          icon={CheckCircle2}
          color="brand"
        />

        <StatCard
          title="Resolved & Closed"
          value={`${closedCount} Claims`}
          subtitle="Fully resolved"
          icon={CheckCircle2}
          color="emerald"
        />
      </div>

      {/* Kanban Board Component */}
      {loading ? (
        <Skeleton variant="card" height="420px" />
      ) : (
        <RMAKanbanBoard tickets={tickets} onTicketUpdated={loadTickets} />
      )}
    </div>
  );
}
