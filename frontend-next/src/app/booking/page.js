'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Api, BookingStore, formatPrice, formatDate, formatTime } from '@/utils/api';
import { useAuth } from '@/context/AuthContext';

export default function BookingPage() {
  const router = useRouter();
  const { isLoggedIn, passenger } = useAuth();
  
  // Page load checks
  const [bookingData, setBookingData] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Steps state
  const [step, setStep] = useState(1);
  
  // Selected seats state
  const [outboundSeats, setOutboundSeats] = useState([]);
  const [returnSeats, setReturnSeats] = useState([]);
  
  // Seat map loaded data from backend
  const [loadedOutboundSeats, setLoadedOutboundSeats] = useState([]);
  const [loadedReturnSeats, setLoadedReturnSeats] = useState([]);
  
  // Interactive seat filter values
  const [outboundFilter, setOutboundFilter] = useState('all');
  const [returnFilter, setReturnFilter] = useState('all');
  
  // Interactive seat availability checkboxes
  const [outboundShowAvailable, setOutboundShowAvailable] = useState(true);
  const [outboundShowBooked, setOutboundShowBooked] = useState(true);
  const [returnShowAvailable, setReturnShowAvailable] = useState(true);
  const [returnShowBooked, setReturnShowBooked] = useState(true);
  
  // Passenger details fields
  const [passengerDetails, setPassengerDetails] = useState([]);
  
  // Payment Details
  const [paymentMethod, setPaymentMethod] = useState('Credit Card');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Load state and redirect if empty
  useEffect(() => {
    const token = localStorage.getItem('sb_token');
    if (!token) {
      window.showToast?.('Please sign in to continue booking', 'info');
      router.push(`/login?redirect=${encodeURIComponent('/booking')}`);
      return;
    }

    const data = BookingStore.get();
    if (!data.outbound_flight) {
      window.showToast?.('No flight selected. Redirecting to search...', 'warning');
      router.push('/search');
      return;
    }

    setBookingData(data);
    
    // Initialize empty passenger profiles
    const count = data.passengers || 1;
    const initialPaxs = [];
    const leadPax = passenger || JSON.parse(localStorage.getItem('sb_passenger')) || null;
    
    for (let i = 0; i < count; i++) {
      initialPaxs.push({
        first_name: i === 0 && leadPax ? leadPax.first_name : '',
        last_name: i === 0 && leadPax ? leadPax.last_name : '',
        passport: i === 0 && leadPax ? (leadPax.passport_no || '') : '',
        dob: '',
      });
    }
    setPassengerDetails(initialPaxs);

    const cabin = data.cabin_class || 'Economy';
    
    // Outbound seats
    Api.get(`/flights/${data.outbound_flight.flight_id}/seats`)
      .then(res => {
        setLoadedOutboundSeats(res.seats[cabin] || []);
      })
      .catch(err => {
        window.showToast?.(`Outbound seats error: ${err.message}`, 'error');
      });

    // Return seats
    if (data.trip_type === 'round-trip' && data.return_flight) {
      Api.get(`/flights/${data.return_flight.flight_id}/seats`)
        .then(res => {
          setLoadedReturnSeats(res.seats[cabin] || []);
        })
        .catch(err => {
          window.showToast?.(`Return seats error: ${err.message}`, 'error');
        });
    }
    
    setLoading(false);
  }, [passenger]);

  // Seat Grouping by row utility
  function groupSeatsByRow(seatsList) {
    const rows = {};
    seatsList.forEach(s => {
      const row = s.seat_number.replace(/[A-Z]/g, '');
      if (!rows[row]) rows[row] = [];
      rows[row].push(s);
    });
    return rows;
  }

  // Toggle seat choice helper
  function toggleSeat(seat, leg) {
    if (seat.is_booked) return;
    
    const needed = bookingData.passengers || 1;
    const isOutbound = leg === 'outbound';
    const selectedArr = isOutbound ? outboundSeats : returnSeats;
    const setArr = isOutbound ? setOutboundSeats : setReturnSeats;

    const idx = selectedArr.findIndex(s => s.seat_id === seat.seat_id);
    if (idx > -1) {
      setArr(selectedArr.filter(s => s.seat_id !== seat.seat_id));
    } else {
      if (selectedArr.length >= needed) {
        window.showToast?.(`You can only select ${needed} seat${needed > 1 ? 's' : ''} for this leg`, 'warning');
        return;
      }
      setArr([...selectedArr, { seat_id: seat.seat_id, seat_number: seat.seat_number, price: seat.price }]);
    }
  }

  // Card formatting utility
  function formatCardInput(val) {
    let raw = val.replace(/\D/g, '').substring(0, 16);
    let parts = raw.match(/.{1,4}/g);
    return parts ? parts.join(' ') : raw;
  }

  // Filter Seat Map display items
  function getSeatVisibility(seat, leg) {
    const isBooked = !!seat.is_booked;
    const showAvailable = leg === 'outbound' ? outboundShowAvailable : returnShowAvailable;
    const showBooked = leg === 'outbound' ? outboundShowBooked : returnShowBooked;

    if (isBooked && !showBooked) return 'hidden';
    if (!isBooked && !showAvailable) return 'hidden';

    const activeFilter = leg === 'outbound' ? outboundFilter : returnFilter;
    if (activeFilter === 'extra-legroom') {
      return seat.has_extra_legroom ? 'visible' : 'dimmed';
    } else if (activeFilter !== 'all') {
      return seat.seat_type === activeFilter ? 'visible' : 'dimmed';
    }
    
    return 'visible';
  }

  // Navigation validation
  function handleGoToPassengers() {
    const needed = bookingData.passengers || 1;
    if (outboundSeats.length < needed) {
      window.showToast?.(`Please select ${needed} seat${needed > 1 ? 's' : ''} for the outbound flight`, 'warning');
      return;
    }
    if (bookingData.trip_type === 'round-trip' && returnSeats.length < needed) {
      window.showToast?.(`Please select ${needed} seat${needed > 1 ? 's' : ''} for the return flight`, 'warning');
      return;
    }
    setStep(2);
  }

  function handleGoToPayment() {
    for (let i = 0; i < passengerDetails.length; i++) {
      if (!passengerDetails[i].first_name.trim() || !passengerDetails[i].last_name.trim()) {
        window.showToast?.(`Please enter First and Last name for Passenger ${i + 1}`, 'warning');
        return;
      }
    }
    setStep(3);
  }

  async function handleConfirmBooking() {
    const isCard = paymentMethod === 'Credit Card' || paymentMethod === 'Debit Card';
    let card4 = null;
    if (isCard) {
      const cleaned = cardNumber.replace(/\s/g, '');
      if (cleaned.length < 16) {
        window.showToast?.('Please enter a valid 16-digit card number', 'warning');
        return;
      }
      card4 = cleaned.slice(-4);
    }

    setConfirmLoading(true);
    const outTotal = outboundSeats.reduce((sum, s) => sum + s.price, 0);
    const retTotal = returnSeats.reduce((sum, s) => sum + s.price, 0);

    const payload = {
      trip_type: bookingData.trip_type || 'one-way',
      outbound_flight_id: bookingData.outbound_flight.flight_id,
      return_flight_id: bookingData.return_flight?.flight_id || null,
      outbound_seat_ids: outboundSeats.map(s => s.seat_id),
      return_seat_ids: returnSeats.map(s => s.seat_id),
      passengers: passengerDetails.map(p => ({
        first_name: p.first_name.trim(),
        last_name: p.last_name.trim(),
        passport: p.passport.trim() || '',
        dob: p.dob || null,
      })),
      payment_method: paymentMethod,
      card_last_four: card4,
      total_amount: outTotal + retTotal,
    };

    try {
      const res = await Api.post('/bookings/', payload, true);
      window.showToast?.('Booking confirmed! 🎉', 'success');
      sessionStorage.setItem('last_booking', JSON.stringify(res));
      BookingStore.clear();
      router.push('/confirmation');
    } catch (err) {
      window.showToast?.(err.message, 'error');
    } finally {
      setConfirmLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="page-wrapper flex-center bg-brand-black min-h-screen">
        <div className="spinner" />
      </div>
    );
  }

  const neededPax = bookingData.passengers || 1;
  const obFlight = bookingData.outbound_flight;
  const rtFlight = bookingData.return_flight;
  const cabin = bookingData.cabin_class || 'Economy';

  const outTotal = outboundSeats.reduce((sum, s) => sum + s.price, 0);
  const retTotal = returnSeats.reduce((sum, s) => sum + s.price, 0);
  const grandTotal = outTotal + retTotal;

  const aisleAfter = cabin === 'Economy' ? 3 : 2;

  return (
    <div className="bg-brand-black text-brand-white min-h-screen font-body pt-20">
      
      {/* ── Steps Indicator Header ── */}
      <div className="py-8 bg-brand-charcoal/50 border-b border-brand-gray-dark/40">
        <div className="container-wide mx-auto px-6">
          <h1 className="text-2xl md:text-3xl font-black font-heading mb-6">
            Complete Your <span className="gradient-text">Booking</span>
          </h1>
          
          <div className="flex items-center justify-between max-w-xl mx-auto">
            <div className="flex flex-col items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors duration-300 ${
                step === 1 ? 'bg-brand-red text-brand-white' : step > 1 ? 'bg-green-500 text-brand-white' : 'bg-brand-gray-dark text-brand-gray-light'
              }`}>
                {step > 1 ? '✓' : '1'}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-gray-light">Seats</span>
            </div>
            <div className={`flex-1 h-0.5 mx-4 transition-colors duration-300 ${step > 1 ? 'bg-green-500' : 'bg-brand-gray-dark'}`} />
            
            <div className="flex flex-col items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors duration-300 ${
                step === 2 ? 'bg-brand-red text-brand-white' : step > 2 ? 'bg-green-500 text-brand-white' : 'bg-brand-gray-dark text-brand-gray-light'
              }`}>
                {step > 2 ? '✓' : '2'}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-gray-light">Passengers</span>
            </div>
            <div className={`flex-1 h-0.5 mx-4 transition-colors duration-300 ${step > 2 ? 'bg-green-500' : 'bg-brand-gray-dark'}`} />
            
            <div className="flex flex-col items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors duration-300 ${
                step === 3 ? 'bg-brand-red text-brand-white' : 'bg-brand-gray-dark text-brand-gray-light'
              }`}>
                3
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-gray-light">Payment</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container-wide mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Flow Column */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Flight info banner card */}
            <div className="p-6 bg-brand-charcoal/80 border border-brand-gray-dark/40 rounded-xl shadow-xl">
              <div className="grid md:grid-cols-2 gap-6 items-center">
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-brand-red-light uppercase tracking-wider">OUTBOUND</div>
                  <div className="text-base font-extrabold">{obFlight?.flight_number} · {obFlight?.airline_name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-lg font-black font-heading text-brand-white">{obFlight?.origin_iata}</span>
                    <span className="text-brand-red">→</span>
                    <span className="text-lg font-black font-heading text-brand-white">{obFlight?.dest_iata}</span>
                  </div>
                  <div className="text-xs text-brand-gray-light">
                    {formatDate(obFlight?.departure_time)} · {formatTime(obFlight?.departure_time)}
                  </div>
                </div>

                {rtFlight && (
                  <div className="space-y-1 pt-6 md:pt-0 md:pl-6 border-t md:border-t-0 md:border-l border-brand-gray-dark/40">
                    <div className="text-[10px] font-bold text-brand-red-light uppercase tracking-wider">RETURN</div>
                    <div className="text-base font-extrabold">{rtFlight.flight_number} · {rtFlight.airline_name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-lg font-black font-heading text-brand-white">{rtFlight.origin_iata}</span>
                      <span className="text-brand-red">→</span>
                      <span className="text-lg font-black font-heading text-brand-white">{rtFlight.dest_iata}</span>
                    </div>
                    <div className="text-xs text-brand-gray-light">
                      {formatDate(rtFlight.departure_time)} · {formatTime(rtFlight.departure_time)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Step 1: Seat map picker */}
            {step === 1 && (
              <div className="space-y-6 animate-fade-in-up">
                
                {/* Outbound leg map */}
                <div className="p-6 bg-brand-charcoal border border-brand-gray-dark/40 rounded-xl space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold font-heading">💺 Select Outbound Seats</h3>
                    <div className="text-xs text-brand-gray-light">
                      Selected Outbound:{' '}
                      <span className="text-brand-red-light font-bold">
                        {outboundSeats.length > 0 ? outboundSeats.map(s => s.seat_number).join(', ') : 'None'}
                      </span>
                    </div>
                  </div>

                  {/* Seat category checkboxes */}
                  <div className="flex flex-wrap gap-4 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-brand-gray-light hover:text-brand-white transition-colors">
                      <input type="checkbox" className="w-4 h-4 bg-brand-black border border-brand-gray-dark rounded focus:ring-0 focus:ring-offset-0 text-brand-red" checked={outboundShowAvailable} onChange={e => setOutboundShowAvailable(e.target.checked)} />
                      Available
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-brand-gray-light hover:text-brand-white transition-colors">
                      <input type="checkbox" className="w-4 h-4 bg-brand-red rounded border border-brand-red" checked={true} disabled />
                      Selected
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-brand-gray-light hover:text-brand-white transition-colors">
                      <input type="checkbox" className="w-4 h-4 bg-brand-black border border-brand-gray-dark rounded focus:ring-0 focus:ring-offset-0 text-brand-red" checked={outboundShowBooked} onChange={e => setOutboundShowBooked(e.target.checked)} />
                      Booked
                    </label>
                  </div>

                  {/* Seat type filter tabs */}
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] text-brand-gray-light font-bold uppercase tracking-wider mr-2">Filter:</span>
                    {['all', 'Window', 'Aisle', 'Middle', 'extra-legroom'].map(f => (
                      <button
                        key={`out-filter-${f}`}
                        type="button"
                        className={`px-3 py-1 text-[10px] font-semibold rounded transition-colors ${
                          outboundFilter === f
                            ? 'bg-brand-red text-brand-white'
                            : 'text-brand-gray-light border border-brand-gray-dark/50 hover:bg-brand-card hover:text-brand-white'
                        }`}
                        onClick={() => setOutboundFilter(f)}
                      >
                        {f === 'extra-legroom' ? '🌟 Extra Legroom' : f === 'all' ? 'All Seats' : f}
                      </button>
                    ))}
                  </div>

                  {/* Outbound Grid list */}
                  <div className="pt-4 overflow-x-auto">
                    <div className="inline-block min-w-[340px] space-y-1.5">
                      {Object.keys(groupSeatsByRow(loadedOutboundSeats))
                        .sort((a, b) => parseInt(a) - parseInt(b))
                        .map(row => {
                          const rowSeats = groupSeatsByRow(loadedOutboundSeats)[row].sort((a, b) => a.seat_number.localeCompare(b.seat_number));
                          return (
                            <div key={`out-row-${row}`} className="flex items-center gap-2 justify-center">
                              <div className="w-6 text-[10px] text-brand-gray-muted text-right pr-2 font-bold">{row}</div>
                              {rowSeats.map((seat, i) => {
                                const isSelected = outboundSeats.some(s => s.seat_id === seat.seat_id);
                                const visibility = getSeatVisibility(seat, 'outbound');
                                
                                if (visibility === 'hidden') return <div key={seat.seat_id} className="w-9 h-9" />;
                                
                                return (
                                  <div key={seat.seat_id} className="flex">
                                    {i === aisleAfter && <div className="w-6" />}
                                    <div
                                      className={`w-9 h-9 flex items-center justify-center text-[10px] font-extrabold rounded-t-md border-b-2 cursor-pointer transition-all duration-200 select-none ${
                                        seat.is_booked 
                                          ? 'bg-brand-gray-dark/30 border-brand-gray-dark text-brand-gray-muted cursor-not-allowed'
                                          : isSelected
                                          ? 'bg-brand-red border-brand-red-dark text-brand-white scale-105 shadow-md shadow-brand-red/35'
                                          : visibility === 'dimmed'
                                          ? 'opacity-20 pointer-events-none'
                                          : seat.has_extra_legroom
                                          ? 'bg-orange-500/20 border-orange-500 text-orange-400 hover:bg-orange-500/30'
                                          : 'bg-brand-charcoal border-brand-gray-dark text-brand-gray-light hover:text-brand-white hover:border-brand-gray-muted'
                                      }`}
                                      title={`${seat.seat_number} · ${cabin} Class · ${formatPrice(seat.price)}`}
                                      onClick={() => toggleSeat(seat, 'outbound')}
                                    >
                                      {seat.seat_number.replace(/^\d+/, '')}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>

                {/* Return leg map */}
                {rtFlight && (
                  <div className="p-6 bg-brand-charcoal border border-brand-gray-dark/40 rounded-xl space-y-4 animate-fade-in-up">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-bold font-heading">🔄 Select Return Seats</h3>
                      <div className="text-xs text-brand-gray-light">
                        Selected Return:{' '}
                        <span className="text-brand-red-light font-bold">
                          {returnSeats.length > 0 ? returnSeats.map(s => s.seat_number).join(', ') : 'None'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-brand-gray-light hover:text-brand-white transition-colors">
                        <input type="checkbox" className="w-4 h-4 bg-brand-black border border-brand-gray-dark rounded focus:ring-0 text-brand-red" checked={returnShowAvailable} onChange={e => setReturnShowAvailable(e.target.checked)} />
                        Available
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-brand-gray-light hover:text-brand-white transition-colors">
                        <input type="checkbox" className="w-4 h-4 bg-brand-red rounded border border-brand-red" checked={true} disabled />
                        Selected
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-brand-gray-light hover:text-brand-white transition-colors">
                        <input type="checkbox" className="w-4 h-4 bg-brand-black border border-brand-gray-dark rounded focus:ring-0 text-brand-red" checked={returnShowBooked} onChange={e => setReturnShowBooked(e.target.checked)} />
                        Booked
                      </label>
                    </div>

                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-[10px] text-brand-gray-light font-bold uppercase tracking-wider mr-2">Filter:</span>
                      {['all', 'Window', 'Aisle', 'Middle', 'extra-legroom'].map(f => (
                        <button
                          key={`ret-filter-${f}`}
                          type="button"
                          className={`px-3 py-1 text-[10px] font-semibold rounded transition-colors ${
                            returnFilter === f
                              ? 'bg-brand-red text-brand-white'
                              : 'text-brand-gray-light border border-brand-gray-dark/50 hover:bg-brand-card hover:text-brand-white'
                          }`}
                          onClick={() => setReturnFilter(f)}
                        >
                          {f === 'extra-legroom' ? '🌟 Extra Legroom' : f === 'all' ? 'All Seats' : f}
                        </button>
                      ))}
                    </div>

                    {/* Return Grid list */}
                    <div className="pt-4 overflow-x-auto">
                      <div className="inline-block min-w-[340px] space-y-1.5">
                        {Object.keys(groupSeatsByRow(loadedReturnSeats))
                          .sort((a, b) => parseInt(a) - parseInt(b))
                          .map(row => {
                            const rowSeats = groupSeatsByRow(loadedReturnSeats)[row].sort((a, b) => a.seat_number.localeCompare(b.seat_number));
                            return (
                              <div key={`ret-row-${row}`} className="flex items-center gap-2 justify-center">
                                <div className="w-6 text-[10px] text-brand-gray-muted text-right pr-2 font-bold">{row}</div>
                                {rowSeats.map((seat, i) => {
                                  const isSelected = returnSeats.some(s => s.seat_id === seat.seat_id);
                                  const visibility = getSeatVisibility(seat, 'return');
                                  
                                  if (visibility === 'hidden') return <div key={seat.seat_id} className="w-9 h-9" />;
                                  
                                  return (
                                    <div key={seat.seat_id} className="flex">
                                      {i === aisleAfter && <div className="w-6" />}
                                      <div
                                        className={`w-9 h-9 flex items-center justify-center text-[10px] font-extrabold rounded-t-md border-b-2 cursor-pointer transition-all duration-200 select-none ${
                                          seat.is_booked 
                                            ? 'bg-brand-gray-dark/30 border-brand-gray-dark text-brand-gray-muted cursor-not-allowed'
                                            : isSelected
                                            ? 'bg-brand-red border-brand-red-dark text-brand-white scale-105 shadow-md shadow-brand-red/35'
                                            : visibility === 'dimmed'
                                            ? 'opacity-20 pointer-events-none'
                                            : seat.has_extra_legroom
                                            ? 'bg-orange-500/20 border-orange-500 text-orange-400 hover:bg-orange-500/30'
                                            : 'bg-brand-charcoal border-brand-gray-dark text-brand-gray-light hover:text-brand-white hover:border-brand-gray-muted'
                                        }`}
                                        title={`${seat.seat_number} · ${cabin} Class · ${formatPrice(seat.price)}`}
                                        onClick={() => toggleSeat(seat, 'return')}
                                      >
                                        {seat.seat_number.replace(/^\d+/, '')}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                )}

                <button className="px-6 py-3 bg-brand-red text-brand-white font-bold rounded uppercase tracking-wider text-xs hover:bg-brand-red-light transition-all shadow shadow-brand-red/35 transform hover:-translate-y-0.5 mt-4" onClick={handleGoToPassengers}>
                  Continue to Passengers →
                </button>
              </div>
            )}

            {/* Step 2: Passenger form */}
            {step === 2 && (
              <div className="p-6 bg-brand-charcoal border border-brand-gray-dark/40 rounded-xl space-y-6 animate-fade-in-up">
                <h3 className="text-lg font-bold font-heading">👥 Passenger Details</h3>
                
                <div className="space-y-6">
                  {passengerDetails.map((p, idx) => (
                    <div key={`pax-${idx}`} className="space-y-4 pb-6 border-b border-brand-gray-dark/30 last:border-b-0 last:pb-0">
                      <h5 className="text-sm font-bold font-heading flex items-center gap-1.5">
                        <span>👤 Passenger {idx + 1}</span>
                        {idx === 0 && <span className="text-[10px] text-brand-red-light font-bold bg-brand-red/10 border border-brand-red/20 px-2 py-0.5 rounded">(Lead Passenger)</span>}
                      </h5>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="form-group mb-0">
                          <label className="text-[10px] text-brand-gray-light font-bold tracking-wider">First Name *</label>
                          <input
                            type="text"
                            placeholder="John"
                            className="w-full px-3 py-2 bg-brand-black border border-brand-gray-dark/50 rounded text-brand-white outline-none focus:border-brand-red text-sm font-semibold transition-colors"
                            value={p.first_name}
                            onChange={e => {
                              const copy = [...passengerDetails];
                              copy[idx].first_name = e.target.value;
                              setPassengerDetails(copy);
                            }}
                            required
                          />
                        </div>

                        <div className="form-group mb-0">
                          <label className="text-[10px] text-brand-gray-light font-bold tracking-wider">Last Name *</label>
                          <input
                            type="text"
                            placeholder="Doe"
                            className="w-full px-3 py-2 bg-brand-black border border-brand-gray-dark/50 rounded text-brand-white outline-none focus:border-brand-red text-sm font-semibold transition-colors"
                            value={p.last_name}
                            onChange={e => {
                              const copy = [...passengerDetails];
                              copy[idx].last_name = e.target.value;
                              setPassengerDetails(copy);
                            }}
                            required
                          />
                        </div>

                        <div className="form-group mb-0">
                          <label className="text-[10px] text-brand-gray-light font-bold tracking-wider">Passport Number</label>
                          <input
                            type="text"
                            placeholder="AB1234567"
                            className="w-full px-3 py-2 bg-brand-black border border-brand-gray-dark/50 rounded text-brand-white outline-none focus:border-brand-red text-sm font-semibold transition-colors"
                            value={p.passport}
                            onChange={e => {
                              const copy = [...passengerDetails];
                              copy[idx].passport = e.target.value;
                              setPassengerDetails(copy);
                            }}
                          />
                        </div>

                        <div className="form-group mb-0">
                          <label className="text-[10px] text-brand-gray-light font-bold tracking-wider">Date of Birth</label>
                          <input
                            type="date"
                            className="w-full px-3 py-2 bg-brand-black border border-brand-gray-dark/50 rounded text-brand-white outline-none focus:border-brand-red text-xs transition-colors"
                            value={p.dob}
                            onChange={e => {
                              const copy = [...passengerDetails];
                              copy[idx].dob = e.target.value;
                              setPassengerDetails(copy);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-4 border-t border-brand-gray-dark/30">
                  <button className="px-4 py-2 border border-brand-gray-dark/50 text-brand-gray-light text-xs font-bold rounded uppercase tracking-wider hover:text-brand-white transition-colors" onClick={() => setStep(1)}>
                    ← Back
                  </button>
                  <button className="px-6 py-2 bg-brand-red text-brand-white text-xs font-bold rounded uppercase tracking-wider hover:bg-brand-red-light transition-all shadow shadow-brand-red/35 transform hover:-translate-y-0.5" onClick={handleGoToPayment}>
                    Continue to Payment →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Payment details mockup */}
            {step === 3 && (
              <div className="p-6 bg-brand-charcoal border border-brand-gray-dark/40 rounded-xl space-y-6 animate-fade-in-up">
                <h3 className="text-lg font-bold font-heading">💳 Payment Details</h3>
                <p className="text-xs text-brand-gray-light">This is a mock flight reservation payment flow. No actual cash will be charged.</p>

                {/* Summary ticket card */}
                <div className="p-5 bg-brand-black/60 border border-brand-gray-dark/40 rounded-lg space-y-4">
                  <h4 className="text-xs font-bold font-heading uppercase text-brand-red-light tracking-wider border-b border-brand-gray-dark/30 pb-2">
                    🔍 Review Your Flight
                  </h4>

                  <div className="space-y-2 text-xs">
                    <div>
                      <div className="font-bold text-brand-white">✈️ Route Information</div>
                      <div className="text-brand-gray-light mt-1">
                        <b>Outbound:</b> {obFlight.origin_iata} ➔ {obFlight.dest_iata} ({obFlight.flight_number}) · {formatDate(obFlight.departure_time)} · {cabin} Class
                      </div>
                      {rtFlight && (
                        <div className="text-brand-gray-light mt-1">
                          <b>Return:</b> {rtFlight.origin_iata} ➔ {rtFlight.dest_iata} ({rtFlight.flight_number}) · {formatDate(rtFlight.departure_time)} · {cabin} Class
                        </div>
                      )}
                    </div>

                    <div className="h-px bg-brand-gray-dark/30 my-2" />

                    <div>
                      <div className="font-bold text-brand-white">👥 Passengers & Seats</div>
                      <div className="space-y-1 mt-1">
                        {passengerDetails.map((p, i) => (
                          <div key={i} className="flex justify-between items-center text-brand-gray-light">
                            <span>{i + 1}. {p.first_name} {p.last_name}</span>
                            <span>
                              Outbound: <b className="text-brand-white">{outboundSeats[i]?.seat_number}</b>
                              {rtFlight && <> | Return: <b className="text-brand-white">{returnSeats[i]?.seat_number}</b></>}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="h-px bg-brand-gray-dark/30 my-2" />

                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-brand-gray-light">Outbound Leg Subtotal:</span>
                        <span className="font-bold">{formatPrice(outTotal)}</span>
                      </div>
                      {rtFlight && (
                        <div className="flex justify-between">
                          <span className="text-brand-gray-light">Return Leg Subtotal:</span>
                          <span className="font-bold">{formatPrice(retTotal)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-bold text-brand-red-light border-t border-dashed border-brand-gray-dark/40 pt-2 mt-1">
                        <span>Total Paid Amount:</span>
                        <span>{formatPrice(grandTotal)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment method selector */}
                <div className="space-y-2">
                  <label className="text-[10px] text-brand-gray-light font-bold uppercase tracking-wider">Payment Option</label>
                  <div className="flex flex-wrap gap-2">
                    {['Credit Card', 'Debit Card', 'PayPal', 'Bank Transfer'].map(m => (
                      <button
                        key={m}
                        type="button"
                        className={`px-4 py-2 text-xs font-semibold rounded border transition-colors ${
                          paymentMethod === m
                            ? 'bg-brand-red border-brand-red text-brand-white'
                            : 'border-brand-gray-dark/50 text-brand-gray-light hover:bg-brand-card hover:text-brand-white'
                        }`}
                        onClick={() => setPaymentMethod(m)}
                      >
                        {m === 'PayPal' ? '🅿️ PayPal' : m === 'Bank Transfer' ? '🏛️ Bank Transfer' : `💳 ${m}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Card Fields */}
                {(paymentMethod === 'Credit Card' || paymentMethod === 'Debit Card') && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="form-group mb-0">
                      <label className="text-[10px] text-brand-gray-light font-bold uppercase tracking-wider">Card Number</label>
                      <input
                        type="text"
                        placeholder="4111 1111 1111 1111"
                        maxLength={19}
                        className="w-full px-3 py-2 bg-brand-black border border-brand-gray-dark/50 rounded text-brand-white outline-none focus:border-brand-red text-sm font-semibold transition-colors"
                        value={cardNumber}
                        onChange={e => setCardNumber(formatCardInput(e.target.value))}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="form-group mb-0">
                        <label className="text-[10px] text-brand-gray-light font-bold uppercase tracking-wider">Expiry</label>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          maxLength={5}
                          className="w-full px-3 py-2 bg-brand-black border border-brand-gray-dark/50 rounded text-brand-white outline-none focus:border-brand-red text-sm font-semibold transition-colors"
                          value={expiryDate}
                          onChange={e => setExpiryDate(e.target.value)}
                        />
                      </div>
                      <div className="form-group mb-0">
                        <label className="text-[10px] text-brand-gray-light font-bold uppercase tracking-wider">CVV</label>
                        <input
                          type="text"
                          placeholder="123"
                          maxLength={3}
                          className="w-full px-3 py-2 bg-brand-black border border-brand-gray-dark/50 rounded text-brand-white outline-none focus:border-brand-red text-sm font-semibold transition-colors"
                          value={cvv}
                          onChange={e => setCvv(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="form-group mb-0">
                      <label className="text-[10px] text-brand-gray-light font-bold uppercase tracking-wider">Name on Card</label>
                      <input
                        type="text"
                        placeholder="JOHN DOE"
                        className="w-full px-3 py-2 bg-brand-black border border-brand-gray-dark/50 rounded text-brand-white outline-none focus:border-brand-red text-sm font-semibold transition-colors"
                        value={cardName}
                        onChange={e => setCardName(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div className="p-4 bg-brand-red/10 border border-brand-red/30 rounded flex justify-between items-center">
                  <span className="text-xs font-bold text-brand-gray-light uppercase">Total Amount Due</span>
                  <span className="text-2xl font-black font-heading text-brand-red-light">{formatPrice(grandTotal)}</span>
                </div>

                <div className="flex gap-3 pt-2">
                  <button className="px-4 py-2 border border-brand-gray-dark/50 text-brand-gray-light text-xs font-bold rounded uppercase tracking-wider hover:text-brand-white transition-colors" onClick={() => setStep(2)}>
                    ← Back
                  </button>
                  <button
                    className="flex-1 py-3 bg-brand-red text-brand-white font-bold rounded uppercase tracking-wider text-xs hover:bg-brand-red-light disabled:opacity-45 transition-all shadow shadow-brand-red/25 transform hover:-translate-y-0.5"
                    onClick={handleConfirmBooking}
                    disabled={confirmLoading}
                  >
                    {confirmLoading ? 'Processing Payment...' : '✅ Confirm & Pay'}
                  </button>
                </div>
                <p className="text-center text-[10px] text-brand-gray-light">🔒 Secured by 256-bit encryption. Mock transaction — no real charges.</p>
              </div>
            )}
          </div>

          {/* Right Price Summary Sidebar */}
          <div className="lg:col-span-4">
            <div className="p-6 bg-brand-charcoal border border-brand-gray-dark/40 rounded-xl space-y-4 shadow-xl sticky top-24">
              <h4 className="text-base font-bold font-heading uppercase tracking-wider border-b border-brand-gray-dark/40 pb-2">
                🧾 Price Summary
              </h4>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center text-brand-gray-light">
                  <span>Outbound Seats ({outboundSeats.length}/{neededPax})</span>
                  <span className="font-bold text-brand-white">{formatPrice(outTotal)}</span>
                </div>
                <div className="flex justify-between items-center text-brand-gray-light">
                  <span>Return Seats ({returnSeats.length}/{neededPax})</span>
                  <span className="font-bold text-brand-white">{rtFlight ? formatPrice(retTotal) : '—'}</span>
                </div>
                
                <div className="h-px bg-brand-gray-dark/40 my-2" />
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-brand-gray-light">Total Price</span>
                  <span className="text-xl font-black text-brand-red-light font-heading">{formatPrice(grandTotal)}</span>
                </div>

                <div className="pt-3 space-y-1.5">
                  <div className="py-1.5 text-center text-[10px] font-bold text-green-400 border border-green-500/20 bg-green-500/10 rounded uppercase tracking-wider">
                    ✅ Free cancellation within 24h
                  </div>
                  <div className="py-1.5 text-center text-[10px] font-bold text-brand-red-light border border-brand-red/20 bg-brand-red/10 rounded uppercase tracking-wider">
                    🎫 Instant boarding pass
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
