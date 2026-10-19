import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import {
  RotateCcw,
  Plus,
  AlertOctagon,
  CheckCircle2,
  Clock,
  Send,
  Loader2,
  FileText,
  AlertTriangle,
} from 'lucide-react';

export default function ClientRMA() {
  const { storeClientId } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Form State
  const [orderId, setOrderId] = useState('');
  const [sku, setSku] = useState('');
  const [defectType, setDefectType] = useState('Transit Damage');
  const [quantity, setQuantity] = useState(1);
  const [description, setDescription] = useState('');

  const loadData = async () => {
    try {
      const [rmaRes, ordRes, invRes] = await Promise.all([
        api.listRMATickets(),
        api.getClientOrders(),
        api.getClientInventory(),
      ]);
      setTickets(Array.isArray(rmaRes) ? rmaRes : (rmaRes?.tickets || []));
      const ords = Array.isArray(ordRes) ? ordRes : (ordRes?.orders || []);
      setOrders(ords);
      if (ords.length > 0 && !orderId) setOrderId(ords[0].order_id);

      const items = Array.isArray(invRes) ? invRes : (invRes?.items || []);
      setInventory(items);
      if (items.length > 0 && !sku) setSku(items[0].sku);
    } catch (err) {
      console.error('Failed to load RMA data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [storeClientId]);

  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMsg('Please enter a description for the return request.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.createRMATicket({
        order_id: orderId,
        sku: sku,
        defect_type: defectType,
        quantity: parseInt(quantity, 10),
        description: description.trim(),
      });
      setSuccessMsg(`Return request ${res.ticket?.ticket_id || ''} submitted successfully. Your supplier has been notified.`);
      setDescription('');
      loadData();
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to submit return request.');
    } finally {
      setSubmitting(false);
    }
  };

  const stageOrder = ['OPEN', 'IN_REVIEW', 'APPROVED', 'REPLACED_OR_REFUNDED', 'CLOSED'];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-800/80 border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl sm:text-2xl font-black font-display text-white">
              Returns & Claims (RMA)
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage return requests, defect claims, and replacement status for store {storeClientId}.
          </p>
        </div>

        <div className="text-xs font-mono px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-300">
          Active Claims: {tickets.filter((t) => t.status !== 'CLOSED').length} Open
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form: File New Grievance */}
        <div className="glass-panel p-5 space-y-4">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-cyan-400" />
              <span>Submit Return Request</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Submit damaged, defective, or incorrect items for supplier replacement or credit
            </p>
          </div>

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmitTicket} className="space-y-3.5">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Associated Order
              </label>
              <select
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800/80 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 font-mono"
              >
                {orders.map((o) => (
                  <option key={o.order_id} value={o.order_id}>
                    {o.order_id} ({o.carrier} - {o.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Affected SKU
              </label>
              <select
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800/80 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 font-mono"
              >
                {inventory.map((i) => (
                  <option key={i.sku} value={i.sku}>
                    {i.sku} - {i.product_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Reason Code
                </label>
                <select
                  value={defectType}
                  onChange={(e) => setDefectType(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800/80 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="Transit Damage">Transit Damage</option>
                  <option value="Manufacturer Defect">Manufacturer Defect</option>
                  <option value="Dead-on-Arrival">Dead-on-Arrival</option>
                  <option value="Theft/Shrinkage">Theft/Shrinkage</option>
                  <option value="Expired Promotion">Expired Promotion</option>
                  <option value="Incorrect Specification">Incorrect Specification</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800/80 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Description & Details
              </label>
              <textarea
                rows="3"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue, defect, or unboxing condition..."
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Request...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Request</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right 2 Columns: Grievance History List */}
        <div className="lg:col-span-2 glass-panel p-5 space-y-4">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>Return Requests & History</span>
            </h3>
            <span className="text-xs text-slate-400">
              {tickets.length} total requests
            </span>
          </div>

          {loading ? (
            <Skeleton variant="card" height="300px" />
          ) : tickets.length === 0 ? (
            <EmptyState
              title="No return requests found"
              description="No return claims or defective items reported yet."
            />
          ) : (
            <div className="space-y-3">
              {tickets.map((t) => {
                const stepIdx = stageOrder.indexOf(t.status);
                return (
                  <div
                    key={t.ticket_id}
                    className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {t.ticket_id}
                        </span>
                        <span className="text-slate-400 text-xs">&bull;</span>
                        <span className="text-xs font-semibold text-cyan-400">
                          {t.sku}
                        </span>
                        <span className="text-slate-400 text-xs">&bull;</span>
                        <span className="text-xs text-slate-300">
                          Qty: {t.quantity}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider self-start sm:self-auto ${
                          t.status === 'CLOSED'
                            ? 'bg-slate-700 text-slate-300'
                            : t.status === 'APPROVED' || t.status === 'REPLACED_OR_REFUNDED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
                        Reason: {t.reason}
                      </span>
                      <p>{t.description || 'No description provided'}</p>
                    </div>

                    {/* Stage Progress Bar */}
                    <div className="pt-1">
                      <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                        <span>Open</span>
                        <span>In Review</span>
                        <span>Approved</span>
                        <span>Replaced / Refunded</span>
                        <span>Closed</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-cyan-500 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.max(10, ((stepIdx + 1) / stageOrder.length) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
