import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import ForecastDemandChart from '../../components/charts/ForecastDemandChart';
import RiskRadialGauge from '../../components/charts/RiskRadialGauge';
import WhatIfSimulator from '../../components/charts/WhatIfSimulator';
import SmartPOModal from '../../components/extensions/SmartPOModal';
import Skeleton from '../../components/ui/Skeleton';
import StatCard from '../../components/ui/StatCard';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Layers,
  ShieldCheck,
  ShoppingCart,
  Zap,
} from 'lucide-react';

export default function ClientPredictions() {
  const { storeClientId } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSku = searchParams.get('sku');

  const [inventoryList, setInventoryList] = useState([]);
  const [selectedSku, setSelectedSku] = useState(urlSku || '');
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);

  // Load Inventory to populate SKU selector
  useEffect(() => {
    async function init() {
      try {
        const inv = await api.getClientInventory();
        const items = inv.items || [];
        setInventoryList(items);

        const targetSku = urlSku || items[0]?.sku || '';
        setSelectedSku(targetSku);
      } catch (err) {
        console.error('Failed to load inventory for predictions:', err);
      }
    }
    init();
  }, [storeClientId, urlSku]);

  // Load Prediction for selected SKU
  useEffect(() => {
    if (!selectedSku) return;
    async function fetchPrediction() {
      setLoading(true);
      try {
        const data = await api.predictRestock({ sku: selectedSku });
        setPrediction(data);
      } catch (err) {
        console.error('Failed to fetch prediction:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPrediction();
  }, [selectedSku]);

  const handleSkuChange = (sku) => {
    setSelectedSku(sku);
    setSearchParams({ sku });
  };

  const currentItem = inventoryList.find((i) => i.sku === selectedSku);

  return (
    <div className="space-y-6">
      {/* Top Banner & SKU Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-800/80 border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl sm:text-2xl font-black font-display text-white">
              Restock Demand Forecast
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Demand forecasting and safety stock recommendations for your inventory.
          </p>
        </div>

        {/* SKU Selector Dropdown & Order CTA */}
        <div className="flex items-center gap-3">
          <select
            value={selectedSku}
            onChange={(e) => handleSkuChange(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-slate-800/90 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 font-mono"
          >
            {inventoryList.map((i) => (
              <option key={i.sku} value={i.sku}>
                {i.sku} - {i.product_name} ({i.stock_level} in stock)
              </option>
            ))}
          </select>

          <button
            onClick={() => setIsPoModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-md shadow-cyan-500/20 shrink-0"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Create PO</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton variant="card" height="110px" />
            <Skeleton variant="card" height="110px" />
            <Skeleton variant="card" height="110px" />
            <Skeleton variant="card" height="110px" />
          </div>
          <Skeleton variant="chart" height="380px" />
        </div>
      ) : (
        <>
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="7-Day Demand Forecast"
              value={`${Math.round(prediction?.forecast_7d || 0)} units`}
              subtitle={`Velocity: ${(prediction?.daily_velocity || 0).toFixed(1)} units/day`}
              icon={TrendingUp}
              color="cyan"
            />

            <StatCard
              title="Days to Stockout"
              value={`${prediction?.days_to_stockout || 0} Days`}
              subtitle={`Est. date: ${prediction?.projected_stockout_date || 'N/A'}`}
              icon={Calendar}
              color={
                prediction?.risk_level === 'Critical'
                  ? 'rose'
                  : prediction?.risk_level === 'High'
                  ? 'amber'
                  : 'emerald'
              }
            />

            <StatCard
              title="Safety Stock Buffer"
              value={`${prediction?.safety_stock || 0} units`}
              subtitle="Recommended buffer"
              icon={ShieldCheck}
              color="emerald"
            />

            <StatCard
              title="Recommended Restock"
              value={`${prediction?.recommended_qty || 0} units`}
              subtitle={`Current stock: ${prediction?.current_stock || 0} units`}
              icon={ShoppingCart}
              color="brand"
            />
          </div>

          {/* Main Visualizations: Forecast Chart & Radial Risk Gauge */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ForecastDemandChart prediction={prediction} />
            </div>
            <div>
              <RiskRadialGauge
                riskLevel={prediction?.risk_level || 'Low'}
                daysRemaining={prediction?.days_to_stockout || 30}
                title="Stockout Risk Level"
              />
            </div>
          </div>

          {/* What-If Restock Simulator */}
          <WhatIfSimulator
            sku={selectedSku}
            basePrice={currentItem?.unit_price || 149.99}
            baseLeadTime={currentItem?.lead_time_days || 7}
            onPredictionUpdated={(newPred) => setPrediction(newPred)}
            onOpenOrderModal={() => setIsPoModalOpen(true)}
          />

          {/* Smart Purchase Order Modal */}
          {currentItem && (
            <SmartPOModal
              isOpen={isPoModalOpen}
              onClose={() => setIsPoModalOpen(false)}
              product={currentItem}
              recommendedQty={prediction?.recommended_qty || 50}
              onOrderCreated={(po) => {
                console.log('PO created successfully:', po);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
