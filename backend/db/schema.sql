-- ============================================================
-- ✈️  FLIGHT BOOKING SYSTEM — DATABASE SCHEMA (DDL)
--     Database : Supabase (PostgreSQL 15+)
--     Run this file first in the Supabase SQL Editor
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLE 1: COUNTRIES
-- ============================================================
CREATE TABLE IF NOT EXISTS countries (
    country_id   SERIAL       PRIMARY KEY,
    country_name VARCHAR(100) NOT NULL,
    country_code CHAR(2)      NOT NULL UNIQUE
);

COMMENT ON TABLE  countries              IS 'Master list of countries';
COMMENT ON COLUMN countries.country_code IS 'ISO 3166-1 alpha-2 country code';

-- ============================================================
-- TABLE 2: CITIES
-- ============================================================
CREATE TABLE IF NOT EXISTS cities (
    city_id    SERIAL       PRIMARY KEY,
    city_name  VARCHAR(100) NOT NULL,
    country_id INT          NOT NULL REFERENCES countries(country_id) ON DELETE CASCADE,
    UNIQUE (city_name, country_id)
);

COMMENT ON TABLE cities IS 'Cities linked to countries';

-- ============================================================
-- TABLE 3: AIRPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS airports (
    airport_id   SERIAL       PRIMARY KEY,
    airport_name VARCHAR(150) NOT NULL,
    iata_code    CHAR(3)      NOT NULL UNIQUE,
    city_id      INT          NOT NULL REFERENCES cities(city_id) ON DELETE CASCADE,
    timezone     VARCHAR(60)  DEFAULT 'UTC'
);

COMMENT ON TABLE  airports           IS 'International airports with IATA codes';
COMMENT ON COLUMN airports.iata_code IS 'IATA 3-letter airport identifier';

-- ============================================================
-- TABLE 4: AIRLINES
-- ============================================================
CREATE TABLE IF NOT EXISTS airlines (
    airline_id   SERIAL       PRIMARY KEY,
    airline_name VARCHAR(100) NOT NULL,
    iata_code    CHAR(2)      NOT NULL UNIQUE,
    country_id   INT          REFERENCES countries(country_id),
    logo_url     TEXT,
    is_active    BOOLEAN      DEFAULT TRUE
);

COMMENT ON TABLE airlines IS 'Airlines that operate flights in this system';

-- ============================================================
-- TABLE 5: AIRCRAFT
-- ============================================================
CREATE TABLE IF NOT EXISTS aircraft (
    aircraft_id  SERIAL       PRIMARY KEY,
    model        VARCHAR(100) NOT NULL,
    manufacturer VARCHAR(80),
    total_seats  INT          NOT NULL CHECK (total_seats > 0),
    airline_id   INT          NOT NULL REFERENCES airlines(airline_id) ON DELETE CASCADE
);

COMMENT ON TABLE aircraft IS 'Aircraft models belonging to each airline';

-- ============================================================
-- TABLE 6: FLIGHTS
-- ============================================================
CREATE TABLE IF NOT EXISTS flights (
    flight_id          SERIAL        PRIMARY KEY,
    flight_number      VARCHAR(10)   NOT NULL UNIQUE,
    airline_id         INT           NOT NULL REFERENCES airlines(airline_id),
    aircraft_id        INT           NOT NULL REFERENCES aircraft(aircraft_id),
    origin_airport_id  INT           NOT NULL REFERENCES airports(airport_id),
    dest_airport_id    INT           NOT NULL REFERENCES airports(airport_id),
    departure_time     TIMESTAMPTZ   NOT NULL,
    arrival_time       TIMESTAMPTZ   NOT NULL,
    base_price         NUMERIC(10,2) NOT NULL CHECK (base_price > 0),
    status             VARCHAR(20)   DEFAULT 'Scheduled'
                       CHECK (status IN ('Scheduled','Delayed','Cancelled','Completed')),
    available_seats    INT           NOT NULL DEFAULT 0 CHECK (available_seats >= 0),
    CONSTRAINT chk_airports CHECK (origin_airport_id <> dest_airport_id),
    CONSTRAINT chk_times    CHECK (arrival_time > departure_time)
);

COMMENT ON TABLE flights IS 'Flight schedule containing route, timing, and pricing';

-- ============================================================
-- TABLE 7: FLIGHT SEATS
-- ============================================================
CREATE TABLE IF NOT EXISTS flight_seats (
    seat_id     SERIAL        PRIMARY KEY,
    flight_id   INT           NOT NULL REFERENCES flights(flight_id) ON DELETE CASCADE,
    seat_number VARCHAR(5)    NOT NULL,
    class       VARCHAR(20)   NOT NULL CHECK (class IN ('Economy','Business','First')),
    price       NUMERIC(10,2) NOT NULL CHECK (price > 0),
    is_booked   BOOLEAN       DEFAULT FALSE,
    seat_type   VARCHAR(20)   DEFAULT 'Middle' CHECK (seat_type IN ('Window', 'Aisle', 'Middle')),
    has_extra_legroom BOOLEAN DEFAULT FALSE,
    UNIQUE (flight_id, seat_number)
);

COMMENT ON TABLE flight_seats IS 'Individual seat inventory per flight, organised by cabin class';

-- ============================================================
-- TABLE 8: PASSENGERS  (linked to Supabase Auth)
-- ============================================================
CREATE TABLE IF NOT EXISTS passengers (
    passenger_id   SERIAL       PRIMARY KEY,
    supabase_uid   UUID         UNIQUE,          -- auth.users.id
    first_name     VARCHAR(60)  NOT NULL,
    last_name      VARCHAR(60)  NOT NULL,
    email          VARCHAR(120) NOT NULL UNIQUE,
    phone          VARCHAR(20),
    passport_no    VARCHAR(20)  UNIQUE,
    date_of_birth  DATE,
    nationality_id INT          REFERENCES countries(country_id),
    created_at     TIMESTAMPTZ  DEFAULT NOW()
);

COMMENT ON TABLE passengers IS 'Registered users / lead passengers linked to Supabase Auth';

-- ============================================================
-- TABLE 9: BOOKINGS
--   Supports one-way AND round-trip; multi-passenger via booking_seats
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
    booking_id         SERIAL        PRIMARY KEY,
    booking_reference  VARCHAR(12)   NOT NULL UNIQUE DEFAULT UPPER(encode(gen_random_bytes(4), 'hex')),
    passenger_id       INT           NOT NULL REFERENCES passengers(passenger_id),
    trip_type          VARCHAR(10)   NOT NULL CHECK (trip_type IN ('one-way','round-trip')),
    outbound_flight_id INT           NOT NULL REFERENCES flights(flight_id),
    return_flight_id   INT           REFERENCES flights(flight_id),  -- NULL for one-way
    booking_status     VARCHAR(20)   DEFAULT 'Confirmed'
                       CHECK (booking_status IN ('Confirmed','Cancelled','Pending')),
    total_amount       NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
    num_passengers     INT           NOT NULL DEFAULT 1 CHECK (num_passengers > 0),
    booking_date       TIMESTAMPTZ   DEFAULT NOW(),
    CONSTRAINT chk_round_trip CHECK (
        trip_type = 'one-way'
        OR (trip_type = 'round-trip' AND return_flight_id IS NOT NULL)
    ),
    CONSTRAINT chk_diff_flights CHECK (
        return_flight_id IS NULL OR outbound_flight_id <> return_flight_id
    )
);

COMMENT ON TABLE bookings IS 'Booking header — one record per booking transaction';

-- ============================================================
-- TABLE 10: BOOKING SEATS  (multi-passenger support)
--   One row per (passenger × flight leg) combination
-- ============================================================
CREATE TABLE IF NOT EXISTS booking_seats (
    booking_seat_id SERIAL       PRIMARY KEY,
    booking_id      INT          NOT NULL REFERENCES bookings(booking_id) ON DELETE CASCADE,
    flight_id       INT          NOT NULL REFERENCES flights(flight_id),
    seat_id         INT          NOT NULL REFERENCES flight_seats(seat_id),
    pax_first_name  VARCHAR(60)  NOT NULL,
    pax_last_name   VARCHAR(60)  NOT NULL,
    pax_passport    VARCHAR(20),
    pax_dob         DATE,
    UNIQUE (booking_id, seat_id)
);

COMMENT ON TABLE booking_seats IS 'One row per passenger per flight leg in a booking';

-- ============================================================
-- TABLE 11: PAYMENTS  (mock payment system)
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
    payment_id      SERIAL        PRIMARY KEY,
    booking_id      INT           NOT NULL REFERENCES bookings(booking_id) ON DELETE CASCADE,
    amount          NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    payment_method  VARCHAR(30)   CHECK (payment_method IN ('Credit Card','Debit Card','PayPal','Bank Transfer')),
    payment_status  VARCHAR(20)   DEFAULT 'Success'
                    CHECK (payment_status IN ('Success','Failed','Refunded')),
    card_last_four  CHAR(4),
    paid_at         TIMESTAMPTZ   DEFAULT NOW(),
    transaction_ref VARCHAR(64)   UNIQUE DEFAULT UPPER(encode(gen_random_bytes(16), 'hex'))
);

COMMENT ON TABLE payments IS 'Mock payment records — one per booking';

-- ============================================================
-- TABLE 12: BOARDING PASSES
-- ============================================================
CREATE TABLE IF NOT EXISTS boarding_passes (
    pass_id         SERIAL       PRIMARY KEY,
    booking_seat_id INT          NOT NULL REFERENCES booking_seats(booking_seat_id) ON DELETE CASCADE UNIQUE,
    barcode         VARCHAR(100) NOT NULL UNIQUE,
    gate            VARCHAR(10),
    issued_at       TIMESTAMPTZ  DEFAULT NOW()
);

COMMENT ON TABLE boarding_passes IS 'Auto-generated boarding pass per seat in confirmed bookings';

-- ============================================================
-- TABLE 13: CREW MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS crew_members (
    crew_id    SERIAL       PRIMARY KEY,
    full_name  VARCHAR(120) NOT NULL,
    role       VARCHAR(50)  CHECK (role IN ('Pilot','Co-Pilot','Cabin Crew','Engineer')),
    airline_id INT          REFERENCES airlines(airline_id),
    license_no VARCHAR(30)  UNIQUE
);

COMMENT ON TABLE crew_members IS 'Airline staff assigned to operate flights';

-- ============================================================
-- TABLE 14: FLIGHT CREW  (junction)
-- ============================================================
CREATE TABLE IF NOT EXISTS flight_crew (
    flight_id INT NOT NULL REFERENCES flights(flight_id) ON DELETE CASCADE,
    crew_id   INT NOT NULL REFERENCES crew_members(crew_id) ON DELETE CASCADE,
    PRIMARY KEY (flight_id, crew_id)
);

COMMENT ON TABLE flight_crew IS 'Many-to-many: crew members assigned to flights';

-- ============================================================
-- TABLE 15: FLIGHT STATUS LOG  (audit trail via trigger)
-- ============================================================
CREATE TABLE IF NOT EXISTS flight_status_log (
    log_id     SERIAL       PRIMARY KEY,
    flight_id  INT          NOT NULL REFERENCES flights(flight_id) ON DELETE CASCADE,
    old_status VARCHAR(20),
    new_status VARCHAR(20)  NOT NULL,
    changed_at TIMESTAMPTZ  DEFAULT NOW(),
    changed_by TEXT         DEFAULT 'system'
);

COMMENT ON TABLE flight_status_log IS 'Immutable audit log of every flight status change';

-- ============================================================
-- TABLE 16: ADMINS
-- ============================================================
CREATE TABLE IF NOT EXISTS admins (
    admin_id     SERIAL       PRIMARY KEY,
    supabase_uid UUID         UNIQUE,
    username     VARCHAR(60)  NOT NULL UNIQUE,
    email        VARCHAR(120) NOT NULL UNIQUE,
    created_at   TIMESTAMPTZ  DEFAULT NOW()
);

COMMENT ON TABLE admins IS 'System administrators with elevated privileges';

-- ============================================================
-- INDEXES — Query performance optimisation
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_flights_departure      ON flights(departure_time);
CREATE INDEX IF NOT EXISTS idx_flights_origin         ON flights(origin_airport_id);
CREATE INDEX IF NOT EXISTS idx_flights_dest           ON flights(dest_airport_id);
CREATE INDEX IF NOT EXISTS idx_flights_status         ON flights(status);
CREATE INDEX IF NOT EXISTS idx_flights_airline        ON flights(airline_id);

CREATE INDEX IF NOT EXISTS idx_bookings_passenger     ON bookings(passenger_id);
CREATE INDEX IF NOT EXISTS idx_bookings_reference     ON bookings(booking_reference);
CREATE INDEX IF NOT EXISTS idx_bookings_outbound      ON bookings(outbound_flight_id);
CREATE INDEX IF NOT EXISTS idx_bookings_return        ON bookings(return_flight_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status        ON bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_bookings_date          ON bookings(booking_date);

CREATE INDEX IF NOT EXISTS idx_booking_seats_booking  ON booking_seats(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_seats_flight   ON booking_seats(flight_id);
CREATE INDEX IF NOT EXISTS idx_booking_seats_seat     ON booking_seats(seat_id);

CREATE INDEX IF NOT EXISTS idx_seats_flight           ON flight_seats(flight_id);
CREATE INDEX IF NOT EXISTS idx_seats_booked           ON flight_seats(is_booked);
CREATE INDEX IF NOT EXISTS idx_seats_class            ON flight_seats(class);

CREATE INDEX IF NOT EXISTS idx_payments_booking       ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status        ON payments(payment_status);

CREATE INDEX IF NOT EXISTS idx_passengers_email       ON passengers(email);
CREATE INDEX IF NOT EXISTS idx_passengers_uid         ON passengers(supabase_uid);

CREATE INDEX IF NOT EXISTS idx_status_log_flight      ON flight_status_log(flight_id);
CREATE INDEX IF NOT EXISTS idx_status_log_time        ON flight_status_log(changed_at);

CREATE INDEX IF NOT EXISTS idx_airports_iata          ON airports(iata_code);
CREATE INDEX IF NOT EXISTS idx_airports_city          ON airports(city_id);
