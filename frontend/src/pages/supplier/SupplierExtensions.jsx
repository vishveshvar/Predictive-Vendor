import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import SupplierRadarScorecard from '../../components/extensions/SupplierRadarScorecard';
import AnomalyExplorer from '../../components/extensions/AnomalyExplorer';
import ABCXYZMatrix from '../../components/extensions/ABCXYZMatrix';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import {
  Layers,
  Award,
  ShieldAlert,
  Grid,
  ShoppingCart,
  Download,
  CheckCircle2,
  RefreshCw,
  FileText,
} from 'lucide-react';

export default function SupplierExtensions() {
  const [activeTab, setActiveTab] = useState('scorecard'); // 'scorecard', 'anomalies', 'abcxyz', 'pos'
  const [scorecard, setScorecard] = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [abcMatrix, setAbcMatrix] = useState(null);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [scoreRes, anomRes, abcRes, poRes] = await Promise.all([
        api.getSupplierScorecard(),
        api.getAnomalies(),
        api.getABCXYZMatrix(),
        api.listPurchaseOrders(),
      ]);
      setScorecard(scoreRes);
      setAnomalies(anomRes.anomalies || []);
      setAbcMatrix(abcRes);
      setPurchaseOrders(Array.isArray(poRes) ? poRes : (poRes?.purchase_orders || []));
    } catch (err) {
      console.error('Failed to load extensions data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDownloadPO = async (poId) => {
    try {
      const blob = await api.downloadPurchaseOrderPDF(poId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PurchaseOrder_${poId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download PO PDF:', err);
      alert('Could not download PO PDF.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-800/80 border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl sm:text-2xl font-black font-display text-white">
              Supply Chain Analytics & Tools
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Performance scorecard, order anomaly detection, inventory matrix, and purchase orders.
          </p>
        </div>

        {/* Tab Pills */}
        <div className="flex bg-slate-800/90 p-1 rounded-xl border border-slate-700 overflow-x-auto">
          {[
            { id: 'scorecard', label: 'Scorecard', icon: Award },
            { id: 'anomalies', label: 'Order Anomalies', icon: ShieldAlert },
            { id: 'abcxyz', label: 'Inventory Matrix', icon: Grid },
            { id: 'pos', label: 'Purchase Orders', icon: ShoppingCart },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <Skeleton variant="card" height="380px" />
      ) : (
        <>
          {/* Tab 1: Radar Scorecard */}
          {activeTab === 'scorecard' && (
            <SupplierRadarScorecard scorecardData={scorecard} />
          )}

          {/* Tab 2: Anomaly Explorer */}
          {activeTab === 'anomalies' && (
            <AnomalyExplorer anomalies={anomalies} />
          )}

          {/* Tab 3: ABC / XYZ Matrix */}
          {activeTab === 'abcxyz' && (
            <ABCXYZMatrix matrixData={abcMatrix} />
          )}

          {/* Tab 4: Smart PO Queue */}
          {activeTab === 'pos' && (
            <div className="glass-panel p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800/80">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-cyan-400" />
                    <span>Inbound Purchase Orders</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Purchase orders submitted by retail stores for restocking.
                  </p>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {purchaseOrders.length} Total Orders
                </span>
              </div>

              {purchaseOrders.length === 0 ? (
                <EmptyState
                  title="No purchase orders found"
                  description="When retail stores submit restock purchase orders, they will appear here for fulfillment."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                        <th className="pb-3">PO Number</th>
                        <th className="pb-3">Store ID</th>
                        <th className="pb-3">SKU</th>
                        <th className="pb-3 text-right">Units</th>
                        <th className="pb-3 text-center">Urgency</th>
                        <th className="pb-3 text-center">Status</th>
                        <th className="pb-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                      {purchaseOrders.map((po) => (
                        <tr key={po.po_id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 font-semibold text-white">
                            {po.po_id}
                          </td>
                          <td className="py-3 text-cyan-400">
                            {po.store_client_id}
                          </td>
                          <td className="py-3 text-slate-300">
                            {po.sku}
                          </td>
                          <td className="py-3 text-right font-bold text-white">
                            {po.quantity}
                          </td>
                          <td className="py-3 text-center font-sans">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                po.urgency === 'Critical'
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {po.urgency}
                            </span>
                          </td>
                          <td className="py-3 text-center font-sans">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              {po.status}
                            </span>
                          </td>
                          <td className="py-3 text-right font-sans">
                            <button
                              onClick={() => handleDownloadPO(po.po_id)}
                              className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-slate-950 font-bold text-[11px] border border-cyan-500/30 transition-all inline-flex items-center gap-1"
                            >
                              <Download className="w-3 h-3" />
                              <span>Download PDF</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
