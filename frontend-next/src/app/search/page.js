'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Api, SearchStore, BookingStore, formatDate, formatTime, formatDuration, formatPrice, getStatusBadge, getAirlineIcon } from '@/utils/api';

export default function SearchPage() {
  const router = useRouter();
  
  // Search parameters
  const [tripType, setTripType] = useState('one-way');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [passengers, setPassengers] = useState(1);
  const [cabinClass, setCabinClass] = useState('Economy');
  
  // Airports datalist
  const [airports, setAirports] = useState([]);
  
  // Search state
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [outboundFlights, setOutboundFlights] = useState([]);
  const [returnFlights, setReturnFlights] = useState([]);
  const [availableOutboundDates, setAvailableOutboundDates] = useState([]);
  const [availableReturnDates, setAvailableReturnDates] = useState([]);
  const [searchSummaryText, setSearchSummaryText] = useState('');
  
  // Selection state
  const [selectedOutbound, setSelectedOutbound] = useState(null);
  const [selectedReturn, setSelectedReturn] = useState(null);
  
  // Sidebar Suggestions
  const [suggestions, setSuggestions] = useState({ outbound: [], return: [] });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState(false);

  // Load search parameters and airports on mount
  useEffect(() => {
    const params = SearchStore.get();
    if (params.trip_type) setTripType(params.trip_type);
    if (params.origin) setOrigin(params.origin);
    if (params.destination) setDestination(params.destination);
    if (params.date) setDate(params.date);
    if (params.return_date) setReturnDate(params.return_date);
    if (params.passengers) setPassengers(params.passengers);
    if (params.class) setCabinClass(params.class);

    if (params.origin) {
      triggerSearch(params);
    }
    
    Api.get('/flights/airports')
      .then(data => {
        setAirports(data.airports || []);
      })
      .catch(() => {});
  }, []);

  // Fetch sidebar date suggestions when origin or destination changes
  useEffect(() => {
    if (origin.length === 3 && destination.length === 3) {
      fetchSuggestions(origin, destination);
    } else {
      setShowSuggestions(false);
    }
  }, [origin, destination]);

  async function fetchSuggestions(orig, dest) {
    try {
      const data = await Api.get(`/flights/available-dates?origin=${orig}&destination=${dest}`);
      setSuggestions({
        outbound: data.available_outbound_dates || [],
        return: data.available_return_dates || [],
      });
      setSuggestionsError(false);
      setShowSuggestions(true);
    } catch {
      setSuggestionsError(true);
      setShowSuggestions(true);
    }
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    const params = {
      origin: origin.toUpperCase(),
      destination: destination.toUpperCase(),
      date,
      return_date: returnDate,
      trip_type: tripType,
      passengers: parseInt(passengers),
      class: cabinClass,
    };
    SearchStore.set(params);
    triggerSearch(params);
  }

  async function triggerSearch(params) {
    const { origin, destination, date, return_date, trip_type, passengers, class: cls } = params;
    if (!origin || !destination || !date) {
      window.showToast?.('Please fill in From, To, and Departure date', 'warning');
      return;
    }

    setLoading(true);
    setHasSearched(true);
    setSelectedOutbound(null);
    setSelectedReturn(null);

    setSearchSummaryText(`${origin} → ${destination} • ${formatDate(date)} • ${passengers} pax • ${cls}`);

    try {
      const qs = new URLSearchParams({ origin, destination, date, class: cls, passengers, trip_type });
      if (trip_type === 'round-trip' && return_date) qs.set('return_date', return_date);
      
      const data = await Api.get(`/flights/search?${qs}`);
      setOutboundFlights(data.outbound_flights || []);
      setReturnFlights(data.return_flights || []);
      setAvailableOutboundDates(data.available_outbound_dates || []);
      if (trip_type === 'round-trip') {
        setAvailableReturnDates(data.available_return_dates || []);
      } else {
        setAvailableReturnDates([]);
      }
    } catch (err) {
      window.showToast?.(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function handleDateBadgeClick(newDate, type) {
    let newParams = {
      origin,
      destination,
      date: type === 'outbound' ? newDate : date,
      return_date: type === 'return' ? newDate : returnDate,
      trip_type: tripType,
      passengers,
      class: cabinClass,
    };
    if (type === 'outbound') setDate(newDate);
    if (type === 'return') setReturnDate(newDate);

    SearchStore.set(newParams);
    triggerSearch(newParams);
  }

  function handleContinue() {
    if (!selectedOutbound) return;
    
    const token = localStorage.getItem('sb_token');
    if (!token) {
      window.showToast?.('Please log in to continue booking', 'info');
      router.push(`/login?redirect=${encodeURIComponent('/booking')}`);
      return;
    }

    const priceKey = `${cabinClass.toLowerCase()}_price`;
    const outPrice = (selectedOutbound[priceKey] || selectedOutbound.base_price || 0) * passengers;
    const retPrice = selectedReturn ? (selectedReturn[priceKey] || selectedReturn.base_price || 0) * passengers : 0;

    BookingStore.set({
      trip_type: tripType,
      passengers: passengers,
      cabin_class: cabinClass,
      outbound_flight: selectedOutbound,
      return_flight: selectedReturn || null,
      outbound_price: outPrice,
      return_price: retPrice,
      total_amount: outPrice + retPrice,
    });
    router.push('/booking');
  }

  const hasOutboundSelection = !!selectedOutbound;
  const hasReturnSelection = tripType === 'round-trip' ? !!selectedReturn : true;
  const canContinue = hasOutboundSelection && hasReturnSelection;

  const priceKey = `${cabinClass.toLowerCase()}_price`;
  const outPrice = selectedOutbound ? (selectedOutbound[priceKey] || selectedOutbound.base_price || 0) * passengers : 0;
  const retPrice = selectedReturn ? (selectedReturn[priceKey] || selectedReturn.base_price || 0) * passengers : 0;
  const totalPrice = outPrice + retPrice;

  return (
    <div className="bg-brand-black text-brand-white min-h-screen font-body pt-20">
      
      {/* ── Page Header / Search Bar ── */}
      <div className="py-8 bg-brand-charcoal/50 border-b border-brand-gray-dark/40">
        <div className="container-wide mx-auto px-6">
          <h1 className="text-2xl md:text-3xl font-black font-heading mb-6">
            Find Your <span className="gradient-text">Perfect Flight</span>
          </h1>
          
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            
            {/* Search Form Card */}
            <form onSubmit={handleFormSubmit} className="w-full flex-1 p-6 bg-brand-charcoal border border-brand-gray-dark/40 rounded-xl space-y-4 shadow-xl">
              <div className="flex gap-2">
                {['one-way', 'round-trip'].map(type => (
                  <button
                    key={type}
                    type="button"
                    className={`px-3 py-1.5 text-xs font-semibold rounded uppercase tracking-wider transition-colors duration-200 ${
                      tripType === type
                        ? 'bg-brand-red text-brand-white'
                        : 'text-brand-gray-light border border-brand-gray-dark/50 hover:bg-brand-card'
                    }`}
                    onClick={() => {
                      setTripType(type);
                      setReturnDate('');
                      setSelectedReturn(null);
                    }}
                  >
                    {type === 'one-way' ? 'One Way' : 'Round Trip'}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
                <div className="form-group mb-0">
                  <label className="text-[10px] text-brand-gray-light font-bold tracking-wider">From</label>
                  <input
                    type="text"
                    placeholder="KHI"
                    maxLength={3}
                    className="w-full px-3 py-2 bg-brand-black border border-brand-gray-dark/50 rounded text-brand-white uppercase outline-none focus:border-brand-red text-sm font-semibold transition-colors"
                    value={origin}
                    onChange={e => setOrigin(e.target.value.toUpperCase())}
                    list="origin-airports"
                    required
                  />
                  <datalist id="origin-airports">
                    {airports.map(a => (
                      <option key={`orig-${a.iata_code}`} value={a.iata_code}>
                        {a.airport_name} ({a.cities?.city_name || ''})
                      </option>
                    ))}
                  </datalist>
                </div>

                <div className="form-group mb-0">
                  <label className="text-[10px] text-brand-gray-light font-bold tracking-wider">To</label>
                  <input
                    type="text"
                    placeholder="DXB"
                    maxLength={3}
                    className="w-full px-3 py-2 bg-brand-black border border-brand-gray-dark/50 rounded text-brand-white uppercase outline-none focus:border-brand-red text-sm font-semibold transition-colors"
                    value={destination}
                    onChange={e => setDestination(e.target.value.toUpperCase())}
                    list="dest-airports"
                    required
                  />
                  <datalist id="dest-airports">
                    {airports.map(a => (
                      <option key={`dest-${a.iata_code}`} value={a.iata_code}>
                        {a.airport_name} ({a.cities?.city_name || ''})
                      </option>
                    ))}
                  </datalist>
                </div>

                <div className="form-group mb-0">
                  <label className="text-[10px] text-brand-gray-light font-bold tracking-wider">Departure</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 bg-brand-black border border-brand-gray-dark/50 rounded text-brand-white outline-none focus:border-brand-red text-xs transition-colors"
                    value={date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setDate(e.target.value)}
                    required
                  />
                </div>

                {tripType === 'round-trip' ? (
                  <div className="form-group mb-0">
                    <label className="text-[10px] text-brand-gray-light font-bold tracking-wider">Return Date</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 bg-brand-black border border-brand-gray-dark/50 rounded text-brand-white outline-none focus:border-brand-red text-xs transition-colors"
                      value={returnDate}
                      min={date || new Date().toISOString().split('T')[0]}
                      onChange={e => setReturnDate(e.target.value)}
                      required
                    />
                  </div>
                ) : (
                  <div className="hidden lg:block h-1 opacity-0">&nbsp;</div>
                )}

                <div className="form-group mb-0">
                  <label className="text-[10px] text-brand-gray-light font-bold tracking-wider">Passengers</label>
                  <select 
                    className="w-full px-3 py-2 bg-brand-black border border-brand-gray-dark/50 rounded text-brand-white outline-none focus:border-brand-red text-sm font-semibold transition-colors"
                    value={passengers} 
                    onChange={e => setPassengers(parseInt(e.target.value))}
                  >
                    <option value={1}>1 Adult</option>
                    <option value={2}>2 Adults</option>
                    <option value={3}>3 Adults</option>
                    <option value={4}>4 Adults</option>
                  </select>
                </div>

                <div className="form-group mb-0">
                  <label className="text-[10px] text-brand-gray-light font-bold tracking-wider">Class</label>
                  <select 
                    className="w-full px-3 py-2 bg-brand-black border border-brand-gray-dark/50 rounded text-brand-white outline-none focus:border-brand-red text-sm font-semibold transition-colors"
                    value={cabinClass} 
                    onChange={e => setCabinClass(e.target.value)}
                  >
                    <option value="Economy">Economy</option>
                    <option value="Business">Business</option>
                    <option value="First">First Class</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="w-full py-2.5 bg-brand-red text-brand-white font-bold rounded uppercase tracking-wider text-xs hover:bg-brand-red-light transition-all flex items-center justify-center gap-1 shadow shadow-brand-red/35 transform hover:-translate-y-0.5">
                {loading ? 'Searching...' : '🔍 Search Flights'}
              </button>
            </form>

            {/* Sidebar Suggestions */}
            {showSuggestions && (
              <div className="w-full lg:w-72 p-5 bg-brand-charcoal/80 border border-brand-gray-dark/40 rounded-xl space-y-4 shadow-xl backdrop-blur-md animate-fade-in-up [animation-delay:100ms] opacity-0 [animation-fill-mode:forwards]">
                <h3 className="text-sm font-bold font-heading">📅 Flight Schedule</h3>
                <div className="text-xs text-brand-red-light font-bold">{origin} ➔ {destination}</div>
                
                {suggestionsError ? (
                  <div className="text-xs text-brand-gray-muted italic">Failed to load schedule.</div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <div className="text-[9px] text-brand-gray-light font-bold uppercase tracking-wider mb-1">✈️ Outbound Dates</div>
                      <div className="flex flex-wrap gap-1.5">
                        {suggestions.outbound.length === 0 ? (
                          <div className="text-xs text-brand-gray-muted italic">No flights scheduled</div>
                        ) : (
                          suggestions.outbound.map(d => {
                            const isSelected = d === date;
                            const parts = d.split('-');
                            const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
                            const formatted = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                            return (
                              <button
                                key={`sug-out-${d}`}
                                type="button"
                                className={`px-2 py-1 text-[10px] font-semibold border rounded transition-colors ${
                                  isSelected 
                                    ? 'bg-brand-red border-brand-red text-brand-white' 
                                    : 'border-brand-gray-dark text-brand-gray-light hover:text-brand-white hover:border-brand-gray-muted'
                                }`}
                                onClick={() => handleDateBadgeClick(d, 'outbound')}
                              >
                                {formatted}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {tripType === 'round-trip' && (
                      <div>
                        <div className="text-[9px] text-brand-gray-light font-bold uppercase tracking-wider mb-1">🔄 Return Dates</div>
                        <div className="flex flex-wrap gap-1.5">
                          {suggestions.return.length === 0 ? (
                            <div className="text-xs text-brand-gray-muted italic">No flights scheduled</div>
                          ) : (
                            suggestions.return.map(d => {
                              const isSelected = d === returnDate;
                              const parts = d.split('-');
                              const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
                              const formatted = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                              return (
                                <button
                                  key={`sug-ret-${d}`}
                                  type="button"
                                  className={`px-2 py-1 text-[10px] font-semibold border rounded transition-colors ${
                                    isSelected 
                                      ? 'bg-brand-red border-brand-red text-brand-white' 
                                      : 'border-brand-gray-dark text-brand-gray-light hover:text-brand-white hover:border-brand-gray-muted'
                                  }`}
                                  onClick={() => handleDateBadgeClick(d, 'return')}
                                >
                                  {formatted}
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── Flight Cards Listings ── */}
      <div className="container-wide mx-auto px-6 py-12">
        {hasSearched ? (
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            
            {/* Left listings column */}
            <div className={`${(selectedOutbound || selectedReturn) ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-6`}>
              
              {/* Outbound Leg */}
              <div className="space-y-4 animate-fade-in-up">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold font-heading flex items-center gap-2">
                    <span>✈️ Outbound Flights</span>
                    <span className="text-xs font-normal text-brand-gray-light">({outboundFlights.length} found)</span>
                  </h3>
                  <div className="text-xs text-brand-gray-light">{searchSummaryText}</div>
                </div>

                {/* Available Date badge Strip */}
                {availableOutboundDates.length > 0 && (
                  <div className="p-4 bg-brand-charcoal/40 border border-brand-gray-dark/30 rounded-lg text-center space-y-2">
                    <div className="text-[10px] text-brand-gray-light font-bold uppercase tracking-wider">📅 Switch Outbound Dates</div>
                    <div className="flex flex-wrap gap-1.5 justify-center">
                      {availableOutboundDates.map(d => {
                        const isSelected = d === date;
                        const parts = d.split('-');
                        const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
                        const formatted = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                        return (
                          <button
                            key={`strip-out-${d}`}
                            type="button"
                            className={`px-2.5 py-1 text-xs font-semibold border rounded transition-all ${
                              isSelected 
                                ? 'bg-brand-red border-brand-red text-brand-white shadow-md shadow-brand-red/20' 
                                : 'border-brand-gray-dark/50 text-brand-gray-light hover:text-brand-white hover:border-brand-gray-muted'
                            }`}
                            onClick={() => handleDateBadgeClick(d, 'outbound')}
                          >
                            {formatted}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {loading ? (
                  <div className="flex justify-center py-12"><div className="spinner" /></div>
                ) : outboundFlights.length === 0 ? (
                  <div className="p-8 bg-brand-charcoal/20 border border-brand-gray-dark/20 rounded-xl text-center text-brand-gray-light">
                    No flights scheduled. Please select an available date badge.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {outboundFlights.map((f, idx) => {
                      const isSelected = selectedOutbound?.flight_id === f.flight_id;
                      const price = f[priceKey] || f.seat_price || f.base_price;
                      return (
                        <div
                          key={`out-${f.flight_id}`}
                          className={`p-5 bg-brand-charcoal/40 border rounded-xl cursor-pointer hover:border-brand-red/40 transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-red/5 flex flex-col gap-4 ${
                            isSelected ? 'border-brand-red bg-brand-red/5 shadow-md shadow-brand-red/5' : 'border-brand-gray-dark/40'
                          }`}
                          onClick={() => setSelectedOutbound(f)}
                          style={{ animationDelay: `${idx * 50}ms` }}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{getAirlineIcon(f.airline_code)}</span>
                              <div>
                                <div className="text-sm font-bold">{f.airline_name}</div>
                                <div className="text-xs text-brand-gray-light">{f.flight_number}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xl font-extrabold text-brand-red-light font-heading">{formatPrice(price)}</div>
                              <div className="text-[10px] text-brand-gray-light uppercase font-semibold">{cabinClass} / pax</div>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 items-center text-center">
                            <div className="text-left">
                              <div className="text-xl font-black font-heading text-brand-white">{f.origin_iata}</div>
                              <div className="text-[10px] text-brand-gray-light truncate">{f.origin_city}</div>
                              <div className="text-xs font-bold mt-1 text-brand-white/80">{formatTime(f.departure_time)}</div>
                            </div>
                            <div className="flex flex-col items-center">
                              <div className="text-[10px] text-brand-gray-light font-semibold mb-1">{formatDuration(f.duration)}</div>
                              <div className="w-full h-px bg-gradient-to-r from-brand-red to-brand-gray-muted relative">
                                <span className="absolute -top-1 left-0 text-[6px] text-brand-red">●</span>
                                <span className="absolute -top-1 right-0 text-[6px] text-brand-gray-muted">●</span>
                              </div>
                              <span className="text-xs text-brand-red mt-1 animate-pulse">✈</span>
                            </div>
                            <div className="text-right">
                              <div className="text-xl font-black font-heading text-brand-white">{f.dest_iata}</div>
                              <div className="text-[10px] text-brand-gray-light truncate">{f.dest_city}</div>
                              <div className="text-xs font-bold mt-1 text-brand-white/80">{formatTime(f.arrival_time)}</div>
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-xs border-t border-brand-gray-dark/30 pt-3 mt-1">
                            <div className="flex gap-2">
                              <span dangerouslySetInnerHTML={{ __html: getStatusBadge(f.status) }} />
                              <span className="px-2 py-0.5 rounded bg-brand-red/10 border border-brand-red/20 text-brand-red-light text-[10px] font-bold uppercase">
                                {f.seats_available || f.available_seats || '0'} Left
                              </span>
                            </div>
                            <div className="text-brand-gray-light text-[10px]">{formatDate(f.departure_time)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Return Leg */}
              {tripType === 'round-trip' && (
                <div className="space-y-4 animate-fade-in-up [animation-delay:100ms] opacity-0 [animation-fill-mode:forwards] mt-8">
                  <h3 className="text-lg font-bold font-heading">🔄 Return Flights</h3>
                  
                  {/* Return dates strip */}
                  {availableReturnDates.length > 0 && (
                    <div className="p-4 bg-brand-charcoal/40 border border-brand-gray-dark/30 rounded-lg text-center space-y-2">
                      <div className="text-[10px] text-brand-gray-light font-bold uppercase tracking-wider">📅 Switch Return Dates</div>
                      <div className="flex flex-wrap gap-1.5 justify-center">
                        {availableReturnDates.map(d => {
                          const isSelected = d === returnDate;
                          const parts = d.split('-');
                          const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
                          const formatted = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                          return (
                            <button
                              key={`strip-ret-${d}`}
                              type="button"
                              className={`px-2.5 py-1 text-xs font-semibold border rounded transition-all ${
                                isSelected 
                                  ? 'bg-brand-red border-brand-red text-brand-white shadow-md shadow-brand-red/20' 
                                  : 'border-brand-gray-dark/50 text-brand-gray-light hover:text-brand-white hover:border-brand-gray-muted'
                              }`}
                              onClick={() => handleDateBadgeClick(d, 'return')}
                            >
                              {formatted}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {loading ? (
                    <div className="flex justify-center py-12"><div className="spinner" /></div>
                  ) : returnFlights.length === 0 ? (
                    <div className="p-8 bg-brand-charcoal/20 border border-brand-gray-dark/20 rounded-xl text-center text-brand-gray-light">
                      No flights scheduled. Please select an available date badge.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {returnFlights.map((f, idx) => {
                        const isSelected = selectedReturn?.flight_id === f.flight_id;
                        const price = f[priceKey] || f.seat_price || f.base_price;
                        return (
                          <div
                            key={`ret-${f.flight_id}`}
                            className={`p-5 bg-brand-charcoal/40 border rounded-xl cursor-pointer hover:border-brand-red/40 transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-red/5 flex flex-col gap-4 ${
                              isSelected ? 'border-brand-red bg-brand-red/5 shadow-md shadow-brand-red/5' : 'border-brand-gray-dark/40'
                            }`}
                            onClick={() => setSelectedReturn(f)}
                            style={{ animationDelay: `${idx * 50}ms` }}
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">{getAirlineIcon(f.airline_code)}</span>
                                <div>
                                  <div className="text-sm font-bold">{f.airline_name}</div>
                                  <div className="text-xs text-brand-gray-light">{f.flight_number}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xl font-extrabold text-brand-red-light font-heading">{formatPrice(price)}</div>
                                <div className="text-[10px] text-brand-gray-light uppercase font-semibold">{cabinClass} / pax</div>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 items-center text-center">
                              <div className="text-left">
                                <div className="text-xl font-black font-heading text-brand-white">{f.origin_iata}</div>
                                <div className="text-[10px] text-brand-gray-light truncate">{f.origin_city}</div>
                                <div className="text-xs font-bold mt-1 text-brand-white/80">{formatTime(f.departure_time)}</div>
                              </div>
                              <div className="flex flex-col items-center">
                                <div className="text-[10px] text-brand-gray-light font-semibold mb-1">{formatDuration(f.duration)}</div>
                                <div className="w-full h-px bg-gradient-to-r from-brand-red to-brand-gray-muted relative">
                                  <span className="absolute -top-1 left-0 text-[6px] text-brand-red">●</span>
                                  <span className="absolute -top-1 right-0 text-[6px] text-brand-gray-muted">●</span>
                                </div>
                                <span className="text-xs text-brand-red mt-1 animate-pulse">✈</span>
                              </div>
                              <div className="text-right">
                                <div className="text-xl font-black font-heading text-brand-white">{f.dest_iata}</div>
                                <div className="text-[10px] text-brand-gray-light truncate">{f.dest_city}</div>
                                <div className="text-xs font-bold mt-1 text-brand-white/80">{formatTime(f.arrival_time)}</div>
                              </div>
                            </div>

                            <div className="flex justify-between items-center text-xs border-t border-brand-gray-dark/30 pt-3 mt-1">
                              <div className="flex gap-2">
                                <span dangerouslySetInnerHTML={{ __html: getStatusBadge(f.status) }} />
                                <span className="px-2 py-0.5 rounded bg-brand-red/10 border border-brand-red/20 text-brand-red-light text-[10px] font-bold uppercase">
                                  {f.seats_available || f.available_seats || '0'} Left
                                </span>
                              </div>
                              <div className="text-brand-gray-light text-[10px]">{formatDate(f.departure_time)}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Booking Summary panel */}
            {(selectedOutbound || selectedReturn) && (
              <div className="lg:col-span-4 sticky top-24 animate-fade-in-up [animation-delay:150ms] opacity-0 [animation-fill-mode:forwards]">
                <div className="p-6 bg-brand-charcoal border border-brand-gray-dark/40 rounded-xl space-y-4 shadow-xl">
                  <h4 className="text-base font-bold font-heading uppercase tracking-wider border-b border-brand-gray-dark/40 pb-2">
                    🧾 Booking Summary
                  </h4>
                  
                  {selectedOutbound && (
                    <div className="space-y-1">
                      <div className="text-xs text-brand-red-light font-bold">OUTBOUND</div>
                      <div className="text-sm font-semibold">{selectedOutbound.flight_number} · {selectedOutbound.origin_iata}➔{selectedOutbound.dest_iata}</div>
                      <div className="text-xs text-brand-gray-light">{formatTime(selectedOutbound.departure_time)} · {formatPrice(outPrice)}</div>
                    </div>
                  )}

                  {selectedReturn && (
                    <div className="space-y-1 pt-3 border-t border-brand-gray-dark/20">
                      <div className="text-xs text-brand-red-light font-bold">RETURN</div>
                      <div className="text-sm font-semibold">{selectedReturn.flight_number} · {selectedReturn.origin_iata}➔{selectedReturn.dest_iata}</div>
                      <div className="text-xs text-brand-gray-light">{formatTime(selectedReturn.departure_time)} · {formatPrice(retPrice)}</div>
                    </div>
                  )}

                  <div className="border-t border-brand-gray-dark/40 pt-3 flex justify-between items-center">
                    <span className="text-sm font-semibold text-brand-gray-light">Total Price</span>
                    <span className="text-2xl font-black text-brand-red-light font-heading">{formatPrice(totalPrice)}</span>
                  </div>

                  <button
                    onClick={handleContinue}
                    disabled={!canContinue}
                    className="w-full py-3 bg-brand-red text-brand-white font-bold rounded uppercase tracking-wider text-xs hover:bg-brand-red-light disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow shadow-brand-red/25 transform hover:-translate-y-0.5 mt-2"
                  >
                    Continue to Seat Selection →
                  </button>
                  <p className="text-center text-[10px] text-brand-gray-light">No hidden fees. Free cancellation within 24h.</p>
                </div>
              </div>
            )}

          </div>
        ) : (
          <div className="py-20 text-center space-y-3 max-w-sm mx-auto">
            <div className="text-6xl animate-bounce">🔍</div>
            <h3 className="text-lg font-bold font-heading">Search for flights above</h3>
            <p className="text-xs text-brand-gray-light">Enter your origin, destination and travel dates to find available flights</p>
          </div>
        )}
      </div>

    </div>
  );
}
