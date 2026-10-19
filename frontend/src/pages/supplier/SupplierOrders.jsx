import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import {
  Package,
  Plus,
  QrCode,
  Search,
  Truck,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Loader2,
  X,
  Send,
  AlertCircle,
} from 'lucide-react';

export default function SupplierOrders() {
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Create Order Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [storeId, setStoreId] = useState('STORE-001');
  const [carrier, setCarrier] = useState('FedEx Priority Express');
  const [sku, setSku] = useState('SKU-1001');
  const [quantity, setQuantity] = useState(100);
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // QR Modal State
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedQR, setSelectedQR] = useState(null);
  const [loadingQR, setLoadingQR] = useState(false);

  // Status Update State
  const [updatingId, setUpdatingId] = useState(null);

  const loadData = async () => {
    try {
      const [ordRes, cliRes] = await Promise.all([
        api.listOrders(),
        api.getSupplierClients(),
      ]);
      setOrders(Array.isArray(ordRes) ? ordRes : (ordRes?.orders || []));
      setClients(Array.isArray(cliRes) ? cliRes : (cliRes?.clients || []));
    } catch (err) {
      console.error('Failed to load supplier orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    try {
      setSubmittingOrder(true);
      const qty = parseInt(quantity, 10);
      await api.dispatchOrder({
        store_client_id: storeId,
        carrier,
        sku,
        quantity: qty,
        items: [{ sku, name: sku, quantity: qty, unit_cost: 65.0, total: qty * 65.0 }],
      });
      setIsCreateOpen(false);
      loadData();
    } catch (err) {
      console.error('Failed to dispatch order:', err);
      alert(err?.message || 'Failed to dispatch order');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      await api.updateOrderStatus(orderId, {
        status: newStatus,
        location: 'Central Logistics Terminal',
        notes: `Advanced to ${newStatus} by Wholesale Dispatch`,
      });
      loadData();
    } catch (err) {
      console.error('Failed to update status:', err);
      alert(err?.message || 'Failed to update order status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleViewQR = async (order) => {
    setLoadingQR(true);
    setQrModalOpen(true);
    try {
      const res = await api.getOrderQR(order.order_id);
      setSelectedQR(res);
    } catch (err) {
      console.error('Failed to load QR:', err);
    } finally {
      setLoadingQR(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const hashStr = (o.tracking_hash || o.qr_tracking_hash || '');
    return (
      (o.order_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.store_client_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      hashStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.carrier || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-800/80 border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-brand-400" />
            <h1 className="text-xl sm:text-2xl font-black font-display text-white">
              Orders & Fulfillment
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Create orders, generate tracking codes, and manage carrier status.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-md shadow-brand-500/20"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create Order</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="glass-panel p-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by order ID, store, tracking code, or carrier..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="glass-panel p-5 overflow-x-auto">
        {loading ? (
          <Skeleton variant="card" height="300px" />
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            title="No orders found"
            description="Create your first wholesale order using the button above."
          />
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                <th className="pb-3">Order ID & Date</th>
                <th className="pb-3">Destination Store</th>
                <th className="pb-3">Carrier</th>
                <th className="pb-3 text-right">Units</th>
                <th className="pb-3 text-center">Status</th>
                <th className="pb-3 text-center">Status Action</th>
                <th className="pb-3 text-right">QR Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredOrders.map((ord) => (
                <tr key={ord.order_id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 font-semibold text-white font-mono">
                    <div>{ord.order_id}</div>
                    <div className="text-[10px] text-slate-400 font-sans">
                      {new Date(ord.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="py-3 text-slate-300 font-mono">
                    {ord.store_client_id}
                  </td>
                  <td className="py-3 text-slate-400">
                    <div>{ord.carrier}</div>
                    <div className="text-[10px] font-mono text-slate-500">
                      {ord.tracking_number}
                    </div>
                  </td>
                  <td className="py-3 text-right font-bold text-white font-mono">
                    {ord.items?.reduce((s, i) => s + (i.quantity || 0), 0) || 0}
                  </td>
                  <td className="py-3 text-center">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                      {ord.status}
                    </span>
                  </td>
                  <td className="py-3 text-center">
                    <select
                      value={ord.status}
                      disabled={updatingId === ord.order_id}
                      onChange={(e) => handleStatusChange(ord.order_id, e.target.value)}
                      className="px-2 py-1 text-[11px] rounded-lg bg-slate-800 border border-slate-700 text-slate-300 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="Manufactured">Manufactured</option>
                      <option value="Dispatched">Dispatched</option>
                      <option value="In-Transit">In-Transit</option>
                      <option value="Delivered">Delivered</option>
                    </select>
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => handleViewQR(ord)}
                      className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-slate-950 font-bold text-[11px] border border-cyan-500/30 transition-all inline-flex items-center gap-1"
                    >
                      <QrCode className="w-3 h-3" />
                      <span>QR Code</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Order Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-base font-bold text-white font-display">
                Create Shipment Order
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Generate shipment tracking code and QR code.
              </p>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Destination Store
                </label>
                <select
                  value={storeId}
                  onChange={(e) => setStoreId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800/80 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 font-mono"
                >
                  {clients.map((c) => (
                    <option key={c.store_client_id} value={c.store_client_id}>
                      {c.store_client_id} - {c.name} ({c.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Logistics Carrier
                </label>
                <select
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800/80 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="FedEx Priority Express">FedEx Priority Express</option>
                  <option value="UPS Ground Dedicated">UPS Ground Dedicated</option>
                  <option value="DHL Supply Chain Freight">DHL Supply Chain Freight</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Catalog SKU
                  </label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800/80 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Batch Quantity
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="10000"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800/80 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingOrder}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-brand-500/20 disabled:opacity-50 mt-4"
              >
                {submittingOrder ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Dispatching & Hashing...</span>
                  </>
                ) : (
                  <>
                    <Truck className="w-3.5 h-3.5" />
                    <span>Dispatch Shipment</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* QR Inspector Modal */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setQrModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center">
              <h3 className="text-base font-bold text-white font-display">
                Shipment QR Code
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Scan to track shipment status.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white flex items-center justify-center">
              {loadingQR ? (
                <div className="h-48 w-48 flex items-center justify-center text-slate-900 text-xs">
                  Generating QR...
                </div>
              ) : selectedQR?.qr_image_data_uri ? (
                <img
                  src={selectedQR.qr_image_data_uri}
                  alt="Order QR Code"
                  className="w-48 h-48"
                />
              ) : (
                <div className="h-48 w-48 flex items-center justify-center text-slate-400 text-xs">
                  QR unavailable
                </div>
              )}
            </div>

            <div className="text-center space-y-2">
              <div className="text-xs font-mono text-cyan-400 font-bold">
                {selectedQR?.qr_tracking_hash}
              </div>
              <a
                href={selectedQR?.tracking_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-brand-400 hover:text-brand-300 underline font-semibold flex items-center justify-center gap-1"
              >
                <span>Open Public Tracking Page</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
