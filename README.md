# ✈️ SkyWays — Flight Booking System

SkyWays is a premium, full-stack flight booking and management system built with Next.js, Flask, and Supabase (PostgreSQL). It supports a responsive booking flow, live interactive seat mapping, real-time passenger profile settings, automated boarding pass generation, and transaction-safe checkout mechanisms.

---

## 🛠️ System Architecture & Tech Stack

| Layer | Technology | Key Features |
|---|---|---|
| **Database** | Supabase (PostgreSQL 15) | Relational design (16 tables), stored procedures, triggers, audit status logs, views. |
| **Backend** | Python 3.11+ + Flask + Gunicorn | CORS origin validation, JWT token extraction (`@require_auth`), security headers (nosniff, HSTS, DENY). |
| **Frontend** | React 19 + Next.js 16 (App Router) + TailwindCSS | Dark glassmorphism styling, responsive layouts, client-side route caching, and Context API. |

---

## 📁 Repository structure (Monorepo)

```
skyways/
├── backend/
│   ├── app.py               # Flask application factory
│   ├── config.py            # Supabase connection & env variables
│   ├── requirements.txt     # Python production dependencies (incl. gunicorn)
│   ├── routes/
│   │   ├── auth.py          # JWT user sign-in/up, profile CRUD, nationality API
│   │   ├── flights.py       # Live flights queries, availability dates, seats details
│   │   ├── bookings.py      # Transaction-safe reservation create & cancel routes
│   │   ├── admin.py         # Administrative flight controls & logs
│   │   └── reports.py       # System metrics: revenue, occupancy, routes popularity
│   └── db/
│       ├── schema.sql       # Database table declarations + index structures
│       ├── seed.sql         # Seed records: countries, airports, flights, seats
│       ├── views.sql        # 7 SQL views mapping reporting summaries
│       ├── triggers.sql     # PL/pgSQL database triggers for seat updates
│       └── procedures.sql   # Transactional stored functions (e.g., fn_book_flight)
├── frontend-next/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.js    # Layout metadata, smooth scroll overrides, font declarations
│   │   │   ├── page.js      # Interactive landing search page
│   │   │   ├── search/      # Flight cards list view
│   │   │   ├── booking/     # 3-step seat mapping, passenger details & checkout
│   │   │   ├── dashboard/   # Bookings history, boarding passes, cancellation trigger
│   │   │   ├── settings/    # Passenger profile sync page
│   │   │   └── login/       # Tabbed authentication view
│   │   ├── components/      # Common navigation bar, responsive toast indicators
│   │   ├── context/         # AuthContext providing user state and localStorage sync
│   │   └── utils/           # API helper class, formatting utilities
│   ├── next.config.mjs      # Rewrite proxy maps, HTTP security headers, and dynamic CSP configuration
│   └── package.json         # Node scripts & front-end package definitions
├── .env.example             # Template env variables file
└── .gitignore               # Root git exclusions configuration file
```

---

## 🚀 Setup & Local Execution

### 1. Database Setup (Supabase)
1. Register a database project at [supabase.com](https://supabase.com).
2. Access the **SQL Editor** in the Supabase console and run the database scripts inside `backend/db/` **in order**:
   * `schema.sql` ➔ DDL table layout
   * `seed.sql` ➔ Sample data seeding
   * `views.sql` ➔ Reports mapping views
   * `triggers.sql` ➔ Auto-updates & logging triggers
   * `procedures.sql` ➔ Stored routines (checkout, booking searches)

### 2. Backend Setup
1. Open your terminal in the backend directory:
   ```bash
   cd backend
   ```
2. Set up your Python virtual environment and activate it:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure your environment variables:
   * Copy the template `.env.example` file from the root to `backend/.env`
   * Fill in your Supabase connection parameters.
5. Start the local Flask server:
   ```bash
   python app.py
   # Runs locally at http://127.0.0.1:5000
   ```

### 3. Frontend Setup
1. Move to the Next.js frontend directory:
   ```bash
   cd ../frontend-next
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Run the Turbopack development server:
   ```bash
   npm run dev
   # Server runs at http://localhost:3000
   ```

---

## 🔑 Production Deployment Configurations

### Frontend (Vercel)
Import the `frontend-next` folder into Vercel. Set the **Root Directory** setting to `frontend-next`. Add the following environment variable:
* `BACKEND_API_URL` ➔ *Your Render production API URL* (e.g. `https://skyways-backend.onrender.com`)

### Backend (Render)
Create a new Web Service on Render pointing to your repository. Set the **Root Directory** field to `backend`. Configure these parameters:
* **Build Command**: `pip install -r requirements.txt`
* **Start Command**: `gunicorn "app:create_app()"`
* **Environment Variables**:
  * `DEBUG` ➔ `False`
  * `SUPABASE_URL` ➔ *[Your Supabase URL]*
  * `SUPABASE_KEY` ➔ *[Your Supabase Anon Key]*
  * `SUPABASE_SERVICE_KEY` ➔ *[Your Supabase Service role key]*
  * `ALLOWED_CORS_ORIGIN` ➔ *[Your production Vercel URL, e.g. `https://skyways.vercel.app`]*
