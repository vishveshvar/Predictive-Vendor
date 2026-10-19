import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import OrderTimelineStepper from '../../components/charts/OrderTimelineStepper';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import {
  Package,
  Search,
  QrCode,
  ExternalLink,
  Truck,
  Calendar,
  CheckCircle2,
  Clock,
  ChevronRight,
  ShieldCheck,
  X,
} from 'lucide-react';

export default function ClientOrders() {
  const { storeClientId } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [loadingQr, setLoadingQr] = useState(false);

  useEffect(() => {
    async function fetchOrders() {
      try {
        const data = await api.getClientOrders();
        const ords = Array.isArray(data) ? data : (data?.orders || []);
        setOrders(ords);
        if (ords.length > 0) {
          setSelectedOrder(ords[0]);
        }
      } catch (err) {
        console.error('Failed to load client orders:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, [storeClientId]);

  const filteredOrders = orders.filter((o) => {
    const hash = (o.tracking_hash || o.qr_tracking_hash || '');
    return (
      (o.order_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      hash.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.carrier || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleViewQR = async (order) => {
    setLoadingQr(true);
    setQrModalOpen(true);
    try {
      const res = await api.getOrderQR(order.order_id);
      setQrData(res);
    } catch (err) {
      console.error('Failed to load QR:', err);
    } finally {
      setLoadingQr(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-800/80 border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl sm:text-2xl font-black font-display text-white">
              Orders & Shipments
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Track incoming shipments and delivery status for store {storeClientId}.
          </p>
        </div>

        <div className="text-xs font-mono px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-300">
          {orders.length} Incoming Orders
        </div>
      </div>

      {/* Main Grid: Orders List & Detail Stepper */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Order List */}
        <div className="glass-panel p-5 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search order ID or hash..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {loading ? (
            <Skeleton variant="card" height="240px" />
          ) : filteredOrders.length === 0 ? (
            <EmptyState
              title="No shipments found"
              description="No orders match your filter."
            />
          ) : (
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {filteredOrders.map((ord) => {
                const isSelected = selectedOrder?.order_id === ord.order_id;
                return (
                  <div
                    key={ord.order_id}
                    onClick={() => setSelectedOrder(ord)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/10 border-cyan-500/50 shadow-md shadow-cyan-500/10'
                        : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-xs font-bold text-white">
                        {ord.order_id}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                        {ord.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{ord.carrier}</span>
                      <span className="font-mono">
                        {ord.items?.reduce((s, i) => s + (i.quantity || 0), 0) || 0} units
                      </span>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-mono truncate max-w-[130px]">
                        {ord.qr_tracking_hash}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewQR(ord);
                        }}
                        className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
                      >
                        <QrCode className="w-3 h-3" />
                        <span>View QR</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 2 Columns: Order Detail & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {selectedOrder ? (
            <>
              {/* Stepper Card */}
              <OrderTimelineStepper order={selectedOrder} />

              {/* Items in Order */}
              <div className="glass-panel p-5">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/80 dark:border-slate-800/80">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Manifest & Ordered SKUs
                  </h3>
                  <a
                    href={`/track/${selectedOrder.qr_tracking_hash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    <span>Public Verification Link</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                        <th className="pb-2">SKU</th>
                        <th className="pb-2">Quantity</th>
                        <th className="pb-2 text-right">Wholesale Cost</th>
                        <th className="pb-2 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {(selectedOrder.items || []).map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/30">
                          <td className="py-2.5 font-mono text-cyan-400 font-semibold">
                            {item.sku}
                          </td>
                          <td className="py-2.5 font-bold text-white">
                            {item.quantity} units
                          </td>
                          <td className="py-2.5 text-right font-mono text-slate-400">
                            ${item.unit_cost?.toFixed(2) || '0.00'}
                          </td>
                          <td className="py-2.5 text-right font-mono font-bold text-white">
                            ${((item.quantity || 0) * (item.unit_cost || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="glass-panel p-12 text-center text-slate-400">
              Select an order on the left to inspect its timeline and manifest.
            </div>
          )}
        </div>
      </div>

      {/* QR Code Modal */}
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
                Scan to view shipment tracking.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white flex items-center justify-center">
              {loadingQr ? (
                <div className="h-48 w-48 flex items-center justify-center text-slate-900 text-xs">
                  Generating QR...
                </div>
              ) : qrData?.qr_image_data_uri ? (
                <img
                  src={qrData.qr_image_data_uri}
                  alt="Order QR Code"
                  className="w-48 h-48"
                />
              ) : (
                <div className="h-48 w-48 flex items-center justify-center text-slate-400 text-xs">
                  QR unavailable
                </div>
              )}
            </div>

            <div className="text-center space-y-1">
              <div className="text-xs font-mono text-cyan-400 font-bold">
                {qrData?.qr_tracking_hash || selectedOrder?.qr_tracking_hash}
              </div>
              <p className="text-[10px] text-slate-500">
                Tracking Code
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
