import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import {
  Zap,
  Lock,
  Mail,
  User,
  Building2,
  Boxes,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('client'); // 'client' or 'supplier'
  const [storeId, setStoreId] = useState('STORE-001');
  const [storeName, setStoreName] = useState('Apex Electronics Flagship');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const STORES = [
    { id: 'STORE-001', name: 'Apex Electronics Metro Flagship' },
    { id: 'STORE-002', name: 'TechHaven Downtown Hub' },
    { id: 'STORE-003', name: 'Silicon Gateway Retail' },
    { id: 'STORE-004', name: 'Pacific Edge Consumer Tech' },
  ];

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all required credentials.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your entries.');
      return;
    }

    setLoading(true);
    setError(null);

    let firebaseToken = null;
    try {
      // 1. Firebase client registration
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        firebaseToken = await userCredential.user.getIdToken(true);
      } catch (fbErr) {
        console.warn('Firebase registration notice:', fbErr?.code || fbErr?.message);
        if (fbErr?.code === 'auth/email-already-in-use') {
          throw new Error('This email is already registered. Please sign in or use a different email.');
        }
      }

      // 2. Persistent MongoDB synchronization via backend
      const user = await register({
        email,
        password,
        role,
        display_name: displayName || email.split('@')[0],
        store_client_id: role === 'client' ? storeId : null,
        store_name: role === 'client' ? storeName : 'Wholesale Central',
        firebase_id_token: firebaseToken,
      });

      // 3. Navigate to appropriate portal
      if (user.role === 'supplier') {
        navigate('/supplier', { replace: true });
      } else {
        navigate('/client', { replace: true });
      }
    } catch (err) {
      setError(err?.message || 'Registration failed. Please try again.');
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
        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Main Registration Card */}
        <div className="p-7 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl space-y-5">
          <div>
            <h2 className="text-lg font-bold text-white font-display mb-1">
              Create an Account
            </h2>
            <p className="text-xs text-slate-400">
              Sign up to manage store inventory and orders
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Role Selection */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Account Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('client')}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    role === 'client'
                      ? 'bg-cyan-500/15 border-cyan-500 text-white shadow-sm'
                      : 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Boxes className={`w-4 h-4 ${role === 'client' ? 'text-cyan-400' : 'text-slate-500'}`} />
                    <span className="text-xs font-bold text-white">Store Manager</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Manage store inventory, orders, and returns
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('supplier')}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    role === 'supplier'
                      ? 'bg-brand-500/15 border-brand-500 text-white shadow-sm'
                      : 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className={`w-4 h-4 ${role === 'supplier' ? 'text-brand-400' : 'text-slate-500'}`} />
                    <span className="text-xs font-bold text-white">Supplier / Wholesale</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Manage network inventory, orders, and analytics
                  </span>
                </button>
              </div>
            </div>

            {/* Display Name */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Alex Sterling"
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            </div>

            {/* Email Address */}
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
                  placeholder="name@company.com"
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            </div>

            {/* Password Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    placeholder="Min 6 chars"
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* If Client Role, Store Assignment */}
            {role === 'client' && (
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Assigned Store Location
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <select
                    value={storeId}
                    onChange={(e) => {
                      const selected = STORES.find((s) => s.id === e.target.value);
                      setStoreId(e.target.value);
                      if (selected) setStoreName(selected.name);
                    }}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-800/90 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 font-mono transition-colors"
                  >
                    {STORES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.id} &bull; {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-brand-500 hover:from-cyan-400 hover:to-brand-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* MongoDB Persistence Notice */}
          <div className="pt-3 border-t border-slate-800 flex items-center gap-2 text-[11px] text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Secure enterprise encryption and access control</span>
          </div>

          {/* Link back to Login */}
          <div className="text-center text-xs text-slate-400 pt-2">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-cyan-400 hover:text-cyan-300 font-semibold underline"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
