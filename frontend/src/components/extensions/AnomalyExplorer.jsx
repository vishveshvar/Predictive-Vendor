import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, Filter, CheckCircle2 } from 'lucide-react';

export default function AnomalyExplorer({ anomalies = [] }) {
  const [filterSeverity, setFilterSeverity] = useState('ALL');

  const filtered = filterSeverity === 'ALL'
    ? anomalies
    : anomalies.filter((a) => a.severity.toUpperCase() === filterSeverity);

  const severityBadge = (sev) => {
    switch (sev) {
      case 'Critical': return 'bg-rose-500/10 text-rose-500 border-rose-500/30';
      case 'High': return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
      default: return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
    }
  };

  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-500" />
            <span>Order & Inventory Anomalies</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Automated detection of irregular order spikes, abnormal return patterns, and inventory shrinkage.
          </p>
        </div>

        {/* Severity filter pills */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                filterSeverity === sev
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400">
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3">Store</th>
              <th className="py-2.5 px-3">Product Name</th>
              <th className="py-2.5 px-3 text-center">Severity</th>
              <th className="py-2.5 px-3">Description</th>
              <th className="py-2.5 px-3 text-right">Anomaly Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-8 text-center text-slate-400">
                  No anomalies detected under '{filterSeverity}' filter.
                </td>
              </tr>
            ) : (
              filtered.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 px-3 font-mono text-slate-500">{item.date}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                    {item.store_client_id}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                    {item.product_name}
                    <span className="block text-[10px] font-mono text-slate-400">{item.sku}</span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${severityBadge(item.severity)}`}>
                      {item.severity}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                    {item.reason}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-500">
                    {item.anomaly_score}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
