import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  BarChart3,
  Boxes,
  Sparkles,
  QrCode,
  RotateCcw,
  FileSpreadsheet,
  Bot,
  Globe2,
  Users,
  Cpu,
  Layers,
  Activity,
  Zap,
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const { isClient, isSupplier } = useAuth();

  const clientNav = [
    { name: 'Dashboard', to: '/client', icon: LayoutDashboard },
    { name: 'Analytics', to: '/client/analytics', icon: BarChart3 },
    { name: 'Inventory', to: '/client/inventory', icon: Boxes },
    { name: 'Restock Forecasts', to: '/client/predictions', icon: Sparkles },
    { name: 'Orders & Shipments', to: '/client/orders', icon: QrCode },
    { name: 'Returns & Claims', to: '/client/rma', icon: RotateCcw },
    { name: 'Reports', to: '/client/reports', icon: FileSpreadsheet },
    { name: 'Store Assistant', to: '/client/assistant', icon: Bot },
  ];

  const supplierNav = [
    { name: 'Dashboard', to: '/supplier', icon: LayoutDashboard },
    { name: 'Demand Forecast', to: '/supplier/demand', icon: Globe2 },
    { name: 'Stores & Clients', to: '/supplier/clients', icon: Users },
    { name: 'Orders & Fulfillment', to: '/supplier/orders', icon: QrCode },
    { name: 'Returns (RMA)', to: '/supplier/rma', icon: RotateCcw },
    { name: 'Forecasting Models', to: '/supplier/model-studio', icon: Cpu },
    { name: 'Supply Chain Tools', to: '/supplier/extensions', icon: Layers },
    { name: 'Reports', to: '/supplier/reports', icon: FileSpreadsheet },
    { name: 'Analytics Assistant', to: '/supplier/assistant', icon: Bot },
  ];

  const navItems = isClient ? clientNav : supplierNav;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-sm transition-opacity"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 border-r border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-[#0b1120]/95 backdrop-blur-md transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
            <Zap className="w-5 h-5 fill-white" />
          </div>
          <div>
            <h1 className="font-display font-extrabold text-base tracking-tight text-slate-900 dark:text-white leading-none">
              Predictive<span className="text-cyan-500">Vendor</span>
            </h1>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mt-0.5">
              {isClient ? 'Store Portal' : 'Supplier Portal'}
            </p>
          </div>
        </div>

        {/* Navigation List */}
        <div className="py-4 px-3 space-y-1 overflow-y-auto max-h-[calc(100vh-8rem)]">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Menu
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/client' || item.to === '/supplier'}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-sm shadow-brand-600/30'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>System Status: Operational</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
        </div>
      </aside>
    </>
  );
}
