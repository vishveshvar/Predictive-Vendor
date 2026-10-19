import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Zap,
  TrendingUp,
  ShieldCheck,
  QrCode,
  Sparkles,
  ArrowRight,
  Boxes,
  Activity,
  Layers,
  Search,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const [trackHash, setTrackHash] = useState('');

  // HTML5 Particle Canvas Background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particles = Array.from({ length: 55 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      radius: Math.random() * 2 + 1,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 140) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(59, 130, 246, ${0.2 * (1 - dist / 140)})`;
            ctx.lineWidth = 0.8;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(6, 182, 212, 0.7)';
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleTrackSubmit = (e) => {
    e.preventDefault();
    if (trackHash.trim()) {
      navigate(`/track/${trackHash.trim()}`);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#070b14] text-slate-100 overflow-x-hidden selection:bg-cyan-500 selection:text-black">
      {/* Background Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-0 opacity-60"
      />

      {/* Glow Orbs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navigation */}
      <header className="relative z-10 border-b border-slate-800/80 bg-[#070b14]/70 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-brand-500/25">
              <Zap className="w-5 h-5 fill-white" />
            </div>
            <div>
              <span className="font-display font-black text-lg tracking-tight text-white">
                Predictive<span className="text-cyan-400">Vendor</span>
              </span>
              <span className="ml-2 px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                Vendor Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/track/FD997AA5485839BD"
              className="text-xs font-medium text-slate-300 hover:text-white transition-colors hidden sm:block"
            >
              Order Tracking
            </Link>
            <Link
              to="/login"
              className="px-4 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-brand-600 to-cyan-500 text-white hover:from-brand-500 hover:to-cyan-400 shadow-md shadow-brand-500/20 transition-all flex items-center gap-1.5"
            >
              <span>Sign In / Demo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-28">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs font-medium text-cyan-300 mb-6 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Intelligent Restocking & Order Management</span>
          </div>

          <h1 className="font-display text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
            Stop Stockouts Before They Occur with{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-brand-400 to-indigo-400">
              Predictive Restocking
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Accurate demand forecasting, order tracking, and returns management
            connecting retail stores with wholesale suppliers.
          </p>

          {/* Quick Tracking Search */}
          <div className="mt-8 max-w-xl mx-auto">
            <form
              onSubmit={handleTrackSubmit}
              className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 shadow-2xl backdrop-blur-md focus-within:border-cyan-500 transition-colors"
            >
              <div className="pl-3 text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={trackHash}
                onChange={(e) => setTrackHash(e.target.value)}
                placeholder="Enter tracking code (e.g., FD997AA5485839BD)"
                className="flex-1 bg-transparent px-2 py-2 text-xs text-white placeholder-slate-500 focus:outline-none font-mono uppercase"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1 shrink-0"
              >
                <span>Track</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </form>
            <p className="text-[11px] text-slate-500 mt-2">
              Sample tracking code:{' '}
              <button
                type="button"
                onClick={() => setTrackHash('FD997AA5485839BD')}
                className="text-cyan-400 underline font-mono hover:text-cyan-300"
              >
                FD997AA5485839BD
              </button>
            </p>
          </div>
        </div>

        {/* Live Platform Stats */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {[
            { label: 'Transactions Processed', value: '128,480+', icon: Activity },
            { label: 'Model Accuracy (R²)', value: '0.8194', icon: Sparkles },
            { label: 'Forecast Lead Time', value: '7 / 14 / 30 Days', icon: TrendingUp },
            { label: 'Stockout Prevention', value: '91.24%', icon: ShieldCheck },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div
                key={i}
                className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm text-center"
              >
                <Icon className="w-5 h-5 text-cyan-400 mx-auto mb-2 opacity-80" />
                <div className="text-xl font-extrabold text-white font-display">
                  {stat.value}
                </div>
                <div className="text-[11px] font-medium text-slate-400 mt-0.5">
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Dual Role Portals Entrance */}
        <div className="mt-20">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white font-display">
              Choose Your Portal
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Select your portal to sign in and view your dashboard
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Retail Client Card */}
            <div className="p-8 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-cyan-500/30 hover:border-cyan-500/60 shadow-xl transition-all group flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-5 group-hover:scale-110 transition-transform">
                  <Boxes className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white font-display mb-2">
                  Store Portal
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-6">
                  Access store-level demand forecasts, safety stock alerts,
                  restocking simulators, and return requests.
                </p>

                <ul className="space-y-2 mb-8 text-xs text-slate-300">
                  {[
                    'Store-specific inventory and analytics',
                    'Recommended safety stock levels',
                    'Analytics Assistant for quick questions',
                    'One-click export to PDF, CSV, and Excel',
                  ].map((feat, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => navigate('/login?role=client')}
                className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
              >
                <span>Enter Store Portal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Wholesale Supplier Card */}
            <div className="p-8 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-brand-500/30 hover:border-brand-500/60 shadow-xl transition-all group flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400 mb-5 group-hover:scale-110 transition-transform">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white font-display mb-2">
                  Supplier Portal
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-6">
                  Network-wide inventory visibility, shipment routes, returns management board,
                  order tracking, and demand analytics.
                </p>

                <ul className="space-y-2 mb-8 text-xs text-slate-300">
                  {[
                    'Shipment map and transit tracking',
                    'Returns & Claims board',
                    'Shipment QR codes and tracking',
                    'Supplier performance scorecard and tools',
                  ].map((feat, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => navigate('/login?role=supplier')}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20"
              >
                <span>Enter Supplier Portal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-[#050810] py-8 text-center text-xs text-slate-500">
        <p>
          PredictiveVendor • Enterprise Vendor Management Platform
        </p>
        <p className="mt-1 text-[11px] text-slate-600">
          Reliable restocking, verifiable tracking, and enterprise-grade data isolation.
        </p>
      </footer>
    </div>
  );
}
