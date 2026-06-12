'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Api, Auth } from '@/utils/api';
import { useAuth } from '@/context/AuthContext';
import { Suspense } from 'react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [tab, setTab] = useState(searchParams.get('tab') === 'register' ? 'register' : 'login');
  const [loading, setLoading] = useState(false);

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register fields
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regFirst, setRegFirst] = useState('');
  const [regLast, setRegLast] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassport, setRegPassport] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    if (!loginEmail || !loginPassword) { window.showToast?.('Please fill in all fields', 'warning'); return; }
    setLoading(true);
    try {
      await login(loginEmail, loginPassword);
      window.showToast?.('Welcome back! ✈️', 'success');
      const redirect = searchParams.get('redirect') || '/dashboard';
      router.push(redirect);
    } catch (err) {
      window.showToast?.(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    if (!regEmail || !regPassword || !regFirst || !regLast) {
      window.showToast?.('Please fill in all required fields', 'warning'); return;
    }
    setLoading(true);
    try {
      await Api.post('/auth/register', {
        email: regEmail, password: regPassword,
        first_name: regFirst, last_name: regLast,
        phone: regPhone, passport_no: regPassport,
      });
      window.showToast?.('Account created! Please log in.', 'success');
      setTab('login');
      setLoginEmail(regEmail);
    } catch (err) {
      window.showToast?.(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: '6rem 1.5rem 3rem' }}>
      <div style={{ width: '100%', maxWidth: 460 }}>
        {/* Brand */}
        <div className="text-center mb-4">
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✈️</div>
          <h2>Sky<span className="gradient-text">Ways</span></h2>
          <p className="text-sm mt-1">Your premium flight booking platform</p>
        </div>

        {/* Tab switch */}
        <div className="trip-tabs mb-4" style={{ justifyContent: 'center' }}>
          <button className={`trip-tab${tab === 'login' ? ' active' : ''}`} onClick={() => setTab('login')}>Sign In</button>
          <button className={`trip-tab${tab === 'register' ? ' active' : ''}`} onClick={() => setTab('register')}>Register</button>
        </div>

        {/* Login Form */}
        {tab === 'login' && (
          <div className="card">
            <h3 className="mb-3">Welcome Back</h3>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" placeholder="you@example.com" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" placeholder="••••••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                {loading ? <><span className="spinner spinner-sm" /> Signing in...</> : '🔐 Sign In'}
              </button>
            </form>
            <p className="text-center text-sm mt-3 text-muted">
              No account?{' '}
              <button onClick={() => setTab('register')} style={{ background: 'none', border: 'none', color: 'var(--red-light)', cursor: 'pointer', fontWeight: 600 }}>Register here</button>
            </p>
          </div>
        )}

        {/* Register Form */}
        {tab === 'register' && (
          <div className="card">
            <h3 className="mb-3">Create Account</h3>
            <form onSubmit={handleRegister}>
              <div className="grid-2">
                <div className="form-group">
                  <label>First Name *</label>
                  <input type="text" placeholder="John" value={regFirst} onChange={e => setRegFirst(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Last Name *</label>
                  <input type="text" placeholder="Doe" value={regLast} onChange={e => setRegLast(e.target.value)} required />
                </div>
              </div>
              <div className="form-group">
                <label>Email Address *</label>
                <input type="email" placeholder="you@example.com" value={regEmail} onChange={e => setRegEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Password *</label>
                <input type="password" placeholder="Min. 8 characters" value={regPassword} onChange={e => setRegPassword(e.target.value)} required />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Phone</label>
                  <input type="tel" placeholder="+92 300 0000000" value={regPhone} onChange={e => setRegPhone(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Passport No.</label>
                  <input type="text" placeholder="AB1234567" value={regPassport} onChange={e => setRegPassport(e.target.value)} />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                {loading ? <><span className="spinner spinner-sm" /> Creating account...</> : '✈️ Create Account'}
              </button>
            </form>
            <p className="text-center text-sm mt-3 text-muted">
              Already have an account?{' '}
              <button onClick={() => setTab('login')} style={{ background: 'none', border: 'none', color: 'var(--red-light)', cursor: 'pointer', fontWeight: 600 }}>Sign in</button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
