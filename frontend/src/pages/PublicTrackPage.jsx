import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import OrderTimelineStepper from '../components/charts/OrderTimelineStepper';
import {
  ShieldCheck,
  Search,
  Truck,
  Package,
  Calendar,
  MapPin,
  ArrowLeft,
  AlertCircle,
  Loader2,
  Lock,
  Boxes,
  Zap,
} from 'lucide-react';

export default function PublicTrackPage() {
  const { hash } = useParams();
  const navigate = useNavigate();

  const [searchHash, setSearchHash] = useState(hash || '');
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (hash) {
      fetchTracking(hash);
    }
  }, [hash]);

  const fetchTracking = async (h) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.trackOrderPublic(h.trim().toUpperCase());
      setTrackingData(data);
    } catch (err) {
      setError(err?.message || 'Shipment not found or tracking hash is invalid.');
      setTrackingData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const cleanHash = searchHash.trim().toUpperCase();
    if (cleanHash) {
      navigate(`/track/${cleanHash}`);
      fetchTracking(cleanHash);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 py-10 px-4 sm:px-6 relative overflow-x-hidden selection:bg-cyan-500 selection:text-black">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-80 bg-gradient-to-b from-cyan-500/10 to-transparent blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="max-w-4xl mx-auto flex items-center justify-between mb-8 relative z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-brand-600 to-cyan-400 flex items-center justify-center text-white shadow-sm">
            <Zap className="w-4 h-4 fill-white" />
          </div>
          <span className="font-display font-black text-sm text-white">
            Predictive<span className="text-cyan-400">Vendor</span>
          </span>
          <span className="text-[10px] uppercase font-bold text-slate-400 ml-1">
            Tracking Portal
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-6 relative z-10">
        {/* Search Bar */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={searchHash}
                onChange={(e) => setSearchHash(e.target.value)}
                placeholder="Enter 16-character tracking number..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono transition-colors uppercase"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors shrink-0 disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Track</span>}
            </button>
          </form>

          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>Enter your tracking ID to view shipment status.</span>
            <span>
              Sample tracking ID:{' '}
              <button
                type="button"
                onClick={() => {
                  setSearchHash('FD997AA5485839BD');
                  navigate('/track/FD997AA5485839BD');
                }}
                className="text-cyan-400 underline font-mono hover:text-cyan-300"
              >
                FD997AA5485839BD
              </button>
            </span>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            <p className="text-xs">Looking up shipment tracking details...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold">Tracking Number Not Found</h4>
              <p className="text-xs mt-1 text-rose-300/80">{error}</p>
              <p className="text-[11px] text-slate-400 mt-3">
                Check that you entered the full 16-character tracking number from your shipping label.
              </p>
            </div>
          </div>
        )}

        {/* Verified Tracking View */}
        {trackingData && !loading && (
          <div className="space-y-6">
            {/* Verification Badge */}
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Shipment Verified
                  </h4>
                  <p className="text-[11px] text-emerald-300">
                    Verified by Supplier Gateway
                  </p>
                </div>
              </div>
              <span className="font-mono text-xs text-emerald-400 px-2.5 py-1 rounded bg-emerald-950/60 border border-emerald-800">
                TRACKING ID: {(hash || searchHash || trackingData?.tracking_hash || trackingData?.qr_tracking_hash || '').toUpperCase()}
              </span>
            </div>

            {/* Stepper Card */}
            <OrderTimelineStepper order={trackingData} />

            {/* Shipment Attributes Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Order Reference
                </span>
                <div className="text-base font-extrabold text-white font-mono">
                  {trackingData.order_id}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Carrier & Tracking #
                </span>
                <div className="text-xs font-bold text-cyan-400">
                  {trackingData.carrier}
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {trackingData.tracking_number}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Total Units
                </span>
                <div className="text-base font-extrabold text-white flex items-center gap-1.5">
                  <Boxes className="w-4 h-4 text-cyan-400" />
                  <span>{trackingData.item_count} items</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Last Movement
                </span>
                <div className="text-xs font-semibold text-slate-200">
                  {trackingData.last_updated
                    ? new Date(trackingData.last_updated).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Recent'}
                </div>
              </div>
            </div>

            {/* Logistics Route Information */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Transit Route
              </h4>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                  <MapPin className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">
                      Origin Dispatch Hub
                    </div>
                    <div className="text-xs font-semibold text-white mt-0.5">
                      {trackingData.origin}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                  <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">
                      Destination Facility
                    </div>
                    <div className="text-xs font-semibold text-white mt-0.5">
                      {trackingData.destination}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy Redaction Notice */}
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-center gap-3 text-xs text-slate-400">
              <Lock className="w-4 h-4 text-slate-500 shrink-0" />
              <span>
                <strong className="text-slate-300">Privacy Notice:</strong> Pricing and client store details are hidden on public tracking pages.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
