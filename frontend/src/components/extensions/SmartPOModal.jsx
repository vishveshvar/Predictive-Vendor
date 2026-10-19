import React, { useState } from 'react';
import { ShoppingCart, FileText, CheckCircle2, X, Download } from 'lucide-react';
import { api } from '../../services/api';

export default function SmartPOModal({ isOpen, onClose, product, recommendedQty = 50, onOrderCreated }) {
  const [quantity, setQuantity] = useState(recommendedQty);
  const [urgency, setUrgency] = useState('High');
  const [notes, setNotes] = useState('Restock order based on low inventory forecast.');
  const [submitting, setSubmitting] = useState(false);
  const [createdPO, setCreatedPO] = useState(null);

  React.useEffect(() => {
    setQuantity(recommendedQty || 50);
    setCreatedPO(null);
  }, [recommendedQty, product, isOpen]);

  if (!isOpen || !product) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.createPurchaseOrder({
        sku: product.sku,
        quantity: parseInt(quantity, 10),
        urgency,
        notes,
      });
      setCreatedPO(res.purchase_order);
      if (onOrderCreated) onOrderCreated(res.purchase_order);
    } catch (err) {
      console.error('Failed to create purchase order:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!createdPO) return;
    try {
      const blob = await api.downloadPurchaseOrderPDF(createdPO.po_id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PurchaseOrder_${createdPO.po_id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download PO PDF:', err);
    }
  };

  const unitCost = product.unit_cost || 55.0;
  const totalAmount = (quantity * unitCost).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md glass-panel bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Create Purchase Order
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {createdPO ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                Purchase Order {createdPO.po_id} Created
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Your purchase order has been submitted to your supplier.
              </p>
            </div>

            <div className="glass-card p-3 text-xs text-left space-y-1">
              <p className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>SKU:</span> <strong>{createdPO.sku}</strong>
              </p>
              <p className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Quantity:</span> <strong>{createdPO.quantity} units</strong>
              </p>
              <p className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Total Amount:</span> <strong className="text-cyan-400">${createdPO.total_amount?.toLocaleString()}</strong>
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleDownloadPDF}
                className="flex-1 py-2 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download PO (PDF)</span>
              </button>
              <button
                onClick={onClose}
                className="py-2 px-4 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="glass-card p-3 border-cyan-500/20 bg-cyan-500/5 text-xs space-y-1">
              <p className="font-bold text-slate-900 dark:text-white">{product.name || product.product_name}</p>
              <p className="text-slate-500 font-mono">SKU: {product.sku} &bull; Unit Cost: ${unitCost.toFixed(2)}</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Order Quantity (Units)
              </label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Shipping Priority
              </label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="Normal">Standard Delivery</option>
                <option value="High">High Priority</option>
                <option value="Urgent">Express / Expedited</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Order Notes
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-500">Estimated Total:</span>
              <span className="text-sm font-extrabold text-cyan-400">${totalAmount}</span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all"
              >
                {submitting ? 'Creating Order...' : 'Submit Purchase Order'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
