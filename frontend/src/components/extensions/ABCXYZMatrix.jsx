import React, { useState } from 'react';
import { Grid, Sparkles, HelpCircle } from 'lucide-react';

export default function ABCXYZMatrix({ matrixData }) {
  const [selectedCell, setSelectedCell] = useState('AX');

  if (!matrixData) return null;

  const { matrix_distribution = {}, items = [], total_skus } = matrixData;

  // Definitions
  const cellDescriptions = {
    AX: { title: 'High Revenue, Steady Demand', strategy: 'Automated Just-In-Time (JIT) Replenishment with minimal safety stock buffer.' },
    AY: { title: 'High Revenue, Seasonal Demand', strategy: 'Dynamic Safety Stock buffer; seasonal forecast adjustments required.' },
    AZ: { title: 'High Revenue, Volatile Demand', strategy: 'Close continuous management; make-to-order or vendor consignment recommended.' },
    BX: { title: 'Moderate Revenue, Steady Demand', strategy: 'Standard periodic inventory review; automated reorder points.' },
    BY: { title: 'Moderate Revenue, Seasonal Demand', strategy: 'Safety buffer stock; scheduled batch procurement.' },
    BZ: { title: 'Moderate Revenue, Volatile Demand', strategy: 'Buffer stock; evaluate MOQ discounts vs carrying holding cost.' },
    CX: { title: 'Low Revenue, Steady Demand', strategy: 'Consolidated bulk orders with low review frequency.' },
    CY: { title: 'Low Revenue, Seasonal Demand', strategy: 'Procure strictly during campaign spikes; reduce off-season stock.' },
    CZ: { title: 'Low Revenue, Volatile Demand', strategy: 'High carrying drag. Discontinue, trade in, or order on-demand only.' },
  };

  const rows = ['A', 'B', 'C'];
  const cols = ['X', 'Y', 'Z'];

  const getFilteredItems = (seg) => items.filter((item) => item.segment === seg);
  const activeItems = getFilteredItems(selectedCell);

  return (
    <div className="glass-panel p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Grid className="w-4 h-4 text-cyan-500" />
            <span>Inventory Priority Matrix (ABC / XYZ)</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Groups inventory by revenue and sales predictability to help you prioritize restocking.
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase font-bold text-slate-400">Catalog SKUs</span>
          <p className="text-sm font-extrabold text-cyan-400">{total_skus} Total SKUs</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* 3x3 Matrix Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold px-8">
            <span>X (Steady)</span>
            <span>Y (Seasonal)</span>
            <span>Z (Erratic)</span>
          </div>

          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row} className="flex items-center gap-2">
                <span className="w-6 text-center text-xs font-bold text-slate-400">{row}</span>
                <div className="grid grid-cols-3 gap-2 flex-1">
                  {cols.map((col) => {
                    const code = `${row}${col}`;
                    const count = matrix_distribution[code] || 0;
                    const isSelected = selectedCell === code;

                    return (
                      <button
                        key={code}
                        onClick={() => setSelectedCell(code)}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          isSelected
                            ? 'border-cyan-500 bg-cyan-500/20 text-white ring-2 ring-cyan-500/30 shadow-lg'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="font-mono text-xs font-bold block">{code}</span>
                        <span className="text-lg font-extrabold text-cyan-400 mt-1 block">
                          {count}
                        </span>
                        <span className="text-[10px] text-slate-400">SKUs</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Cell Strategy Panel */}
        <div className="glass-card p-4 border border-cyan-500/30 bg-slate-900/70 rounded-xl space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
            <div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500 text-slate-950">
                Segment {selectedCell}
              </span>
              <h4 className="text-xs font-bold text-white mt-1.5">
                {cellDescriptions[selectedCell]?.title}
              </h4>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {activeItems.length} Products
            </span>
          </div>

          <div className="text-xs text-slate-300 space-y-1">
            <span className="font-semibold text-cyan-400">Recommended Policy:</span>
            <p>{cellDescriptions[selectedCell]?.strategy}</p>
          </div>

          {/* Product Items in this cell */}
          <div className="max-h-48 overflow-y-auto divide-y divide-slate-800/80 pt-2">
            {activeItems.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">No catalog items in this quadrant.</p>
            ) : (
              activeItems.map((item, idx) => (
                <div key={idx} className="py-2 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-semibold text-slate-200 block">{item.product_name}</span>
                    <span className="text-[10px] font-mono text-slate-400">{item.sku} &bull; {item.category}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-cyan-400 block">${item.total_revenue.toLocaleString()}</span>
                    <span className="text-[10px] text-slate-400 font-mono">CV: {item.cv}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
