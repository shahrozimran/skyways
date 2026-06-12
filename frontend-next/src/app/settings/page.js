'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Api, Auth } from '@/utils/api';
import { useAuth } from '@/context/AuthContext';

export default function SettingsPage() {
  const router = useRouter();
  const { isLoggedIn, passenger, updatePassenger } = useAuth();

  // Loading states
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [passportNo, setPassportNo] = useState('');
  const [dob, setDob] = useState('');
  const [nationalityId, setNationalityId] = useState('');
  const [countries, setCountries] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('sb_token');
    if (!token) {
      window.showToast?.('Please sign in to access settings', 'info');
      router.push(`/login?redirect=${encodeURIComponent('/settings')}`);
      return;
    }

    // Load master list of countries
    Api.get('/auth/countries')
      .then(res => {
        setCountries(res.countries || []);
      })
      .catch(err => {
        window.showToast?.(`Failed to load countries: ${err.message}`, 'error');
      });

    // Fetch latest profile from DB instead of just relying on cached state
    Api.get('/auth/profile', true)
      .then(res => {
        const p = res.passenger || {};
        setFirstName(p.first_name || '');
        setLastName(p.last_name || '');
        setEmail(p.email || '');
        setPhone(p.phone || '');
        setPassportNo(p.passport_no || '');
        setNationalityId(p.nationality_id || '');
        
        // Format YYYY-MM-DD from database date string
        if (p.date_of_birth) {
          const birthDate = p.date_of_birth.split('T')[0];
          setDob(birthDate);
        }
        setLoading(false);
      })
      .catch(err => {
        window.showToast?.(`Failed to load profile: ${err.message}`, 'error');
        setLoading(false);
      });
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      window.showToast?.('First and Last Name are required', 'warning');
      return;
    }

    // character validation
    if (firstName.length > 60 || lastName.length > 60) {
      window.showToast?.('First and Last names must be under 60 characters', 'warning');
      return;
    }
    if (passportNo && passportNo.length > 20) {
      window.showToast?.('Passport Number must be under 20 characters', 'warning');
      return;
    }
    if (phone && phone.length > 20) {
      window.showToast?.('Phone number must be under 20 characters', 'warning');
      return;
    }

    setSaveLoading(true);
    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: phone.trim() || null,
      passport_no: passportNo.trim() || null,
      date_of_birth: dob || null,
      nationality_id: nationalityId ? parseInt(nationalityId) : null
    };

    try {
      const res = await Api.put('/auth/profile', payload, true);
      window.showToast?.('Profile updated successfully! 🎉', 'success');
      
      // Update global context & local storage
      updatePassenger(res.passenger);
    } catch (err) {
      window.showToast?.(err.message, 'error');
    } finally {
      setSaveLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="page-wrapper flex-center bg-brand-black min-h-screen">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="bg-brand-black text-brand-white min-h-screen font-body pt-20">
      
      {/* ── Settings Header ── */}
      <div className="py-8 bg-brand-charcoal/50 border-b border-brand-gray-dark/40">
        <div className="container-wide mx-auto px-6">
          <h1 className="text-2xl md:text-3xl font-black font-heading">
            Account <span className="gradient-text font-black">Settings</span>
          </h1>
          <p className="text-xs text-brand-gray-light mt-1">Update your passport information and passenger profile details</p>
        </div>
      </div>

      <div className="container-wide mx-auto px-6 py-12">
        <div className="max-w-2xl mx-auto">
          
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-gray-light hover:text-brand-white transition-colors mb-6 uppercase tracking-wider">
            ← Back to Dashboard
          </Link>

          <form onSubmit={handleSave} className="p-8 bg-brand-charcoal border border-brand-gray-dark/40 rounded-2xl shadow-2xl space-y-6">
            
            <h3 className="text-lg font-bold font-heading border-b border-brand-gray-dark/30 pb-3">
              👤 Personal Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="form-group mb-0">
                <label className="text-[10px] text-brand-gray-light font-bold uppercase tracking-wider">First Name *</label>
                <input
                  type="text"
                  placeholder="Enter first name"
                  className="w-full px-3 py-2 bg-brand-black border border-brand-gray-dark/50 rounded text-brand-white outline-none focus:border-brand-red text-sm font-semibold transition-colors"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group mb-0">
                <label className="text-[10px] text-brand-gray-light font-bold uppercase tracking-wider">Last Name *</label>
                <input
                  type="text"
                  placeholder="Enter last name"
                  className="w-full px-3 py-2 bg-brand-black border border-brand-gray-dark/50 rounded text-brand-white outline-none focus:border-brand-red text-sm font-semibold transition-colors"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group mb-0">
                <label className="text-[10px] text-brand-gray-light font-bold uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 bg-brand-black/40 border border-brand-gray-dark/20 rounded text-brand-gray-light outline-none text-sm font-semibold cursor-not-allowed"
                  value={email}
                  disabled
                />
                <span className="text-[9px] text-brand-gray-light/60 mt-1 block">Email address cannot be changed.</span>
              </div>

              <div className="form-group mb-0">
                <label className="text-[10px] text-brand-gray-light font-bold uppercase tracking-wider">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+92-300-1234567"
                  className="w-full px-3 py-2 bg-brand-black border border-brand-gray-dark/50 rounded text-brand-white outline-none focus:border-brand-red text-sm font-semibold transition-colors"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>

            </div>

            <h3 className="text-lg font-bold font-heading border-b border-brand-gray-dark/30 pt-4 pb-3">
              ✈️ Travel Documentation
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <div className="form-group mb-0">
                <label className="text-[10px] text-brand-gray-light font-bold uppercase tracking-wider">Passport Number</label>
                <input
                  type="text"
                  placeholder="e.g. AB1234567"
                  className="w-full px-3 py-2 bg-brand-black border border-brand-gray-dark/50 rounded text-brand-white outline-none focus:border-brand-red text-sm font-semibold transition-colors"
                  value={passportNo}
                  onChange={e => setPassportNo(e.target.value)}
                />
              </div>

              <div className="form-group mb-0">
                <label className="text-[10px] text-brand-gray-light font-bold uppercase tracking-wider">Date of Birth</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 bg-brand-black border border-brand-gray-dark/50 rounded text-brand-white outline-none focus:border-brand-red text-xs transition-colors"
                  value={dob}
                  onChange={e => setDob(e.target.value)}
                />
              </div>

              <div className="form-group mb-0 md:col-span-2">
                <label className="text-[10px] text-brand-gray-light font-bold uppercase tracking-wider">Nationality</label>
                <select
                  className="w-full px-3 py-2 bg-brand-black border border-brand-gray-dark/50 rounded text-brand-white outline-none focus:border-brand-red text-sm font-semibold transition-colors"
                  value={nationalityId}
                  onChange={e => setNationalityId(e.target.value)}
                >
                  <option value="">Select Nationality</option>
                  {countries.map(c => (
                    <option key={c.country_id} value={c.country_id}>
                      {c.country_name} ({c.country_code})
                    </option>
                  ))}
                </select>
              </div>

            </div>

            <div className="flex gap-4 pt-6 border-t border-brand-gray-dark/30 mt-6">
              <Link href="/dashboard" className="px-5 py-2.5 border border-brand-gray-dark/50 text-brand-gray-light hover:text-brand-white rounded text-xs font-bold uppercase tracking-wider transition-colors">
                Cancel
              </Link>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-brand-red text-brand-white font-bold rounded uppercase tracking-wider text-xs hover:bg-brand-red-light disabled:opacity-45 transition-all shadow shadow-brand-red/25 transform hover:-translate-y-0.5"
                disabled={saveLoading}
              >
                {saveLoading ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>

          </form>

        </div>
      </div>

    </div>
  );
}
