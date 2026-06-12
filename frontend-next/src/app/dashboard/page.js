'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Api, Auth, formatPrice, formatDate, formatTime, formatDateTime, getStatusBadge } from '@/utils/api';
import { useAuth } from '@/context/AuthContext';

export default function DashboardPage() {
  const router = useRouter();
  const { isLoggedIn, logout } = useAuth();
  
  // Local states
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  
  // Boarding Pass Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [modalPasses, setModalPasses] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  // Load bookings and user profile
  useEffect(() => {
    const token = localStorage.getItem('sb_token');
    if (!token) {
      router.push('/login');
      return;
    }

    const pax = Auth.getPassenger();
    setProfile(pax);

    loadBookingsData();
  }, []);

  async function loadBookingsData() {
    try {
      const data = await Api.get('/bookings/my', true);
      setBookings(data.bookings || []);
    } catch (err) {
      window.showToast?.(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  // Calculate statistics
  const confirmedCount = bookings.filter(b => b.booking_status === 'Confirmed').length;
  const cancelledCount = bookings.filter(b => b.booking_status === 'Cancelled').length;
  const roundTripsCount = bookings.filter(b => b.trip_type === 'round-trip').length;
  
  const totalSpent = bookings
    .filter(b => b.payments?.payment_status === 'Success')
    .reduce((sum, b) => sum + (b.total_amount || 0), 0);

  // Upcoming flight calculation
  function getUpcomingFlight() {
    const confirmedBookings = bookings.filter(b => b.booking_status === 'Confirmed');
    if (confirmedBookings.length === 0) return null;

    let nextFlight = null;
    let nextDeparture = null;
    const now = new Date();

    confirmedBookings.forEach(b => {
      const ob = b.outbound;
      if (ob && ob.departure_time) {
        const depDate = new Date(ob.departure_time);
        if (depDate > now) {
          if (!nextDeparture || depDate < nextDeparture) {
            nextDeparture = depDate;
            nextFlight = b;
          }
        }
      }
    });

    return nextFlight;
  }

  const upcomingFlight = getUpcomingFlight();

  // Loyalty Tier calculation
  function getLoyaltyTier(confirmedCount) {
    if (confirmedCount >= 5) return { name: 'Gold Tier Member', color: 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10' };
    if (confirmedCount >= 2) return { name: 'Silver Tier Member', color: 'text-brand-red-light border-brand-red/20 bg-brand-red/10' };
    return { name: 'Bronze Tier Member', color: 'text-brand-gray-light border-brand-gray-dark/50 bg-brand-charcoal' };
  }

  const loyalty = getLoyaltyTier(confirmedCount);

  // Cancel booking handler
  async function handleCancelBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking? Refund policy applies.')) return;
    
    try {
      const res = await Api.put(`/bookings/${bookingId}/cancel`, {}, true);
      window.showToast?.(res.message, 'success');
      await loadBookingsData();
    } catch (err) {
      window.showToast?.(err.message, 'error');
    }
  }

  // View boarding passes modal trigger
  async function handleViewBoardingPasses(bookingId) {
    setSelectedBookingId(bookingId);
    setModalLoading(true);
    setModalOpen(true);
    setModalPasses([]);

    try {
      const data = await Api.get(`/bookings/${bookingId}/boarding-passes`, true);
      setModalPasses(data.boarding_passes || []);
    } catch (err) {
      window.showToast?.(`Failed to load passes: ${err.message}`, 'error');
    } finally {
      setModalLoading(false);
    }
  }

  // Apply dropdown filters
  const filteredBookings = filter === 'all' 
    ? bookings 
    : bookings.filter(b => b.booking_status?.toLowerCase() === filter.toLowerCase());

  if (loading) {
    return (
      <div className="page-wrapper flex-center bg-brand-black min-h-screen">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="bg-brand-black text-brand-white min-h-screen font-body pt-20">
      
      {/* ── Dashboard Header ── */}
      <div className="py-8 bg-brand-charcoal/50 border-b border-brand-gray-dark/40">
        <div className="container-wide mx-auto px-6">
          <h1 className="text-2xl md:text-3xl font-black font-heading">
            My <span className="gradient-text font-black">Dashboard</span>
          </h1>
          <p className="text-xs text-brand-gray-light mt-1">Manage your bookings, boarding passes, and account details</p>
        </div>
      </div>

      <div className="container-wide mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Panel: Profile and Stats */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Profile Card */}
            <div className="p-6 bg-brand-charcoal border border-brand-gray-dark/40 rounded-xl shadow-xl space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-red-dark to-brand-red flex items-center justify-center text-2xl shadow-lg shadow-brand-red/25">
                  👤
                </div>
                <div>
                  <div className="text-lg font-bold font-heading">
                    {profile ? `${profile.first_name} ${profile.last_name}` : '—'}
                  </div>
                  <div className="text-xs text-brand-gray-light">
                    {profile ? profile.email : '—'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-brand-gray-dark/30 text-xs">
                <div>
                  <div className="text-[10px] text-brand-gray-light font-bold uppercase tracking-wider">Phone</div>
                  <div className="font-semibold text-brand-white mt-0.5">{profile?.phone || '—'}</div>
                </div>
                <div>
                  <div className="text-[10px] text-brand-gray-light font-bold uppercase tracking-wider">Passport</div>
                  <div className="font-semibold text-brand-white mt-0.5">{profile?.passport_no || '—'}</div>
                </div>
              </div>

              <div className="h-px bg-brand-gray-dark/40 my-3" />
              
              <div className="space-y-4">
                <div>
                  <div className="text-[10px] text-brand-gray-light font-bold uppercase tracking-wider mb-1">
                    📅 Next Flight
                  </div>
                  {upcomingFlight ? (
                    <div className="p-3 bg-brand-black/40 border border-brand-gray-dark/50 rounded-lg">
                      <div className="text-xs text-brand-red-light font-bold">
                        ✈️ {upcomingFlight.outbound?.flight_number} ({upcomingFlight.outbound?.origin_ap?.iata_code} ➔ {upcomingFlight.outbound?.dest_ap?.iata_code})
                      </div>
                      <div className="text-[10px] text-brand-gray-light mt-1">
                        Departs: {formatDate(upcomingFlight.outbound?.departure_time)} at {formatTime(upcomingFlight.outbound?.departure_time)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-brand-gray-muted italic">No upcoming flights scheduled</div>
                  )}
                </div>

                <div>
                  <div className="text-[10px] text-brand-gray-light font-bold uppercase tracking-wider mb-1">
                    🌟 Loyalty Status
                  </div>
                  <div className={`inline-block px-3 py-1 rounded-full border text-xs font-bold ${loyalty.color}`}>
                    {loyalty.name}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-4">
                <Link 
                  href="/settings" 
                  className="w-full text-center py-2 bg-brand-black/40 border border-brand-gray-muted/30 text-brand-gray-light hover:text-brand-white hover:border-brand-red hover:bg-brand-charcoal/50 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
                >
                  ⚙️ Edit Settings
                </Link>
                <button 
                  className="w-full py-2 border border-brand-gray-muted/30 text-brand-gray-light hover:text-brand-white hover:border-brand-red rounded-lg text-xs font-bold uppercase tracking-wider transition-all" 
                  onClick={() => logout()}
                >
                  Logout
                </button>
              </div>
            </div>

            {/* Booking Stats cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-brand-charcoal/50 border border-brand-gray-dark/30 rounded-xl shadow flex items-center gap-3">
                <div className="text-2xl">📋</div>
                <div>
                  <div className="text-xl font-extrabold">{bookings.length}</div>
                  <div className="text-[9px] uppercase font-bold text-brand-gray-light tracking-wider">Total</div>
                </div>
              </div>
              <div className="p-4 bg-brand-charcoal/50 border border-brand-gray-dark/30 rounded-xl shadow flex items-center gap-3">
                <div className="text-2xl text-green-500">✅</div>
                <div>
                  <div className="text-xl font-extrabold">{confirmedCount}</div>
                  <div className="text-[9px] uppercase font-bold text-brand-gray-light tracking-wider">Confirmed</div>
                </div>
              </div>
              <div className="p-4 bg-brand-charcoal/50 border border-brand-gray-dark/30 rounded-xl shadow flex items-center gap-3">
                <div className="text-2xl text-yellow-500">↔️</div>
                <div>
                  <div className="text-xl font-extrabold">{roundTripsCount}</div>
                  <div className="text-[9px] uppercase font-bold text-brand-gray-light tracking-wider">Round Trips</div>
                </div>
              </div>
              <div className="p-4 bg-brand-charcoal/50 border border-brand-gray-dark/30 rounded-xl shadow flex items-center gap-3">
                <div className="text-2xl text-brand-red-light">💰</div>
                <div>
                  <div className="text-base font-extrabold tracking-tight">{formatPrice(totalSpent)}</div>
                  <div className="text-[9px] uppercase font-bold text-brand-gray-light tracking-wider">Spent</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Bookings list */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold font-heading">My Bookings</h3>
              <select
                className="px-3 py-1.5 bg-brand-charcoal border border-brand-gray-dark/50 rounded text-brand-white text-xs font-semibold focus:outline-none"
                value={filter}
                onChange={e => setFilter(e.target.value)}
              >
                <option value="all">All</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div className="space-y-4">
              {filteredBookings.length === 0 ? (
                <div className="p-12 bg-brand-charcoal/30 border border-brand-gray-dark/30 rounded-xl text-center space-y-3 max-w-sm mx-auto">
                  <div className="text-5xl">✈️</div>
                  <h3 className="text-sm font-bold font-heading">No bookings found</h3>
                  <p className="text-xs text-brand-gray-light">Your flight records will show here once booked.</p>
                  <Link href="/search" className="w-full inline-block py-2 bg-brand-red text-brand-white font-bold rounded uppercase tracking-wider text-xs hover:bg-brand-red-light">
                    Search Flights
                  </Link>
                </div>
              ) : (
                filteredBookings.map((b, idx) => {
                  const ob = b.outbound || {};
                  const obAl = ob.airlines || {};
                  const obOr = ob.origin_ap || {};
                  const obDs = ob.dest_ap || {};
                  const isConfirmed = b.booking_status === 'Confirmed';
                  
                  return (
                    <div 
                      key={`booking-${b.booking_id}`} 
                      className="p-5 bg-brand-charcoal/40 border border-brand-gray-dark/30 hover:border-brand-red/35 rounded-xl space-y-4 transition-all duration-300"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-heading text-brand-white">{b.booking_reference}</span>
                          <span className="px-2 py-0.5 rounded bg-brand-red/10 border border-brand-red/20 text-brand-red-light text-[9px] font-bold uppercase tracking-wider">
                            {b.trip_type}
                          </span>
                        </div>
                        <div dangerouslySetInnerHTML={{ __html: getStatusBadge(b.booking_status) }} />
                      </div>

                      {/* Outbound */}
                      <div className="flex gap-4 items-center">
                        <span className="text-2xl">✈️</span>
                        <div className="flex-1">
                          <div className="text-sm font-bold">{obAl.airline_name} · {ob.flight_number}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-base font-black font-heading text-brand-white">{obOr.iata_code}</span>
                            <span className="text-brand-red">→</span>
                            <span className="text-base font-black font-heading text-brand-white">{obDs.iata_code}</span>
                          </div>
                          <div className="text-xs text-brand-gray-light mt-0.5">
                            {formatDateTime(ob.departure_time)} · {obOr.cities?.city_name} ➔ {obDs.cities?.city_name}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-base font-extrabold text-brand-red-light font-heading">{formatPrice(b.total_amount)}</div>
                          <div className="text-[10px] text-brand-gray-light">
                            {b.num_passengers || 1} passenger{b.num_passengers > 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>

                      {/* Return leg check */}
                      {b.trip_type === 'round-trip' && b.return_f && (
                        <div className="flex gap-4 items-center pt-3 border-t border-dashed border-brand-gray-dark/30 mt-1">
                          <span className="text-2xl">🔄</span>
                          <div>
                            <div className="text-sm font-bold">{b.return_f.flight_number} (Return Flight)</div>
                            <div className="text-xs text-brand-gray-light mt-0.5">
                              {formatDateTime(b.return_f.departure_time)}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Actions footer */}
                      <div className="flex justify-between items-center text-xs pt-3 border-t border-brand-gray-dark/30 mt-1">
                        <div className="text-brand-gray-light text-[10px]">Booked {formatDate(b.booking_date)}</div>
                        <div className="flex gap-2">
                          {isConfirmed && (
                            <>
                              <button className="px-3 py-1.5 border border-brand-gray-dark/50 text-brand-white text-[10px] font-bold rounded uppercase tracking-wider hover:border-brand-white transition-colors" onClick={() => handleViewBoardingPasses(b.booking_id)}>
                                🎫 Boarding Pass
                              </button>
                              <button className="px-3 py-1.5 bg-brand-red/10 border border-brand-red/20 text-brand-red-light text-[10px] font-bold rounded uppercase hover:bg-brand-red/20 transition-colors" onClick={() => handleCancelBooking(b.booking_id)}>
                                Cancel
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="text-center">
              <Link href="/search" className="inline-block px-5 py-2.5 bg-brand-red text-brand-white font-bold rounded uppercase tracking-wider text-xs hover:bg-brand-red-light transition-all shadow-md shadow-brand-red/25 transform hover:-translate-y-0.5">
                + Book New Flight
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Boarding Pass Modal popup */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6 backdrop-blur-md animate-fade-in"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-xl bg-brand-charcoal border border-brand-gray-dark/50 rounded-2xl p-6 max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl relative animate-bounce-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-brand-gray-dark/30 pb-3">
              <h3 className="text-lg font-bold font-heading">🎫 Boarding Passes</h3>
              <button className="text-brand-gray-light hover:text-brand-white text-lg font-bold" onClick={() => setModalOpen(false)}>✕</button>
            </div>

            <div className="space-y-4">
              {modalLoading ? (
                <div className="flex justify-center py-12"><div className="spinner" /></div>
              ) : modalPasses.length === 0 ? (
                <p className="text-xs text-brand-gray-light text-center py-6">No boarding passes generated</p>
              ) : (
                modalPasses.map((bp, idx) => {
                  const bs = bp.booking_seats || {};
                  const fs = bs.flight_seats || {};
                  const fl = bs.flights || {};
                  const al = fl.airlines || {};
                  const oa = fl.origin_ap || {};
                  const da = fl.dest_ap || {};

                  return (
                    <div key={idx} className="bg-brand-black border border-brand-gray-dark/40 rounded-xl overflow-hidden shadow">
                      
                      {/* Pass header */}
                      <div className="px-4 py-3 bg-brand-charcoal border-b border-brand-gray-dark/40 flex justify-between items-center text-xs">
                        <div>
                          <div className="text-[8px] text-brand-gray-light font-bold uppercase tracking-wider">Airline</div>
                          <div className="font-extrabold">{al.airline_name}</div>
                          <div className="text-[10px] text-brand-red-light font-bold">{fl.flight_number}</div>
                        </div>
                        <div className="text-center">
                          <span className="px-2 py-0.5 rounded bg-green-500/10 border border-green-500/20 text-green-400 text-[9px] font-bold uppercase">
                            Confirmed
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-[8px] text-brand-gray-light font-bold uppercase tracking-wider">Passenger</div>
                          <div className="font-bold">{bs.pax_first_name} {bs.pax_last_name}</div>
                          <div className="text-[10px] text-brand-gray-light">{bs.pax_passport || '—'}</div>
                        </div>
                      </div>

                      {/* Pass route */}
                      <div className="p-5 grid grid-cols-3 items-center text-center">
                        <div className="text-left">
                          <div className="text-2xl font-black font-heading text-brand-white">{oa.iata_code}</div>
                          <div className="text-[10px] text-brand-gray-light truncate">{oa.cities?.city_name}</div>
                          <div className="mt-2 text-xs font-bold text-brand-white/80">{formatTime(fl.departure_time)}</div>
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="text-xl text-brand-red">✈</div>
                          <div className="text-[10px] text-brand-gray-light uppercase font-bold mt-1">{fs.class || 'Economy'}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-black font-heading text-brand-white">{da.iata_code}</div>
                          <div className="text-[10px] text-brand-gray-light truncate">{da.cities?.city_name}</div>
                          <div className="mt-2 text-xs font-bold text-brand-white/80">{formatTime(fl.arrival_time)}</div>
                        </div>
                      </div>

                      {/* Pass footer details */}
                      <div className="px-4 py-3 bg-brand-charcoal border-t border-brand-gray-dark/40 flex justify-between items-center">
                        <div>
                          <div className="text-[8px] text-brand-gray-light font-bold uppercase tracking-wider">Seat</div>
                          <div className="text-base font-extrabold text-brand-red-light font-heading">{fs.seat_number || '—'}</div>
                        </div>
                        <div>
                          <div className="text-[8px] text-brand-gray-light font-bold uppercase tracking-wider">Gate</div>
                          <div className="text-base font-extrabold text-brand-white font-heading">{bp.gate || 'TBD'}</div>
                        </div>
                        <div className="text-[10px] bg-brand-white text-brand-black px-3 py-1 font-mono tracking-[3px] rounded border border-brand-gray-dark text-center uppercase font-bold">
                          {bp.barcode || 'SKYBOOK'}
                        </div>
                      </div>

                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
