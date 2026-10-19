import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  LayoutDashboard,
  BarChart3,
  Boxes,
  Sparkles,
  QrCode,
  RotateCcw,
  FileSpreadsheet,
  Bot,
  Zap,
  Globe2,
  Users,
  Layers,
  Cpu,
  ArrowRight,
} from 'lucide-react';

export default function CommandPalette({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const { isClient, isSupplier } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onClose ? onClose() : null;
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = isClient
    ? [
        { label: 'Dashboard', path: '/client', icon: LayoutDashboard },
        { label: 'Sales & Profitability', path: '/client/analytics', icon: BarChart3 },
        { label: 'Inventory Management', path: '/client/inventory', icon: Boxes },
        { label: 'Restock Forecasts', path: '/client/predictions', icon: Sparkles },
        { label: 'Orders & Shipments', path: '/client/orders', icon: QrCode },
        { label: 'Returns & Claims (RMA)', path: '/client/rma', icon: RotateCcw },
        { label: 'Export Reports', path: '/client/reports', icon: FileSpreadsheet },
        { label: 'Store Assistant', path: '/client/assistant', icon: Bot },
      ]
    : [
        { label: 'Supplier Dashboard', path: '/supplier', icon: LayoutDashboard },
        { label: 'Demand Forecast', path: '/supplier/demand', icon: Globe2 },
        { label: 'Stores & Clients', path: '/supplier/clients', icon: Users },
        { label: 'Orders & Fulfillment', path: '/supplier/orders', icon: QrCode },
        { label: 'Returns & Claims Board', path: '/supplier/rma', icon: RotateCcw },
        { label: 'Forecasting Models', path: '/supplier/model-studio', icon: Cpu },
        { label: 'Supply Chain Tools', path: '/supplier/extensions', icon: Layers },
        { label: 'Reports Hub', path: '/supplier/reports', icon: FileSpreadsheet },
        { label: 'Analytics Assistant', path: '/supplier/assistant', icon: Bot },
      ];

  const filtered = actions.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg glass-panel bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden rounded-2xl">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            autoFocus
            type="text"
            placeholder="Type a command or navigate..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
          />
          <kbd className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No matching commands found.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelect(item.path)}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg text-left text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-slate-800/80 dark:hover:text-cyan-400 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 group-hover:bg-brand-100 dark:group-hover:bg-slate-700 text-slate-500 group-hover:text-brand-600 dark:group-hover:text-cyan-400 transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span>{item.label}</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
