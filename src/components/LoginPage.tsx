// ============================================================
// ESTI-MATE — Auth Page (Login / Sign Up / Reset Password)
// Production-ready auth UI with email+password & magic link
// ============================================================

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Ruler, Mail, Lock, User, ArrowRight, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

type AuthMode = 'login' | 'signup' | 'reset' | 'magic';

const LoginPage: React.FC = () => {
  const { signIn, signUp, signInWithMagicLink, resetPassword } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resetForm = () => {
    setError(null);
    setSuccess(null);
    setPassword('');
    setConfirmPassword('');
  };

  const switchMode = (m: AuthMode) => {
    resetForm();
    setMode(m);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: err } = await signIn(email.trim(), password);
    if (err) setError(err);
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) { setError('Please enter your full name.'); return; }
    if (!email.trim()) { setError('Please enter your email.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }

    setLoading(true);
    setError(null);
    const { error: err } = await signUp(email.trim(), password, fullName.trim());
    if (err) {
      setError(err);
    } else {
      setSuccess('Account created! Check your email for a confirmation link, then sign in.');
      setTimeout(() => switchMode('login'), 3000);
    }
    setLoading(false);
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Please enter your email.'); return; }
    setLoading(true);
    setError(null);
    const { error: err } = await signInWithMagicLink(email.trim());
    if (err) {
      setError(err);
    } else {
      setSuccess('Magic link sent! Check your inbox and click the link to sign in.');
    }
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Please enter your email.'); return; }
    setLoading(true);
    setError(null);
    const { error: err } = await resetPassword(email.trim());
    if (err) {
      setError(err);
    } else {
      setSuccess('Password reset email sent! Check your inbox.');
    }
    setLoading(false);
  };

  const handleSubmit = mode === 'login' ? handleLogin
    : mode === 'signup' ? handleSignUp
    : mode === 'magic' ? handleMagicLink
    : handleResetPassword;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/25 mb-4">
            <Ruler size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Esti-Mate</h1>
          <p className="text-slate-400 text-sm mt-1">Construction Estimating + Camera Measurement</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-1">
            {mode === 'login' && 'Welcome Back'}
            {mode === 'signup' && 'Create Account'}
            {mode === 'magic' && 'Magic Link Sign In'}
            {mode === 'reset' && 'Reset Password'}
          </h2>
          <p className="text-slate-400 text-sm mb-6">
            {mode === 'login' && 'Sign in to access your estimates, invoices, and measurements.'}
            {mode === 'signup' && 'Set up your account to start estimating.'}
            {mode === 'magic' && 'We\'ll send a sign-in link to your email.'}
            {mode === 'reset' && 'Enter your email to receive a reset link.'}
          </p>

          {/* Error / Success messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2">
              <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl flex items-start gap-2">
              <CheckCircle size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
              <p className="text-green-400 text-sm">{success}</p>
            </div>
          )}

          {/* Form */}
          <div onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="text-slate-400 text-sm block mb-1.5">Full Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                    placeholder="John Smith"
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-slate-400 text-sm block mb-1.5">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                  placeholder="you@company.com"
                  autoComplete="email"
                />
              </div>
            </div>

            {(mode === 'login' || mode === 'signup') && (
              <div>
                <label className="text-slate-400 text-sm block mb-1.5">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                    placeholder={mode === 'signup' ? 'Minimum 8 characters' : '••••••••'}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  />
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label className="text-slate-400 text-sm block mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                  />
                </div>
              </div>
            )}

            {mode === 'login' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => switchMode('reset')}
                  className="text-orange-400 text-sm hover:text-orange-300 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  {mode === 'login' && 'Sign In'}
                  {mode === 'signup' && 'Create Account'}
                  {mode === 'magic' && 'Send Magic Link'}
                  {mode === 'reset' && 'Send Reset Link'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>

          {/* Mode switchers */}
          <div className="mt-6 pt-6 border-t border-slate-800 space-y-3">
            {mode === 'login' && (
              <>
                <button
                  onClick={() => switchMode('magic')}
                  className="w-full py-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <Mail size={14} /> Sign in with Magic Link
                </button>
                <p className="text-slate-500 text-sm text-center">
                  Don't have an account?{' '}
                  <button onClick={() => switchMode('signup')} className="text-orange-400 hover:text-orange-300 font-medium">
                    Sign up
                  </button>
                </p>
              </>
            )}
            {mode === 'signup' && (
              <p className="text-slate-500 text-sm text-center">
                Already have an account?{' '}
                <button onClick={() => switchMode('login')} className="text-orange-400 hover:text-orange-300 font-medium">
                  Sign in
                </button>
              </p>
            )}
            {(mode === 'magic' || mode === 'reset') && (
              <p className="text-slate-500 text-sm text-center">
                <button onClick={() => switchMode('login')} className="text-orange-400 hover:text-orange-300 font-medium">
                  Back to sign in
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-slate-600 text-xs text-center mt-6">
          Esti-Mate + PixelMeasure &middot; Professional Construction Estimating
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
