import { useState, FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { login as apiLogin, register as apiRegister } from '../../services/api';

export default function AuthPage() {
  const { login } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function switchMode(m: 'login' | 'register') { setMode(m); setError(null); setUsername(''); setPassword(''); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const u = username.trim();
    if (!u || u.length < 3) { setError('Username must be at least 3 characters'); return; }
    if (!password || password.length < 4) { setError('Password must be at least 4 characters'); return; }

    setLoading(true);
    try {
      const { token } = mode === 'login'
        ? await apiLogin(u, password)
        : await apiRegister(u, password);
      login(token, u);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-bg">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-brand">
          <div className="brand-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="currentColor"/>
            </svg>
          </div>
          <span className="brand-name">PulseChat</span>
        </div>

        {/* Tabs */}
        <div className="auth-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={mode === 'login'}
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => switchMode('login')}
          >
            Sign In
          </button>
          <button
            role="tab"
            aria-selected={mode === 'register'}
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => switchMode('register')}
          >
            Create Account
          </button>
        </div>

        <h2 className="auth-heading">
          {mode === 'login' ? 'Welcome back' : 'Join PulseChat'}
        </h2>
        <p className="auth-sub">
          {mode === 'login' ? 'Sign in to continue chatting' : 'Create your account to get started'}
        </p>

        {error && (
          <div className="auth-error" role="alert" aria-live="assertive">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{flexShrink:0}}>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2"/>
              <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2"/>
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="field">
            <label htmlFor="auth-username">Username</label>
            <input
              id="auth-username"
              className="base-input"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="e.g. shiva99"
              disabled={loading}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="field">
            <label htmlFor="auth-password">Password</label>
            <div className="input-wrapper">
              <input
                id="auth-password"
                className="base-input input-with-action"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                className="input-action-btn"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={0}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary btn-full"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? (
              <span className="btn-loading">
                <span className="btn-spinner" />
                {mode === 'login' ? 'Signing in…' : 'Creating account…'}
              </span>
            ) : (
              mode === 'login' ? 'Sign In →' : 'Create Account →'
            )}
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            className="auth-link"
            onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? 'Register' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
