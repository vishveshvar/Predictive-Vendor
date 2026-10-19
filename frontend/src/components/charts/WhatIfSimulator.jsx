import React, { useState, useEffect } from 'react';
import { Sliders, RefreshCw, ShoppingCart, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';

export default function WhatIfSimulator({
  sku,
  basePrice = 149.99,
  baseLeadTime = 7,
  onPredictionUpdated,
  onOpenOrderModal,
}) {
  const [discountPct, setDiscountPct] = useState(0);
  const [leadTimeDays, setLeadTimeDays] = useState(baseLeadTime);
  const [promoActive, setPromoActive] = useState(false);
  const [loading, setLoading] = useState(false);

  const effectivePrice = Math.max(1, +(basePrice * (1 - discountPct / 100)).toFixed(2));

  // Debounced API call when slider changes
  useEffect(() => {
    const handler = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.predictRestock({
          sku,
          price_override: effectivePrice,
          lead_time_override: leadTimeDays,
          promo_override: promoActive ? 1 : 0,
        });
        if (onPredictionUpdated) {
          onPredictionUpdated(res);
        }
      } catch (err) {
        console.error('What-If simulation failed:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(handler);
  }, [sku, discountPct, leadTimeDays, promoActive]);

  const handleReset = () => {
    setDiscountPct(0);
    setLeadTimeDays(baseLeadTime);
    setPromoActive(false);
  };

  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Restock Simulation
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {loading && (
            <span className="flex items-center gap-1.5 text-xs text-cyan-500 font-medium">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Simulating...</span>
            </span>
          )}
          <button
            onClick={handleReset}
            className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 underline"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Price Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Price Discount: {discountPct}%
            </span>
            <span className="font-mono text-cyan-500 font-bold">${effectivePrice} (base ${basePrice})</span>
          </div>
          <input
            type="range"
            min="0"
            max="40"
            step="5"
            value={discountPct}
            onChange={(e) => setDiscountPct(+e.target.value)}
            className="w-full accent-cyan-500 cursor-pointer"
          />
          <p className="text-[10px] text-slate-400">
            Lower prices typically increase customer sales demand.
          </p>
        </div>

        {/* Lead Time Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Supplier Lead Time: {leadTimeDays} days
            </span>
            <span className="font-mono text-amber-500 font-bold">
              {leadTimeDays > baseLeadTime ? `+${leadTimeDays - baseLeadTime}d delay` : 'Standard'}
            </span>
          </div>
          <input
            type="range"
            min="3"
            max="30"
            step="1"
            value={leadTimeDays}
            onChange={(e) => setLeadTimeDays(+e.target.value)}
            className="w-full accent-amber-500 cursor-pointer"
          />
          <p className="text-[10px] text-slate-400">
            Longer lead times require higher safety stock buffer.
          </p>
        </div>

        {/* Promotional Campaign Switch */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Promotional Campaign
            </p>
            <p className="text-[10px] text-slate-400">
              Simulate higher sales velocity during promotions.
            </p>
          </div>
          <button
            onClick={() => setPromoActive(!promoActive)}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
              promoActive ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                promoActive ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {onOpenOrderModal && (
        <button
          onClick={onOpenOrderModal}
          className="w-full mt-3 py-2 px-4 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Create Purchase Order</span>
        </button>
      )}
    </div>
  );
}
