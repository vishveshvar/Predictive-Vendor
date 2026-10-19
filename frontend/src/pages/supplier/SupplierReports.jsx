import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  FileSpreadsheet,
  FileText,
  FileCode,
  Download,
  Calendar,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Activity,
  Loader2,
  AlertCircle,
  Building2,
} from 'lucide-react';

export default function SupplierReports() {
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('2026-08-01');
  const [dateTo, setDateTo] = useState('2026-09-30');
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadStores() {
      try {
        const clients = await api.getSupplierClients();
        setStores(clients || []);
      } catch (err) {
        console.error('Failed to load stores for reports:', err);
      }
    }
    loadStores();
  }, []);

  const handleDownload = async (exportFormat) => {
    setDownloading(true);
    setMessage(null);
    setError(null);

    const storeParam = selectedStore === 'ALL' ? null : selectedStore;

    try {
      const blob = await api.exportReport(exportFormat, dateFrom, dateTo, storeParam);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = exportFormat === 'pdf' ? 'pdf' : exportFormat === 'xlsx' ? 'xlsx' : 'csv';
      const storeLabel = selectedStore === 'ALL' ? 'NETWORK_WIDE' : selectedStore;
      a.download = `Wholesale_Report_${storeLabel}_${dateFrom}_to_${dateTo}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setMessage(`Successfully downloaded ${exportFormat.toUpperCase()} report.`);
    } catch (err) {
      console.error('Download error:', err);
      setError(err?.message || `Failed to export ${exportFormat.toUpperCase()} report.`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-800/80 border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-brand-400" />
            <h1 className="text-xl sm:text-2xl font-black font-display text-white">
              Network Reports & Export
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Generate reports across all client stores or filter by specific store locations.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-brand-400">
          <ShieldCheck className="w-4 h-4 text-brand-400" />
          <span>All Stores Access</span>
        </div>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Export Parameters */}
      <div className="glass-panel p-5">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
          Report Scope & Date Range
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mb-6">
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">
              Store Scope
            </label>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800/80 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Network Stores (8 Flagships)</option>
              {stores.map((s) => (
                <option key={s.store_client_id} value={s.store_client_id}>
                  {s.store_client_id} - {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800/80 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">
              End Date
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800/80 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>
        </div>

        {/* 3 Report Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* PDF Card */}
          <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/80 hover:border-brand-500/50 transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-4">
                <FileText className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">
                Executive Summary (PDF)
              </h4>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Includes network sales trends, shipment tracking details, and top store volume rankings.
              </p>
            </div>
            <button
              onClick={() => handleDownload('pdf')}
              disabled={downloading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>Download PDF</span>
            </button>
          </div>

          {/* Excel XLSX Card */}
          <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/80 hover:border-brand-500/50 transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">
                Financial Workbook (Excel)
              </h4>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Includes separate sheets for store summaries, transactions, and inventory risk profiles.
              </p>
            </div>
            <button
              onClick={() => handleDownload('xlsx')}
              disabled={downloading}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>Download XLSX</span>
            </button>
          </div>

          {/* CSV Card */}
          <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/80 hover:border-brand-500/50 transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4">
                <FileCode className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">
                Network Transactions (CSV)
              </h4>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Complete transactional record export with store identifiers, categories, and tracking codes.
              </p>
            </div>
            <button
              onClick={() => handleDownload('csv')}
              disabled={downloading}
              className="w-full py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>Download CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Engine Architecture */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h4 className="text-sm font-bold text-white">
              Analytics Engine: Connected
            </h4>
          </div>
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            Status: Active
          </span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          The platform serves live analytics directly from MongoDB with automatic store-level access control.
        </p>
      </div>
    </div>
  );
}
