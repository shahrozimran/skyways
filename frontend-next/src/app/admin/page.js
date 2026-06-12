'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Api, Auth, formatPrice, formatDate, formatTime, formatDateTime, getStatusBadge } from '@/utils/api';
import { useAuth } from '@/context/AuthContext';

export default function AdminPage() {
  const router = useRouter();
  const { isLoggedIn, isAdmin, logout } = useAuth();
  
  // Navigation
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  
  // KPI state
  const [kpis, setKpis] = useState({
    bookings: 0,
    confirmed: 0,
    revenue: 0,
    passengers: 0,
    flights: 0,
  });

  // Revenue chart filter & data
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [revenueData, setRevenueData] = useState([]);
  const [totalRevenueDisplay, setTotalRevenueDisplay] = useState(0);

  // Popular routes data
  const [popularRoutes, setPopularRoutes] = useState([]);

  // Flights table list
  const [flights, setFlights] = useState([]);

  // Passengers list
  const [passengers, setPassengers] = useState([]);
  const [passengersLoading, setPassengersLoading] = useState(false);

  // Airline revenue analytics
  const [airlineRevenue, setAirlineRevenue] = useState([]);
  const [airlineLoading, setAirlineLoading] = useState(false);

  // Page level permission check
  useEffect(() => {
    const token = localStorage.getItem('sb_token');
    const user = Auth.getUser();
    if (!token || !user || !user.is_admin) {
      window.showToast?.('Access Denied. Admins Only.', 'error');
      router.push('/');
      return;
    }

    loadInitialData();
  }, []);

  async function loadInitialData() {
    setLoading(true);
    try {
      const summary = await Api.get('/reports/summary', true);
      setKpis({
        bookings: summary.total_bookings || 0,
        confirmed: summary.confirmed_bookings || 0,
        revenue: summary.total_revenue || 0,
        passengers: summary.total_passengers || 0,
        flights: summary.active_flights || 0,
      });

      await fetchRevenueChart();
      await fetchFlights();

      const routesData = await Api.get('/reports/popular-routes', true);
      setPopularRoutes(routesData.routes || []);

    } catch (err) {
      window.showToast?.(`Error loading dashboard: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function fetchRevenueChart(start = '', end = '') {
    try {
      let url = '/reports/revenue';
      const qs = [];
      if (start) qs.push(`start_date=${start}`);
      if (end) qs.push(`end_date=${end}`);
      if (qs.length) url += '?' + qs.join('&');

      const data = await Api.get(url, true);
      const rows = data.report || [];
      
      const byDate = {};
      rows.forEach(r => {
        byDate[r.report_date] = (byDate[r.report_date] || 0) + parseFloat(r.revenue || 0);
      });

      const sortedDates = Object.keys(byDate).sort();
      const chartPoints = sortedDates.map(d => ({ date: d, value: byDate[d] }));

      setRevenueData(chartPoints);
      setTotalRevenueDisplay(data.total_revenue || 0);
    } catch (err) {
      window.showToast?.(err.message, 'error');
    }
  }

  async function fetchFlights() {
    try {
      const data = await Api.get('/admin/flights', true);
      setFlights(data.flights || []);
    } catch (err) {
      window.showToast?.(err.message, 'error');
    }
  }

  async function fetchPassengers() {
    setPassengersLoading(true);
    try {
      const data = await Api.get('/admin/passengers', true);
      setPassengers(data.passengers || []);
    } catch (err) {
      window.showToast?.(err.message, 'error');
    } finally {
      setPassengersLoading(false);
    }
  }

  async function fetchAirlineRevenue() {
    setAirlineLoading(true);
    try {
      const data = await Api.get('/reports/airlines', true);
      setAirlineRevenue(data.airlines || []);
    } catch (err) {
      window.showToast?.(err.message, 'error');
    } finally {
      setAirlineLoading(false);
    }
  }

  function handleTabChange(tab) {
    setActiveTab(tab);
    if (tab === 'passengers') fetchPassengers();
    if (tab === 'analytics') fetchAirlineRevenue();
  }

  async function handleEditFlight(flightId, currentStatus) {
    const newStatus = prompt('Update status (Scheduled, Delayed, Cancelled, Completed):', currentStatus);
    if (!newStatus || newStatus === currentStatus) return;

    const validStatuses = ['Scheduled', 'Delayed', 'Cancelled', 'Completed'];
    if (!validStatuses.includes(newStatus)) {
      window.showToast?.(`Invalid status. Use: ${validStatuses.join(', ')}`, 'warning');
      return;
    }

    try {
      await Api.put(`/admin/flights/${flightId}`, { status: newStatus }, true);
      window.showToast?.('Flight status updated ✓', 'success');
      await fetchFlights();
    } catch (err) {
      window.showToast?.(err.message, 'error');
    }
  }

  async function handleCancelFlight(flightId) {
    if (!confirm('Cancel this flight? All bookings for this flight will be cancelled.')) return;
    try {
      await Api.del(`/admin/flights/${flightId}`, true);
      window.showToast?.('Flight cancelled successfully', 'success');
      await fetchFlights();
    } catch (err) {
      window.showToast?.(err.message, 'error');
    }
  }

  function handleApplyRevenueFilter() {
    fetchRevenueChart(startDate, endDate);
  }

  if (loading) {
    return (
      <div className="page-wrapper flex-center bg-brand-black min-h-screen">
        <div className="spinner" />
      </div>
    );
  }

  // ── Render Custom SVG Line Chart for Revenue ──
  function renderRevenueChartSVG() {
    if (revenueData.length === 0) {
      return <div className="text-center text-brand-gray-light py-8 text-xs italic">No data available for dates selected.</div>;
    }

    const width = 500;
    const height = 200;
    const padding = 30;

    const maxVal = Math.max(...revenueData.map(d => d.value), 100) * 1.1;
    
    const points = revenueData.map((d, i) => {
      const x = padding + (i * (width - padding * 2)) / (revenueData.length - 1 || 1);
      const y = height - padding - (d.value * (height - padding * 2)) / maxVal;
      return { x, y, date: d.date, value: d.value };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = points.length > 0 
      ? `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z` 
      : '';

    return (
      <div className="pt-2 animate-fade-in">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--red-primary)" stopOpacity="0.35"/>
              <stop offset="100%" stopColor="var(--red-primary)" stopOpacity="0.0"/>
            </linearGradient>
          </defs>
          
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const y = padding + pct * (height - padding * 2);
            const val = maxVal * (1 - pct);
            return (
              <g key={`y-${idx}`}>
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                <text x={padding - 6} y={y + 3} textAnchor="end" fill="var(--text-muted)" fontSize="7" fontWeight="bold">
                  {formatPrice(val).split('.')[0]}
                </text>
              </g>
            );
          })}

          {/* Points area */}
          <path d={areaPath} fill="url(#areaGrad)" />
          <path d={linePath} fill="none" stroke="var(--red-primary)" strokeWidth="2" />

          {/* Dots */}
          {points.map((p, idx) => (
            <circle
              key={`dot-${idx}`}
              cx={p.x}
              cy={p.y}
              r="3"
              fill="var(--bg-primary)"
              stroke="var(--red-primary)"
              strokeWidth="1.5"
            >
              <title>{p.date}: {formatPrice(p.value)}</title>
            </circle>
          ))}
        </svg>
      </div>
    );
  }

  // ── Render Custom SVG Bar Chart for Airline Revenue ──
  function renderAirlineChartSVG() {
    if (airlineRevenue.length === 0) {
      return <div className="text-center text-brand-gray-light py-8 text-xs italic">No airline data recorded.</div>;
    }

    const width = 400;
    const height = 220;
    const paddingLeft = 60;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 40;

    const maxVal = Math.max(...airlineRevenue.map(a => parseFloat(a.total_revenue)), 100) * 1.1;
    const barWidth = 36;
    const gap = (width - paddingLeft - paddingRight - (airlineRevenue.length * barWidth)) / (airlineRevenue.length + 1 || 1);

    return (
      <div className="pt-2 animate-fade-in">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--red-primary)" stopOpacity="0.8"/>
              <stop offset="100%" stopColor="var(--red-primary)" stopOpacity="0.2"/>
            </linearGradient>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const y = paddingTop + pct * (height - paddingTop - paddingBottom);
            const val = maxVal * (1 - pct);
            return (
              <g key={`al-y-${idx}`}>
                <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                <text x={paddingLeft - 8} y={y + 3} textAnchor="end" fill="var(--text-muted)" fontSize="7" fontWeight="bold">
                  {formatPrice(val).split('.')[0]}
                </text>
              </g>
            );
          })}

          {airlineRevenue.map((a, idx) => {
            const val = parseFloat(a.total_revenue) || 0;
            const x = paddingLeft + gap + idx * (barWidth + gap);
            const barHeight = (val * (height - paddingTop - paddingBottom)) / maxVal;
            const y = height - paddingBottom - barHeight;

            return (
              <g key={`al-bar-${idx}`}>
                <rect x={x} y={y} width={barWidth} height={barHeight > 0 ? barHeight : 2} fill="url(#barGrad)" rx="3" />
                <text x={x + barWidth / 2} y={height - 24} textAnchor="middle" fill="var(--text-primary)" fontSize="8" fontWeight="600">
                  {a.airline_name.substring(0, 10)}
                </text>
                <text x={x + barWidth / 2} y={height - 12} textAnchor="middle" fill="var(--text-muted)" fontSize="7">
                  {formatPrice(val).split('.')[0]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  function renderPopularRoutesChartSVG() {
    const list = popularRoutes.slice(0, 7);
    if (list.length === 0) return <div className="text-center text-brand-gray-light py-8 text-xs italic">No route statistics.</div>;

    const totalBookings = list.reduce((sum, r) => sum + r.total_bookings, 0);
    
    return (
      <div className="space-y-4 pt-2">
        {list.map((r, i) => {
          const pct = Math.max(((r.total_bookings / totalBookings) * 100), 2);
          return (
            <div key={i} className="space-y-1 transform hover:translate-x-1 transition-transform duration-200">
              <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-1 font-semibold">
                  <span className="px-1.5 py-0.5 rounded bg-brand-red/15 border border-brand-red/20 text-brand-red-light text-[9px] font-bold">#{i+1}</span>
                  {r.origin_iata} ➔ {r.dest_iata}
                  <span className="text-[10px] text-brand-gray-light font-normal">({r.origin_city})</span>
                </span>
                <span className="text-brand-gray-light font-medium">{r.total_bookings} bookings ({pct.toFixed(0)}%)</span>
              </div>
              <div className="h-1.5 w-full bg-brand-gray-dark/50 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-brand-red-dark via-brand-red to-brand-red-light rounded-full" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="bg-brand-black text-brand-white min-h-screen font-body pt-20">
      <div className="flex flex-col md:flex-row min-h-[calc(100vh-80px)]">
        
        {/* Admin Navigation Sidebar */}
        <aside className="w-full md:w-64 bg-brand-charcoal/60 border-r border-brand-gray-dark/40 p-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="text-[10px] text-brand-gray-light font-bold uppercase tracking-widest pl-3">Admin Panel</div>
            
            <nav className="flex flex-col gap-1 list-none">
              {[
                { id: 'dashboard', label: '📊 Dashboard' },
                { id: 'flights', label: '✈️ Flights' },
                { id: 'passengers', label: '👥 Passengers' },
                { id: 'analytics', label: '📈 Analytics' },
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  className={`w-full text-left px-4 py-2.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                    activeTab === t.id
                      ? 'bg-brand-red/10 border-l-2 border-brand-red text-brand-white'
                      : 'text-brand-gray-light hover:bg-brand-card hover:text-brand-white'
                  }`}
                  onClick={() => handleTabChange(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          </div>

          <button className="w-full mt-6 py-2.5 border border-brand-gray-muted/30 text-brand-gray-light hover:text-brand-white hover:border-brand-red rounded-lg text-xs font-bold uppercase tracking-wider transition-all" onClick={logout}>
            🚪 Logout
          </button>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-6 md:p-10 overflow-x-hidden">

          {/* Subtab 1: Dashboard Panel */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fade-in-up">
              <h2 className="text-xl font-bold font-heading">📊 Dashboard Overview</h2>

              {/* KPI indicators card grids */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-6 bg-brand-charcoal border border-brand-gray-dark/40 rounded-xl shadow flex items-center gap-4">
                  <div className="text-3xl">📋</div>
                  <div>
                    <div className="text-2xl font-extrabold">{kpis.bookings}</div>
                    <div className="text-[9px] uppercase font-bold text-brand-gray-light tracking-wider">Total Bookings</div>
                  </div>
                </div>
                <div className="p-6 bg-brand-charcoal border border-brand-gray-dark/40 rounded-xl shadow flex items-center gap-4">
                  <div className="text-3xl text-green-500">✅</div>
                  <div>
                    <div className="text-2xl font-extrabold">{kpis.confirmed}</div>
                    <div className="text-[9px] uppercase font-bold text-brand-gray-light tracking-wider">Confirmed</div>
                  </div>
                </div>
                <div className="p-6 bg-brand-charcoal border border-brand-gray-dark/40 rounded-xl shadow flex items-center gap-4">
                  <div className="text-3xl text-brand-red-light">💰</div>
                  <div>
                    <div className="text-xl font-extrabold tracking-tight">{formatPrice(kpis.revenue).split('.')[0]}</div>
                    <div className="text-[9px] uppercase font-bold text-brand-gray-light tracking-wider">Total Revenue</div>
                  </div>
                </div>
                <div className="p-6 bg-brand-charcoal border border-brand-gray-dark/40 rounded-xl shadow flex items-center gap-4">
                  <div className="text-3xl text-yellow-500">👥</div>
                  <div>
                    <div className="text-2xl font-extrabold">{kpis.passengers}</div>
                    <div className="text-[9px] uppercase font-bold text-brand-gray-light tracking-wider">Passengers</div>
                  </div>
                </div>
              </div>

              <div className="grid lg:grid-cols-12 gap-6 items-start">
                
                {/* SVG Revenue timeline */}
                <div className="lg:col-span-7 p-6 bg-brand-charcoal border border-brand-gray-dark/40 rounded-xl space-y-4 shadow-xl">
                  <div className="flex justify-between items-center border-b border-brand-gray-dark/30 pb-2">
                    <h4 className="font-bold font-heading text-sm">💰 Revenue Flow</h4>
                    <span className="text-base font-extrabold text-brand-red-light font-heading">{formatPrice(totalRevenueDisplay)}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 text-xs">
                    <input type="date" className="px-3 py-1.5 bg-brand-black border border-brand-gray-dark/50 rounded text-brand-white outline-none focus:border-brand-red text-xs transition-colors" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    <input type="date" className="px-3 py-1.5 bg-brand-black border border-brand-gray-dark/50 rounded text-brand-white outline-none focus:border-brand-red text-xs transition-colors" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    <button className="px-3 py-1.5 bg-brand-red text-brand-white font-bold rounded uppercase tracking-wider text-[10px]" onClick={handleApplyRevenueFilter}>Apply</button>
                  </div>

                  {renderRevenueChartSVG()}
                </div>

                {/* SVG Horizontal routes */}
                <div className="lg:col-span-5 p-6 bg-brand-charcoal border border-brand-gray-dark/40 rounded-xl space-y-4 shadow-xl">
                  <h4 className="font-bold font-heading text-sm border-b border-brand-gray-dark/30 pb-2">🗺️ Popular Corridors</h4>
                  {renderPopularRoutesChartSVG()}
                </div>
              </div>
            </div>
          )}

          {/* Subtab 2: Flights Panel */}
          {activeTab === 'flights' && (
            <div className="space-y-6 animate-fade-in-up">
              <h2 className="text-xl font-bold font-heading">✈️ Flight Management</h2>

              <div className="overflow-x-auto bg-brand-charcoal border border-brand-gray-dark/40 rounded-xl shadow-xl">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-brand-black/50 border-b border-brand-gray-dark/40 uppercase tracking-wider text-[10px] text-brand-gray-light font-bold">
                      <th className="px-6 py-4">Flight</th>
                      <th className="px-6 py-4">Airline</th>
                      <th className="px-6 py-4">Route</th>
                      <th className="px-6 py-4">Departure</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Seats</th>
                      <th className="px-6 py-4">Occupancy</th>
                      <th className="px-6 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-gray-dark/30">
                    {flights.length === 0 ? (
                      <tr><td colSpan="8" className="px-6 py-8 text-center text-brand-gray-light italic">No flights recorded.</td></tr>
                    ) : (
                      flights.map(f => (
                        <tr key={f.flight_id} className="hover:bg-brand-card/30 transition-colors">
                          <td className="px-6 py-4 font-bold text-brand-white">{f.flight_number}</td>
                          <td className="px-6 py-4">{f.airline_name}</td>
                          <td className="px-6 py-4">{f.route}</td>
                          <td className="px-6 py-4 font-semibold text-brand-white/80">{formatDateTime(f.departure_time)}</td>
                          <td className="px-6 py-4">
                            <span dangerouslySetInnerHTML={{ __html: getStatusBadge(f.status) }} />
                          </td>
                          <td className="px-6 py-4">{f.total_seats}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 max-w-[120px]">
                              <div className="flex-1 h-1.5 bg-brand-black rounded-full overflow-hidden">
                                <div className="h-full bg-brand-red rounded-full" style={{ width: `${f.occupancy_pct || 0}%` }} />
                              </div>
                              <span className="text-[10px] font-bold text-brand-gray-light">{f.occupancy_pct || 0}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button className="px-2.5 py-1.5 border border-brand-gray-dark/50 hover:border-brand-white text-[10px] font-bold uppercase rounded transition-colors" onClick={() => handleEditFlight(f.flight_id, f.status)}>
                                Edit
                              </button>
                              {f.status !== 'Cancelled' && f.status !== 'Completed' && (
                                <button className="px-2.5 py-1.5 bg-brand-red/10 border border-brand-red/20 text-brand-red-light text-[10px] font-bold rounded uppercase hover:bg-brand-red/20 transition-colors" onClick={() => handleCancelFlight(f.flight_id)}>
                                  Cancel
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Subtab 3: Passengers Panel */}
          {activeTab === 'passengers' && (
            <div className="space-y-6 animate-fade-in-up">
              <h2 className="text-xl font-bold font-heading">👥 Passenger Management</h2>

              <div className="overflow-x-auto bg-brand-charcoal border border-brand-gray-dark/40 rounded-xl shadow-xl">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-brand-black/50 border-b border-brand-gray-dark/40 uppercase tracking-wider text-[10px] text-brand-gray-light font-bold">
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">Nationality</th>
                      <th className="px-6 py-4">Bookings</th>
                      <th className="px-6 py-4">Confirmed</th>
                      <th className="px-6 py-4">Total Spent</th>
                      <th className="px-6 py-4">Last Booking</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-gray-dark/30">
                    {passengersLoading ? (
                      <tr><td colSpan="7" className="px-6 py-8 text-center"><div className="spinner mx-auto" /></td></tr>
                    ) : passengers.length === 0 ? (
                      <tr><td colSpan="7" className="px-6 py-8 text-center text-brand-gray-light italic">No passengers registered.</td></tr>
                    ) : (
                      passengers.map((p, idx) => (
                        <tr key={idx} className="hover:bg-brand-card/30 transition-colors">
                          <td className="px-6 py-4 font-bold text-brand-white">{p.full_name}</td>
                          <td className="px-6 py-4">{p.email}</td>
                          <td className="px-6 py-4">{p.nationality || '—'}</td>
                          <td className="px-6 py-4">{p.total_bookings || 0}</td>
                          <td className="px-6 py-4">{p.confirmed_bookings || 0}</td>
                          <td className="px-6 py-4 font-bold text-brand-red-light">{formatPrice(p.total_spent)}</td>
                          <td className="px-6 py-4">{p.last_booking_date ? formatDate(p.last_booking_date) : '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Subtab 4: Analytics Panel */}
          {activeTab === 'analytics' && (
            <div className="space-y-6 animate-fade-in-up">
              <h2 className="text-xl font-bold font-heading">📈 Revenue Analytics</h2>

              <div className="grid lg:grid-cols-2 gap-6">
                
                {/* SVG Comparative Airline Bar Chart */}
                <div className="p-6 bg-brand-charcoal border border-brand-gray-dark/40 rounded-xl space-y-4 shadow-xl">
                  <h4 className="font-bold font-heading text-sm border-b border-brand-gray-dark/30 pb-2">Revenue by Airline</h4>
                  {airlineLoading ? (
                    <div className="flex justify-center py-12"><div className="spinner" /></div>
                  ) : (
                    renderAirlineChartSVG()
                  )}
                </div>

                {/* Key KPIs lists */}
                <div className="p-6 bg-brand-charcoal border border-brand-gray-dark/40 rounded-xl space-y-4 shadow-xl">
                  <h4 className="font-bold font-heading text-sm border-b border-brand-gray-dark/30 pb-2">KPI Summaries</h4>
                  
                  <div className="divide-y divide-brand-gray-dark/30 text-xs">
                    <div className="flex justify-between items-center py-3">
                      <span className="text-brand-gray-light font-semibold">Active Scheduled Flights</span>
                      <span className="font-bold text-brand-white text-sm">{kpis.flights}</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-brand-gray-light font-semibold">Total Ticket Revenue</span>
                      <span className="font-extrabold text-brand-red-light text-sm">{formatPrice(kpis.revenue)}</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-brand-gray-light font-semibold">Average Revenue Per Ticket</span>
                      <span className="font-bold text-brand-white text-sm">
                        {formatPrice(kpis.bookings > 0 ? kpis.revenue / kpis.bookings : 0)}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
