'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getStatusBadge, formatPrice, formatDate, formatTime, formatDateTime } from '@/utils/api';

export default function ConfirmationPage() {
  const router = useRouter();
  const [booking, setBooking] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('sb_token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const last = JSON.parse(sessionStorage.getItem('last_booking') || '{}');
      if (last.booking_id) {
        setBooking(last);
      }
    } catch {
      // empty state
    }
  }, []);

  if (!booking) {
    return (
      <div className="page-wrapper flex-center bg-brand-black min-h-screen">
        <div className="empty-state text-center py-20 max-w-sm mx-auto space-y-4">
          <div className="text-6xl">❓</div>
          <h3 className="text-lg font-bold font-heading">No recent booking found</h3>
          <p className="text-xs text-brand-gray-light">Please check your user dashboard to view existing reservations.</p>
          <Link href="/dashboard" className="w-full inline-block py-2.5 bg-brand-red text-brand-white font-bold rounded uppercase tracking-wider text-xs hover:bg-brand-red-light transition-all shadow-lg shadow-brand-red/25">
            View My Bookings
          </Link>
        </div>
      </div>
    );
  }

  const details = booking.booking_details || {};
  const passes = booking.boarding_passes || [];

  return (
    <div className="bg-brand-black text-brand-white min-h-screen font-body pt-20" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(220,38,38,0.15), transparent 60%)' }}>
      <div className="container mx-auto px-6 py-12 max-w-3xl space-y-8 print:py-0 print:max-w-full">
        
        {/* Success Header */}
        <div className="text-center space-y-3 print:hidden">
          <div className="text-6xl animate-bounce-in">🎉</div>
          <h1 className="text-3xl font-black font-heading">Booking <span className="gradient-text">Confirmed!</span></h1>
          <p className="text-xs text-brand-gray-light">Your seats are reserved. Safe travels!</p>
          <div className="inline-block px-4 py-1.5 rounded-full border border-brand-red/30 bg-brand-red/10 text-brand-red-light text-xs font-bold uppercase tracking-wider mt-2 shadow shadow-brand-red/15 animate-pulse-glow">
            Booking Reference: {booking.booking_reference}
          </div>
        </div>

        {/* Overview receipt */}
        <div className="p-6 bg-brand-charcoal border border-brand-gray-dark/40 rounded-xl shadow-xl print:border-none print:bg-transparent print:shadow-none">
          <h4 className="text-xs font-bold font-heading uppercase text-brand-red-light tracking-wider border-b border-brand-gray-dark/40 pb-2 mb-4 print:text-black print:border-black">
            🧾 Reservation Overview
          </h4>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-xs">
            <div>
              <div className="text-brand-gray-light font-semibold uppercase tracking-wider mb-1 print:text-gray-600">Booking Ref</div>
              <div className="text-base font-extrabold font-heading text-brand-white print:text-black">{booking.booking_reference}</div>
            </div>
            <div>
              <div className="text-brand-gray-light font-semibold uppercase tracking-wider mb-1 print:text-gray-600">Status</div>
              <div className="mt-1" dangerouslySetInnerHTML={{ __html: getStatusBadge('Confirmed') }} />
            </div>
            <div>
              <div className="text-brand-gray-light font-semibold uppercase tracking-wider mb-1 print:text-gray-600">Trip Type</div>
              <div className="inline-block px-2 py-0.5 rounded bg-brand-red/10 border border-brand-red/20 text-brand-red-light font-bold uppercase text-[10px] mt-1 print:border-black print:text-black">
                {details.trip_type || '—'}
              </div>
            </div>
            <div>
              <div className="text-brand-gray-light font-semibold uppercase tracking-wider mb-1 print:text-gray-600">Total Paid</div>
              <div className="text-base font-extrabold font-heading text-brand-red-light print:text-black">{formatPrice(details.total_amount)}</div>
            </div>
            <div>
              <div className="text-brand-gray-light font-semibold uppercase tracking-wider mb-1 print:text-gray-600">Outbound Route</div>
              <div className="text-brand-white font-semibold print:text-black mt-1">
                {details.outbound_route || '—'} 
                <span className="block text-[10px] text-brand-gray-light font-normal print:text-gray-600">{formatDateTime(details.outbound_departure)}</span>
              </div>
            </div>
            {details.return_route && (
              <div>
                <div className="text-brand-gray-light font-semibold uppercase tracking-wider mb-1 print:text-gray-600">Return Route</div>
                <div className="text-brand-white font-semibold print:text-black mt-1">
                  {details.return_route}
                  <span className="block text-[10px] text-brand-gray-light font-normal print:text-gray-600">{formatDateTime(details.return_departure)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Boarding Passes */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold font-heading print:hidden">🎫 Your Boarding Passes</h3>
          
          <div className="space-y-4 print:space-y-8">
            {passes.length === 0 ? (
              <div className="p-6 bg-brand-charcoal border border-brand-gray-dark/40 rounded-xl text-center text-brand-gray-light">
                <p>Boarding passes will appear in your dashboard shortly.</p>
                <Link href="/dashboard" className="btn btn-primary mt-3">View Dashboard</Link>
              </div>
            ) : (
              passes.map((bp, i) => {
                const bs = bp.booking_seats || {};
                const fs = bs.flight_seats || {};
                const fl = bs.flights || {};
                const al = fl.airlines || {};
                const oa = fl.origin_ap || {};
                const da = fl.dest_ap || {};
                
                return (
                  <div key={i} className="bg-brand-charcoal border border-brand-gray-dark/40 rounded-xl overflow-hidden shadow-lg print:border-black print:text-black print:bg-white">
                    {/* Header */}
                    <div className="px-6 py-4 bg-brand-black/50 border-b border-brand-gray-dark/40 flex justify-between items-center print:bg-gray-100 print:border-black">
                      <div>
                        <div className="text-[9px] text-brand-gray-light uppercase font-bold tracking-wider print:text-gray-600">Airline / Flight</div>
                        <div className="text-sm font-bold text-brand-white print:text-black">{al.airline_name}</div>
                        <div className="text-xs text-brand-red-light font-bold print:text-black">{fl.flight_number}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[9px] text-brand-gray-light uppercase font-bold tracking-wider print:text-gray-600">Document</div>
                        <div className="px-2 py-0.5 rounded bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-bold uppercase mt-1 print:border-black print:text-black">
                          ✅ BOARDING PASS
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] text-brand-gray-light uppercase font-bold tracking-wider print:text-gray-600">Passenger</div>
                        <div className="text-sm font-bold text-brand-white print:text-black">{bs.pax_first_name} {bs.pax_last_name}</div>
                        <div className="text-[10px] text-brand-gray-light print:text-gray-600">{bs.pax_passport || '—'}</div>
                      </div>
                    </div>

                    {/* Route Body */}
                    <div className="p-6 grid grid-cols-3 items-center text-center">
                      <div className="text-left">
                        <div className="text-[10px] text-brand-gray-light uppercase font-bold tracking-wider print:text-gray-600">From</div>
                        <div className="text-3xl font-black font-heading text-brand-white print:text-black">{oa.iata_code}</div>
                        <div className="text-[10px] text-brand-gray-light truncate print:text-gray-600">{oa.cities?.city_name}</div>
                        
                        <div className="mt-3">
                          <div className="text-[9px] text-brand-gray-light uppercase font-bold tracking-wider print:text-gray-600">Departs</div>
                          <div className="text-base font-extrabold text-brand-white print:text-black">{formatTime(fl.departure_time)}</div>
                          <div className="text-[10px] text-brand-gray-light print:text-gray-600">{formatDate(fl.departure_time)}</div>
                        </div>
                      </div>

                      <div className="flex flex-col items-center">
                        <div className="text-3xl text-brand-red transform rotate-90 print:text-black">✈</div>
                        <div className="text-xs font-bold text-brand-gray-light uppercase tracking-wider mt-2 print:text-black">
                          {fs.class || 'Economy'}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] text-brand-gray-light uppercase font-bold tracking-wider print:text-gray-600">To</div>
                        <div className="text-3xl font-black font-heading text-brand-white print:text-black">{da.iata_code}</div>
                        <div className="text-[10px] text-brand-gray-light truncate print:text-gray-600">{da.cities?.city_name}</div>
                        
                        <div className="mt-3">
                          <div className="text-[9px] text-brand-gray-light uppercase font-bold tracking-wider print:text-gray-600">Arrives</div>
                          <div className="text-base font-extrabold text-brand-white print:text-black">{formatTime(fl.arrival_time)}</div>
                          <div className="text-[10px] text-brand-gray-light print:text-gray-600">{formatDate(fl.arrival_time)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Details Footer */}
                    <div className="px-6 py-4 bg-brand-black/30 border-t border-brand-gray-dark/40 flex justify-between items-center print:border-black print:bg-gray-100">
                      <div>
                        <div className="text-[9px] text-brand-gray-light uppercase font-bold tracking-wider print:text-gray-600">Seat</div>
                        <div className="text-lg font-black font-heading text-brand-red-light print:text-black">{fs.seat_number || '—'}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-brand-gray-light uppercase font-bold tracking-wider print:text-gray-600">Gate</div>
                        <div className="text-lg font-black font-heading text-brand-white print:text-black">{bp.gate || 'TBD'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] bg-brand-white text-brand-black px-4 py-2 font-mono tracking-[4px] rounded border border-brand-gray-dark shadow-inner uppercase font-bold select-none print:border-black">
                          {bp.barcode || 'SKYBOOK'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Action button layout */}
        <div className="flex gap-3 justify-center pt-4 flex-wrap print:hidden">
          <Link href="/dashboard" className="px-5 py-2.5 bg-brand-red text-brand-white font-bold rounded uppercase tracking-wider text-xs hover:bg-brand-red-light transition-all shadow-md shadow-brand-red/25 transform hover:-translate-y-0.5">
            📋 View My Bookings
          </Link>
          <button onClick={() => window.print()} className="px-5 py-2.5 border border-brand-gray-dark/50 text-brand-gray-light hover:text-brand-white hover:border-brand-gray-muted text-xs font-bold rounded uppercase tracking-wider transition-colors">
            🖨️ Print Boarding Passes
          </button>
          <Link href="/" className="px-5 py-2.5 text-xs text-brand-gray-light hover:text-brand-white hover:bg-brand-card transition-all font-semibold rounded uppercase tracking-wider">
            🏠 Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
