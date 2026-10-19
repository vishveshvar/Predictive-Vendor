import React, { useState } from 'react';
import { Boxes, X, AlertTriangle, ShieldCheck, ChevronRight } from 'lucide-react';

export default function InventoryHeatmap({ matrixData, onSelectProduct = null }) {
  const [selectedCell, setSelectedCell] = useState(null);

  if (!matrixData || !matrixData.stores || !matrixData.categories) {
    return null;
  }

  const { stores, categories, cells } = matrixData;

  const getCellFor = (storeId, cat) => {
    return cells.find((c) => c.store_client_id === storeId && c.category === cat) || {
      avg_stock: 0,
      days_cover: 0,
      status: 'critical',
    };
  };

  const getStatusColor = (daysCover) => {
    if (daysCover <= 7) return 'bg-rose-500/20 text-rose-500 border-rose-500/30 hover:bg-rose-500/30';
    if (daysCover <= 14) return 'bg-amber-500/20 text-amber-500 border-amber-500/30 hover:bg-amber-500/30';
    return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30';
  };

  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Store × Category Inventory Health Matrix
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Heatmap colored by days of stock cover. Click any cell to inspect stockout risk.
          </p>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-rose-500" />
            <span className="text-slate-500 dark:text-slate-400">Critical (&le; 7d)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-amber-500" />
            <span className="text-slate-500 dark:text-slate-400">Warning (&le; 14d)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
            <span className="text-slate-500 dark:text-slate-400">Healthy (&gt; 14d)</span>
          </span>
        </div>
      </div>

      {/* Grid Container */}
      <div className="overflow-x-auto pb-2">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr>
              <th className="p-2 text-[11px] font-bold uppercase text-slate-400 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 sticky left-0 z-20">
                Partner Store
              </th>
              {categories.slice(0, 10).map((cat) => (
                <th
                  key={cat}
                  className="p-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-center"
                >
                  {cat.split(' ')[0]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stores.map((s) => (
              <tr key={s.store_client_id} className="border-b border-slate-100 dark:border-slate-800/60">
                <td className="p-2 text-xs font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap bg-white/50 dark:bg-slate-900/50 sticky left-0 z-10">
                  {s.name.split(' ')[0]} {s.name.split(' ')[1]}
                  <span className="block text-[10px] font-mono text-slate-400">{s.city}</span>
                </td>
                {categories.slice(0, 10).map((cat) => {
                  const cell = getCellFor(s.store_client_id, cat);
                  return (
                    <td key={cat} className="p-1.5 text-center">
                      <button
                        onClick={() => setSelectedCell({ ...cell, store: s, category: cat })}
                        className={`w-full py-1.5 px-1 rounded border text-xs font-bold transition-all transform active:scale-95 ${getStatusColor(
                          cell.days_cover
                        )}`}
                      >
                        {cell.days_cover}d
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Selected Cell Modal/Drawer Detail */}
      {selectedCell && (
        <div className="glass-card p-4 border-cyan-500/40 bg-slate-900/90 shadow-2xl rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">
                {selectedCell.store?.name} &bull; {selectedCell.category}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                  selectedCell.days_cover <= 7
                    ? 'bg-rose-500/20 text-rose-400'
                    : selectedCell.days_cover <= 14
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-emerald-500/20 text-emerald-400'
                }`}
              >
                {selectedCell.days_cover <= 7 ? 'Critical Risk' : selectedCell.days_cover <= 14 ? 'Low Buffer' : 'Optimal'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Average On-Hand Stock: <strong>{selectedCell.avg_stock} units</strong> | Days of Stock Cover:{' '}
              <strong className="text-cyan-400">{selectedCell.days_cover} days</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedCell(null)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              Dismiss
            </button>
            {onSelectProduct && (
              <button
                onClick={() => onSelectProduct(selectedCell)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center gap-1 shadow-sm transition-colors"
              >
                <span>View Products</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
