import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Inbox,
  Clock,
  CheckCircle,
  RefreshCw,
  Archive,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { api } from '../../services/api';

const COLUMNS = [
  { id: 'Open', title: 'Open', icon: Inbox, color: 'text-amber-500 bg-amber-500/10' },
  { id: 'In Review', title: 'In Review', icon: Clock, color: 'text-sky-500 bg-sky-500/10' },
  { id: 'Approved', title: 'Approved', icon: CheckCircle, color: 'text-emerald-500 bg-emerald-500/10' },
  { id: 'Replaced', title: 'Replaced', icon: RefreshCw, color: 'text-cyan-500 bg-cyan-500/10' },
  { id: 'Closed', title: 'Closed', icon: Archive, color: 'text-slate-400 bg-slate-500/10' },
];

export default function RMAKanbanBoard({ tickets = [], onTicketUpdated, readOnly = false }) {
  const [localTickets, setLocalTickets] = useState(tickets);
  const [updatingId, setUpdatingId] = useState(null);

  React.useEffect(() => {
    setLocalTickets(tickets);
  }, [tickets]);

  const handleMoveStatus = async (ticketId, nextStatus) => {
    if (readOnly) return;
    setUpdatingId(ticketId);

    // Optimistic UI update
    setLocalTickets((prev) =>
      prev.map((t) => (t.ticket_id === ticketId ? { ...t, status: nextStatus } : t))
    );

    try {
      await api.updateRMATicketStatus(ticketId, {
        status: nextStatus,
        comment: `Kanban transition to [${nextStatus}] by supplier operations`,
        actor: 'Wholesale Ops Desk',
      });
      if (onTicketUpdated) onTicketUpdated();
    } catch (err) {
      console.error('Failed to update status on Kanban:', err);
      // Revert on error
      setLocalTickets(tickets);
    } finally {
      setUpdatingId(null);
    }
  };

  const defectColor = (defect) => {
    switch (defect) {
      case 'Transit Damage': return 'text-cyan-400 bg-cyan-950/60 border-cyan-800';
      case 'Dead-on-Arrival': return 'text-rose-400 bg-rose-950/60 border-rose-800';
      case 'Manufacturer Defect': return 'text-amber-400 bg-amber-950/60 border-amber-800';
      default: return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Returns & Claims Board
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {readOnly
              ? 'Track the status of your submitted return requests.'
              : 'Move return requests through review, replacement, and resolution.'}
          </p>
        </div>
      </div>

      {/* Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 overflow-x-auto pb-2">
        {COLUMNS.map((col) => {
          const colTickets = localTickets.filter((t) => t.status === col.id);
          const Icon = col.icon;

          return (
            <div
              key={col.id}
              className="glass-panel p-3 min-w-[220px] flex flex-col justify-start min-h-[380px] bg-slate-50/50 dark:bg-slate-900/40"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200/80 dark:border-slate-800/80">
                <div className="flex items-center gap-2">
                  <div className={`p-1 rounded ${col.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {col.title}
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {colTickets.length}
                </span>
              </div>

              {/* Tickets Stack */}
              <div className="space-y-2.5 flex-1">
                {colTickets.length === 0 ? (
                  <div className="h-28 flex items-center justify-center text-[11px] text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                    No requests in {col.title}
                  </div>
                ) : (
                  colTickets.map((t) => (
                    <motion.div
                      key={t.ticket_id}
                      layout
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-card p-3 space-y-2 shadow-sm border border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-800/90 rounded-lg text-left"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold text-slate-400">
                          {t.ticket_id}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${defectColor(
                            t.defect_type
                          )}`}
                        >
                          {t.defect_type}
                        </span>
                      </div>

                      <div>
                        <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug line-clamp-1">
                          {t.product_name}
                        </h5>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Order: <span className="font-mono text-cyan-500">{t.order_id}</span> &bull; {t.store_name}
                        </p>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 italic">
                        "{t.description}"
                      </p>

                      {/* Advance Stage Controls for Supplier */}
                      {!readOnly && col.id !== 'Closed' && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-700/50 flex justify-end">
                          <button
                            disabled={updatingId === t.ticket_id}
                            onClick={() => {
                              const nextMap = {
                                Open: 'In Review',
                                'In Review': 'Approved',
                                Approved: 'Replaced',
                                Replaced: 'Closed',
                              };
                              handleMoveStatus(t.ticket_id, nextMap[col.id]);
                            }}
                            className="flex items-center gap-1 text-[10px] font-bold text-brand-600 dark:text-cyan-400 hover:underline"
                          >
                            <span>Advance Stage</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
