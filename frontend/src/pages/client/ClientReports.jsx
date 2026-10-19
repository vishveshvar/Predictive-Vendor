import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
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
} from 'lucide-react';

export default function ClientReports() {
  const { storeClientId } = useAuth();

  const [format, setFormat] = useState('pdf');
  const [dateFrom, setDateFrom] = useState('2026-08-01');
  const [dateTo, setDateTo] = useState('2026-09-30');
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleDownload = async (exportFormat) => {
    const targetFormat = exportFormat || format;
    setDownloading(true);
    setMessage(null);
    setError(null);

    try {
      const blob = await api.exportReport(targetFormat, dateFrom, dateTo, storeClientId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = targetFormat === 'pdf' ? 'pdf' : targetFormat === 'xlsx' ? 'xlsx' : 'csv';
      a.download = `Procurement_Report_${storeClientId}_${dateFrom}_to_${dateTo}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setMessage(`Successfully generated and downloaded ${targetFormat.toUpperCase()} report.`);
    } catch (err) {
      console.error('Download error:', err);
      setError(err?.message || `Failed to export ${targetFormat.toUpperCase()} report.`);
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
            <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl sm:text-2xl font-black font-display text-white">
              Reports & Exports
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Download performance reports in PDF, Excel, and CSV format for store {storeClientId}.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-cyan-400">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>Secure Store Export</span>
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

      {/* Date Filter & Options */}
      <div className="glass-panel p-5">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
          Date Range
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mb-6">
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
          <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/80 hover:border-cyan-500/50 transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-4">
                <FileText className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">
                Summary Report (PDF)
              </h4>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Includes sales performance, product margins, and inventory health metrics.
              </p>
            </div>
            <button
              onClick={() => handleDownload('pdf')}
              disabled={downloading}
              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>Download PDF</span>
            </button>
          </div>

          {/* Excel XLSX Card */}
          <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/80 hover:border-cyan-500/50 transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">
                Detailed Data (Excel)
              </h4>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Includes financial summaries, order histories, and restock risk lists.
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
          <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/80 hover:border-cyan-500/50 transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4">
                <FileCode className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">
                Raw Data (CSV)
              </h4>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Export raw records for spreadsheets or external accounting tools.
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
          Real-time analytics are processed and updated dynamically directly from your store database.
        </p>

        <div className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
          <span className="font-semibold text-cyan-400">Data Security:</span> Store-level access control enforced. Each store can only view its own transactions and inventory.
        </div>
      </div>
    </div>
  );
}
