import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { GraduationCap, ArrowRight, Shield, Lock, Mail, Eye, EyeOff, Server, HelpCircle } from 'lucide-react';

const ROLE_ROUTES = { STUDENT: '/student', STAFF: '/staff', ADMIN: '/admin' };

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [slowLoading, setSlowLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Pre-warm backend container immediately on mount so login is instant
    api.get('/categories').catch(() => {});
  }, []);

  useEffect(() => {
    let timer;
    if (loading) {
      timer = setTimeout(() => setSlowLoading(true), 2500);
    } else {
      setSlowLoading(false);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(ROLE_ROUTES[user.role] || '/login');
    } catch (err) {
      setError('Authentication failed. Invalid campus email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-center items-center p-4 py-10 selection:bg-indigo-500 selection:text-white">
      <div className="w-full max-w-md">

        {/* Institutional Campus Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3.5 bg-gradient-to-tr from-indigo-600 to-blue-500 text-white rounded-2xl shadow-xl shadow-indigo-500/20 mb-4 border border-indigo-400/30">
            <GraduationCap size={40} className="stroke-[1.75]" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Smart Campus</h1>
          <p className="text-base font-semibold text-indigo-300 mt-0.5">Automated Recovery System</p>
          <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Official University Operations Portal</span>
          </div>
        </div>

        {/* Login Form Box */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl shadow-black/40 border border-white/20 p-8 mb-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-800">Sign In to Your Account</h2>
            <p className="text-xs text-slate-500 mt-1">
              Enter your authorized university credentials to access the recovery network.
            </p>
          </div>

          {error && (
            <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-700 px-4 py-3 rounded-r-xl mb-5 text-xs font-semibold flex items-center justify-between">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Campus Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 text-slate-400" size={17} />
                <input
                  type="email"
                  placeholder="e.g. student@campus.edu"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-transparent transition"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowHelp(prev => !prev)}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium transition"
                >
                  Forgot or Need Access?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 text-slate-400" size={17} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-transparent transition"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 transition"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600 select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <span>Remember me on this device</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:from-indigo-400 disabled:to-blue-400 text-white font-bold py-3 px-4 rounded-xl transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 text-sm mt-3"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
              <ArrowRight size={17} />
            </button>

            {loading && (
              <div className="mt-3 p-3 bg-indigo-50/80 border border-indigo-200/60 rounded-xl text-center text-xs text-indigo-700 font-medium flex items-center justify-center gap-2.5">
                <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                <span>
                  {slowLoading
                    ? '⚡ Connecting to university cloud service (initial wake up)... Please hold on!'
                    : 'Verifying credentials against institutional directory...'}
                </span>
              </div>
            )}
          </form>

          {/* Help Modal / Accordion */}
          {showHelp && (
            <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2 animate-fadeIn">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <HelpCircle size={15} className="text-indigo-600" />
                <span>Account Access &amp; Credential Assistance</span>
              </div>
              <p>
                Student and Staff accounts are provisioned and managed by the <strong>Campus Safety &amp; Administration Office</strong>.
              </p>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-700 space-y-1">
                <p>• <strong>Central Administration Desk:</strong> admin@campus.edu</p>
                <p>• <strong>Property Verification Desk:</strong> staff@campus.edu</p>
              </div>
              <p className="text-[11px] text-slate-500">
                If your account is suspended or you need your password reset, please contact the campus administrator directly.
              </p>
            </div>
          )}
        </div>

        {/* Security Trust Badges */}
        <div className="grid grid-cols-3 gap-3 text-center text-slate-400 text-[11px]">
          <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-2.5 backdrop-blur-sm">
            <Shield className="mx-auto text-indigo-400 mb-1" size={16} />
            <p className="font-semibold text-slate-300">RBAC Secured</p>
            <p className="text-[10px] text-slate-500">Role Governed</p>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-2.5 backdrop-blur-sm">
            <Lock className="mx-auto text-emerald-400 mb-1" size={16} />
            <p className="font-semibold text-slate-300">256-Bit JWT</p>
            <p className="text-[10px] text-slate-500">Encrypted Session</p>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-2.5 backdrop-blur-sm">
            <Server className="mx-auto text-blue-400 mb-1" size={16} />
            <p className="font-semibold text-slate-300">TiDB Cloud</p>
            <p className="text-[10px] text-slate-500">High Availability</p>
          </div>
        </div>

        {/* Institutional Footer */}
        <p className="text-center text-xs text-slate-500 mt-6 font-medium">
          Smart Campus Lost &amp; Found Recovery Platform &copy; 2026. All rights reserved.
        </p>
      </div>
    </div>
  );
}
