import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import {
  Zap,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Building2,
  Boxes,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, isAuthenticated, isClient, isSupplier } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('demo1234');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const initialRole = searchParams.get('role');
  const isExpired = searchParams.get('expired') === 'true';

  useEffect(() => {
    if (isAuthenticated) {
      if (isClient) navigate('/client', { replace: true });
      else if (isSupplier) navigate('/supplier', { replace: true });
    }
  }, [isAuthenticated, isClient, isSupplier, navigate]);

  const handleLoginSubmit = async (e) => {
    e?.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // Step A: Authenticate with Firebase Client SDK
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // Step B: Retrieve the fresh JWT token (force refresh)
      const token = await userCredential.user.getIdToken(true);

      // Step C: Pass this token to the backend via api.js client (via AuthContext login)
      const user = await login(email, password, token);
      if (user.role === 'client') {
        navigate('/client', { replace: true });
      } else {
        navigate('/supplier', { replace: true });
      }
    } catch (err) {
      console.error('Login error:', err);
      let msg = err?.message || 'Login failed. Please verify credentials.';
      if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        msg = 'Invalid email or password. Please check your credentials.';
      } else if (err?.code === 'auth/user-not-found') {
        msg = 'No account found with this email. Please register first.';
      } else if (err?.code === 'auth/too-many-requests') {
        msg = 'Access temporarily disabled due to many failed attempts. Try again later.';
      } else {
        msg = msg.replace('Firebase: ', '');
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail) => {
    setEmail(demoEmail);
    setPassword('demo1234');
    setLoading(true);
    setError(null);
    try {
      const user = await login(demoEmail, 'demo1234');
      if (user.role === 'client') {
        navigate('/client', { replace: true });
      } else {
        navigate('/supplier', { replace: true });
      }
    } catch (err) {
      setError(err?.message || 'Quick login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden selection:bg-cyan-500 selection:text-black">
      {/* Background glow accents */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="text-center mb-8 relative z-10">
        <Link to="/" className="inline-flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-brand-500/30 group-hover:scale-105 transition-transform">
            <Zap className="w-6 h-6 fill-white" />
          </div>
          <span className="font-display font-black text-2xl tracking-tight text-white">
            Predictive<span className="text-cyan-400">Vendor</span>
          </span>
        </Link>
        <p className="text-xs text-slate-400 mt-2">
          Vendor Management Portal
        </p>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Session Expired Alert */}
        {isExpired && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Your session has expired. Please sign in again.</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Main Card */}
        <div className="p-7 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl">
          <h2 className="text-lg font-bold text-white font-display mb-1">
            Sign In
          </h2>
          <p className="text-xs text-slate-400 mb-6">
            Sign in to access your inventory and orders
          </p>

          {/* One-Click Demo Role Selectors */}
          <div className="mb-6 space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Demo Quick Login
            </label>

            {/* Client 1 */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickLogin('client1@store.com')}
              className="w-full p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/50 text-left transition-all flex items-center justify-between group disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                  <Boxes className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white group-hover:text-cyan-300 transition-colors">
                    Client 1: Apex Metro Flagship
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    client1@store.com • STORE-001
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
            </button>

            {/* Client 2 */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickLogin('client2@store.com')}
              className="w-full p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/50 text-left transition-all flex items-center justify-between group disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white group-hover:text-cyan-300 transition-colors">
                    Client 2: TechHaven NY
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    client2@store.com • STORE-002
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
            </button>

            {/* Supplier */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickLogin('supplier@vendor.com')}
              className="w-full p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-brand-500/50 text-left transition-all flex items-center justify-between group disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white group-hover:text-brand-300 transition-colors">
                    Supplier: Global Wholesale Ops
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    supplier@vendor.com • Cross-Store
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-brand-400 group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>

          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <span className="relative bg-slate-900 px-3 text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
              Or Sign In With Email
            </span>
          </div>

          {/* Custom Credentials Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@store.com"
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Tenant Isolation Guarantee */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center gap-2 text-[11px] text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Secure store data encryption and isolation</span>
          </div>

          {/* Registration Link */}
          <div className="mt-4 pt-3 border-t border-slate-800 text-center text-xs text-slate-400">
            Don't have an account yet?{' '}
            <Link
              to="/register"
              className="text-cyan-400 hover:text-cyan-300 font-semibold underline"
            >
              Register here
            </Link>
          </div>
        </div>

        {/* Public Tracking Link */}
        <div className="text-center mt-6 text-xs text-slate-400">
          Need to track a shipment?{' '}
          <Link
            to="/track/FD997AA5485839BD"
            className="text-cyan-400 hover:text-cyan-300 font-semibold underline"
          >
            Track a package
          </Link>
        </div>
      </div>
    </div>
  );
}
