'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SearchStore } from '@/utils/api';

// Custom transparent SVG logo component of a tilted airplane
const LogoIcon = () => (
  <svg 
    className="w-8 h-8 text-brand-red transform -rotate-45 hover:rotate-0 transition-transform duration-500" 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path 
      d="M21 16V14L13 9V3.5C13 2.67 12.33 2 11.5 2C10.67 2 10 2.67 10 3.5V9L2 14V16L10 13.5V19L8 20.5V22L11.5 21L15 22V20.5L13 19V13.5L21 16Z" 
      fill="currentColor"
    />
  </svg>
);

function AnimatedCounter({ val, duration = 1500 }) {
  const [count, setCount] = useState('0');

  useEffect(() => {
    const match = val.match(/^([\d.]+)(.*)$/);
    if (!match) {
      setCount(val);
      return;
    }

    const targetNum = parseFloat(match[1]);
    const suffix = match[2];
    const hasDecimal = match[1].includes('.');

    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      const easedProgress = progress * (2 - progress); // easeOutQuad
      const currentVal = easedProgress * targetNum;
      
      if (hasDecimal) {
        setCount(currentVal.toFixed(1) + suffix);
      } else {
        setCount(Math.floor(currentVal) + suffix);
      }

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    
    window.requestAnimationFrame(step);
  }, [val, duration]);

  return <span>{count}</span>;
}

export default function HomePage() {
  const router = useRouter();
  const [tripType, setTripType] = useState('one-way');
  const [origin, setOrigin] = useState('');
  const [dest, setDest] = useState('');
  const [date, setDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [passengers, setPassengers] = useState(1);
  const [cabinClass, setCabinClass] = useState('Economy');

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setDate(today);
  }, []);

  const popularRoutes = [
    { from: 'KHI', to: 'DXB', fromName: 'Karachi', toName: 'Dubai', fromFlag: '🇵🇰', toFlag: '🇦🇪', price: '$280', time: '3h', badge: 'Popular', badgeClass: 'bg-brand-red/10 border-brand-red/30 text-brand-red-light' },
    { from: 'KHI', to: 'LHR', fromName: 'Karachi', toName: 'London', fromFlag: '🇵🇰', toFlag: '🇬🇧', price: '$620', time: '8h', badge: 'Best Value', badgeClass: 'bg-brand-white/10 border-brand-white/20 text-brand-white' },
    { from: 'DXB', to: 'JFK', fromName: 'Dubai', toName: 'New York', fromFlag: '🇦🇪', toFlag: '🇺🇸', price: '$850', time: '14h', badge: 'Long Haul', badgeClass: 'bg-brand-gray-muted/10 border-brand-gray-muted/30 text-brand-gray-light' },
    { from: 'KHI', to: 'ISB', fromName: 'Karachi', toName: 'Islamabad', fromFlag: '🇵🇰', toFlag: '🇵🇰', price: '$120', time: '2h', badge: 'Frequent', badgeClass: 'bg-brand-red/10 border-brand-red/30 text-brand-red-light' },
    { from: 'DXB', to: 'LHR', fromName: 'Dubai', toName: 'London', fromFlag: '🇦🇪', toFlag: '🇬🇧', price: '$450', time: '7h', badge: 'Trending', badgeClass: 'bg-brand-white/10 border-brand-white/20 text-brand-white' },
    { from: 'LHR', to: 'JFK', fromName: 'London', toName: 'New York', fromFlag: '🇬🇧', toFlag: '🇺🇸', price: '$550', time: '8h', badge: 'Business Choice', badgeClass: 'bg-brand-gray-muted/10 border-brand-gray-muted/30 text-brand-gray-light' }
  ];

  const [carouselIndex, setCarouselIndex] = useState(0);
  const [cardsToShow, setCardsToShow] = useState(3);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < 640) {
        setCardsToShow(1);
      } else if (window.innerWidth < 1024) {
        setCardsToShow(2);
      } else {
        setCardsToShow(3);
      }
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const maxIndex = popularRoutes.length - cardsToShow;

  function handlePrev() {
    setCarouselIndex(prev => Math.max(prev - 1, 0));
  }

  function handleNext() {
    setCarouselIndex(prev => Math.min(prev + 1, maxIndex));
  }

  function handleSearch(e) {
    e.preventDefault();
    if (!origin || !dest || !date) {
      window.showToast?.('Please fill in From, To, and Departure date', 'warning');
      return;
    }
    SearchStore.set({
      origin: origin.toUpperCase(),
      destination: dest.toUpperCase(),
      date,
      return_date: returnDate,
      trip_type: tripType,
      passengers: parseInt(passengers),
      class: cabinClass,
    });
    router.push('/search');
  }

  function quickSearch(o, d) {
    SearchStore.set({ 
      origin: o, 
      destination: d, 
      date: new Date().toISOString().split('T')[0], 
      trip_type: 'one-way', 
      passengers: 1, 
      class: 'Economy' 
    });
    router.push('/search');
  }

  return (
    <div className="bg-brand-black text-brand-white min-h-screen font-body overflow-x-hidden">
      
      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center bg-gradient-to-br from-brand-black via-[#160000] to-brand-black overflow-hidden pt-20">
        {/* Animated background glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_50%_at_75%_40%,rgba(220,38,38,0.12)_0%,transparent_65%),radial-gradient(ellipse_35%_40%_at_15%_70%,rgba(180,10,10,0.08)_0%,transparent_55%)] animate-pulse-glow pointer-events-none" />
        
        {/* Animated grid line background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(220,38,38,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(220,38,38,0.04)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none opacity-40" />

        <div className="container relative z-10 mx-auto px-6 w-full py-16">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            
            {/* Left intro panel */}
            <div className="lg:col-span-6 space-y-6 animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand-red/35 bg-brand-red/10 text-brand-red-light text-xs font-semibold uppercase tracking-wider">
                ✈️ Premium Flight Booking Platform
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black font-heading tracking-tight leading-none">
                Your next adventure <br />
                starts with <span className="gradient-text font-black">SkyWays</span>
              </h1>
              <p className="text-brand-gray-light text-base md:text-lg max-w-lg leading-relaxed">
                Compare hundreds of flights across top airlines. Book instantly with real-time seat selection, secure payments, and digital boarding passes.
              </p>
            </div>

            {/* Right Form Panel */}
            <div className="lg:col-span-6 animate-fade-in-up [animation-delay:150ms] opacity-0 [animation-fill-mode:forwards]">
              <div className="bg-brand-charcoal/80 border border-brand-gray-dark/40 rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-2xl shadow-black/80">
                
                {/* Trip Type Tabs */}
                <div className="flex gap-2 mb-6">
                  {['one-way', 'round-trip'].map(type => (
                    <button
                      key={type}
                      type="button"
                      className={`px-4 py-2 text-xs font-semibold rounded-md uppercase tracking-wider transition-all duration-300 ${
                        tripType === type
                          ? 'bg-brand-red text-brand-white shadow-md shadow-brand-red/30'
                          : 'text-brand-gray-light border border-brand-gray-dark/50 hover:bg-brand-card hover:text-brand-white'
                      }`}
                      onClick={() => {
                        setTripType(type);
                        if (type === 'one-way') setReturnDate('');
                      }}
                    >
                      {type === 'one-way' ? 'One Way' : 'Round Trip'}
                    </button>
                  ))}
                </div>

                {/* Form inputs */}
                <form onSubmit={handleSearch} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="form-group mb-0">
                      <label className="text-xs uppercase font-semibold text-brand-gray-light tracking-wider">From</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gray-muted text-base">🛫</span>
                        <input
                          type="text"
                          placeholder="KHI"
                          maxLength={3}
                          className="pl-11 pr-4 py-3 bg-brand-black/50 border border-brand-gray-dark/50 rounded-lg text-brand-white focus:border-brand-red focus:ring-2 focus:ring-brand-red-glow outline-none w-full transition-all text-sm uppercase font-semibold"
                          value={origin}
                          onChange={e => setOrigin(e.target.value.toUpperCase())}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group mb-0">
                      <label className="text-xs uppercase font-semibold text-brand-gray-light tracking-wider">To</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gray-muted text-base">🛬</span>
                        <input
                          type="text"
                          placeholder="DXB"
                          maxLength={3}
                          className="pl-11 pr-4 py-3 bg-brand-black/50 border border-brand-gray-dark/50 rounded-lg text-brand-white focus:border-brand-red focus:ring-2 focus:ring-brand-red-glow outline-none w-full transition-all text-sm uppercase font-semibold"
                          value={dest}
                          onChange={e => setDest(e.target.value.toUpperCase())}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="form-group mb-0">
                      <label className="text-xs uppercase font-semibold text-brand-gray-light tracking-wider">Departure</label>
                      <input
                        type="date"
                        className="px-4 py-3 bg-brand-black/50 border border-brand-gray-dark/50 rounded-lg text-brand-white focus:border-brand-red focus:ring-2 focus:ring-brand-red-glow outline-none w-full transition-all text-sm font-semibold"
                        value={date}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={e => setDate(e.target.value)}
                        required
                      />
                    </div>

                    {tripType === 'round-trip' ? (
                      <div className="form-group mb-0 animate-fade-in">
                        <label className="text-xs uppercase font-semibold text-brand-gray-light tracking-wider">Return</label>
                        <input
                          type="date"
                          className="px-4 py-3 bg-brand-black/50 border border-brand-gray-dark/50 rounded-lg text-brand-white focus:border-brand-red focus:ring-2 focus:ring-brand-red-glow outline-none w-full transition-all text-sm font-semibold"
                          value={returnDate}
                          min={date || new Date().toISOString().split('T')[0]}
                          onChange={e => setReturnDate(e.target.value)}
                          required
                        />
                      </div>
                    ) : (
                      <div className="form-group mb-0 hidden md:block opacity-0 pointer-events-none">
                        <label className="text-xs">&nbsp;</label>
                        <div className="py-3">&nbsp;</div>
                      </div>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="form-group mb-0">
                      <label className="text-xs uppercase font-semibold text-brand-gray-light tracking-wider">Passengers</label>
                      <select
                        className="px-4 py-3 bg-brand-black/50 border border-brand-gray-dark/50 rounded-lg text-brand-white focus:border-brand-red focus:ring-2 focus:ring-brand-red-glow outline-none w-full transition-all text-sm font-semibold"
                        value={passengers}
                        onChange={e => setPassengers(e.target.value)}
                      >
                        <option value={1}>1 Adult</option>
                        <option value={2}>2 Adults</option>
                        <option value={3}>3 Adults</option>
                        <option value={4}>4 Adults</option>
                      </select>
                    </div>

                    <div className="form-group mb-0">
                      <label className="text-xs uppercase font-semibold text-brand-gray-light tracking-wider">Class</label>
                      <select
                        className="px-4 py-3 bg-brand-black/50 border border-brand-gray-dark/50 rounded-lg text-brand-white focus:border-brand-red focus:ring-2 focus:ring-brand-red-glow outline-none w-full transition-all text-sm font-semibold"
                        value={cabinClass}
                        onChange={e => setCabinClass(e.target.value)}
                      >
                        <option value="Economy">Economy</option>
                        <option value="Business">Business</option>
                        <option value="First">First Class</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 text-center text-sm font-bold uppercase tracking-wider text-brand-white bg-gradient-to-r from-brand-red-dark via-brand-red to-brand-red-light rounded-lg shadow-xl shadow-brand-red/20 hover:shadow-2xl hover:shadow-brand-red/40 transform hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 mt-4"
                  >
                    <span>🔍 Search Flights</span>
                  </button>
                </form>
              </div>
            </div>

          </div>
        </div>

        {/* Floating plane icon */}
        <div className="absolute right-12 bottom-20 text-[10rem] opacity-[0.03] select-none pointer-events-none animate-float hidden lg:block">
          ✈
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="bg-brand-charcoal/50 border-y border-brand-gray-dark/40 py-8 backdrop-blur-md">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { val: '50+', label: 'Destinations', color: 'text-brand-red' },
              { val: '4', label: 'Partner Airlines', color: 'text-brand-white' },
              { val: '99.8%', label: 'On-time Rate', color: 'text-green-500' },
              { val: '24/7', label: 'Support', color: 'text-brand-gray-light' },
            ].map((s, idx) => (
              <div key={idx} className="space-y-1 transform hover:scale-105 transition-transform duration-300">
                <div className={`font-heading text-3xl md:text-4xl font-extrabold ${s.color}`}>
                  <AnimatedCounter val={s.val} />
                </div>
                <div className="text-xs uppercase tracking-wider text-brand-gray-light">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Popular Routes Carousel ── */}
      <section className="py-20 overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div className="text-left space-y-2">
              <h2 className="text-3xl md:text-4xl font-black font-heading">Popular <span className="gradient-text">Routes</span></h2>
              <p className="text-brand-gray-light max-w-md text-sm">Most booked flight corridors this season. Click to search instantly.</p>
            </div>
            
            {/* Carousel Controls */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold font-body text-brand-gray-light">
                {carouselIndex + 1} / {maxIndex + 1}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={carouselIndex === 0}
                  className="w-10 h-10 rounded-full border border-brand-gray-dark/40 flex items-center justify-center bg-brand-charcoal/50 text-brand-white hover:border-brand-red disabled:opacity-30 disabled:pointer-events-none transition-all duration-300"
                  aria-label="Previous slide"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={carouselIndex >= maxIndex}
                  className="w-10 h-10 rounded-full border border-brand-gray-dark/40 flex items-center justify-center bg-brand-charcoal/50 text-brand-white hover:border-brand-red disabled:opacity-30 disabled:pointer-events-none transition-all duration-300"
                  aria-label="Next slide"
                >
                  →
                </button>
              </div>
            </div>
          </div>
          
          <div className="relative w-full py-4">
            <div 
              className="flex transition-transform duration-500 ease-out"
              style={{
                transform: `translateX(-${carouselIndex * (100 / cardsToShow)}%)`
              }}
            >
              {popularRoutes.map((r, i) => (
                <div 
                  key={i} 
                  className="flex-shrink-0 px-3"
                  style={{
                    width: `${100 / cardsToShow}%`
                  }}
                >
                  <div 
                    className="group p-6 bg-brand-charcoal/40 border border-brand-gray-dark/30 hover:border-brand-red/40 rounded-xl hover:-translate-y-1.5 transition-all duration-300 shadow-lg cursor-pointer flex flex-col justify-between h-56"
                    onClick={() => quickSearch(r.from, r.to)}
                  >
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-3xl">{r.fromFlag}</span>
                        <span className="text-lg text-brand-red group-hover:translate-x-1.5 transition-transform duration-300">→</span>
                        <span className="text-3xl">{r.toFlag}</span>
                      </div>
                      <h4 className="text-lg font-bold font-heading">{r.fromName} → {r.toName}</h4>
                      <p className="text-xs text-brand-gray-light mt-1">From <span className="text-brand-red-light font-bold">{r.price}</span> · {r.time} flight</p>
                    </div>
                    <div className={`self-start text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded border ${r.badgeClass}`}>
                      {r.badge}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Partner Airlines ── */}
      <section className="py-20 pt-0">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12 space-y-2">
            <h2 className="text-3xl md:text-4xl font-black font-heading">Our Partner <span className="gradient-text">Airlines</span></h2>
            <p className="text-brand-gray-light max-w-md mx-auto text-sm">Fly with world-renowned carriers</p>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { flag: '🇵🇰', name: 'PIA', sub: 'Pakistan International' },
              { flag: '🇦🇪', name: 'Emirates', sub: 'Fly Better' },
              { flag: '🇬🇧', name: 'British Airways', sub: 'To Fly. To Serve.' },
              { flag: '🇸🇦', name: 'Saudia', sub: 'Fly the Friendliest' },
            ].map((a, i) => (
              <div key={i} className="p-6 bg-brand-charcoal/30 border border-brand-gray-dark/30 hover:border-brand-red/30 rounded-xl text-center transform hover:scale-102 hover:bg-brand-charcoal/50 transition-all duration-300">
                <div className="text-4xl">{a.flag}</div>
                <div className="text-base font-extrabold font-heading mt-3">{a.name}</div>
                <div className="text-xs text-brand-gray-light mt-1">{a.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-20 bg-brand-charcoal/30 border-t border-brand-gray-dark/40 backdrop-blur-sm">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12 space-y-2">
            <h2 className="text-3xl md:text-4xl font-black font-heading">How It <span className="gradient-text">Works</span></h2>
            <p className="text-brand-gray-light max-w-md mx-auto text-sm">Book your perfect flight in 3 simple steps</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: '🔍', step: 'Step 1', badgeClass: 'border-brand-red/30 bg-brand-red/10 text-brand-red-light', title: 'Search Flights', desc: 'Enter your origin, destination, and travel dates. Choose one-way or round-trip and filter by class.' },
              { icon: '💺', step: 'Step 2', badgeClass: 'border-brand-white/20 bg-brand-white/10 text-brand-white', title: 'Select Your Seat', desc: 'Browse the interactive seat map. Pick Economy, Business, or First Class for each passenger.' },
              { icon: '🎫', step: 'Step 3', badgeClass: 'border-green-500/20 bg-green-500/10 text-green-400', title: 'Fly & Enjoy', desc: 'Pay securely and receive your digital boarding pass instantly. Download and go!' },
            ].map((s, idx) => (
              <div key={idx} className="p-8 bg-brand-charcoal/40 border border-brand-gray-dark/30 hover:border-brand-red/30 rounded-xl text-center flex flex-col items-center space-y-3 transform hover:-translate-y-1 transition-transform duration-300">
                <div className="text-5xl mb-2">{s.icon}</div>
                <div className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded border ${s.badgeClass}`}>
                  {s.step}
                </div>
                <h4 className="text-lg font-bold font-heading">{s.title}</h4>
                <p className="text-xs text-brand-gray-light leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-brand-black border-t border-brand-gray-dark/50 py-12">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <Link href="/" className="flex items-center gap-3 font-heading text-xl font-black text-brand-white tracking-wide">
                <LogoIcon />
                <span>
                  Sky<span className="text-brand-red">Ways</span>
                </span>
              </Link>
              <p className="text-xs text-brand-gray-light leading-relaxed max-w-xs">
                Your premium flight booking platform. Fly smarter, travel further.
              </p>
            </div>
            
            <div className="space-y-3">
              <h5 className="text-sm font-bold font-heading uppercase tracking-wider text-brand-white">Quick Links</h5>
              <div className="flex flex-col gap-2 text-xs">
                <Link href="/search" className="text-brand-gray-light hover:text-brand-white transition-colors">Search Flights</Link>
                <Link href="/dashboard" className="text-brand-gray-light hover:text-brand-white transition-colors">My Bookings</Link>
                <Link href="/login" className="text-brand-gray-light hover:text-brand-white transition-colors">Login</Link>
              </div>
            </div>

            <div className="space-y-3">
              <h5 className="text-sm font-bold font-heading uppercase tracking-wider text-brand-white">Airlines</h5>
              <div className="flex flex-col gap-2 text-xs text-brand-gray-light">
                <span>🇵🇰 PIA</span>
                <span>🇦🇪 Emirates</span>
                <span>🇬🇧 British Airways</span>
                <span>🇸🇦 Saudia</span>
              </div>
            </div>

            <div className="space-y-3">
              <h5 className="text-sm font-bold font-heading uppercase tracking-wider text-brand-white">Top Routes</h5>
              <div className="flex flex-col gap-2 text-xs text-brand-gray-light">
                <span>KHI → DXB</span>
                <span>KHI → LHR</span>
                <span>DXB → JFK</span>
                <span>KHI → RUH</span>
              </div>
            </div>
          </div>

          <div className="h-px bg-brand-gray-dark/40 my-8" />

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-brand-gray-muted">
            <span>© 2026 SkyWays. All rights reserved.</span>
            <span>Built with ❤️ using Supabase + Flask + Next.js</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
