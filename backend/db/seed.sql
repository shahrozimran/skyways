-- ============================================================
-- ✈️  FLIGHT BOOKING SYSTEM — SEED DATA (DML)
--     Run AFTER schema.sql in the Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. COUNTRIES  (5 records)
-- ============================================================
INSERT INTO countries (country_name, country_code) VALUES
    ('Pakistan',      'PK'),
    ('United Arab Emirates', 'AE'),
    ('United Kingdom','GB'),
    ('United States', 'US'),
    ('Saudi Arabia',  'SA');

-- ============================================================
-- 2. CITIES  (9 records)
-- ============================================================
INSERT INTO cities (city_name, country_id) VALUES
    ('Karachi',   (SELECT country_id FROM countries WHERE country_code = 'PK')),
    ('Lahore',    (SELECT country_id FROM countries WHERE country_code = 'PK')),
    ('Islamabad', (SELECT country_id FROM countries WHERE country_code = 'PK')),
    ('Dubai',     (SELECT country_id FROM countries WHERE country_code = 'AE')),
    ('Abu Dhabi', (SELECT country_id FROM countries WHERE country_code = 'AE')),
    ('London',    (SELECT country_id FROM countries WHERE country_code = 'GB')),
    ('New York',  (SELECT country_id FROM countries WHERE country_code = 'US')),
    ('Riyadh',    (SELECT country_id FROM countries WHERE country_code = 'SA')),
    ('Jeddah',    (SELECT country_id FROM countries WHERE country_code = 'SA'));

-- ============================================================
-- 3. AIRPORTS  (9 records)
-- ============================================================
INSERT INTO airports (airport_name, iata_code, city_id, timezone) VALUES
    ('Jinnah International Airport',          'KHI', (SELECT city_id FROM cities WHERE city_name='Karachi'),   'Asia/Karachi'),
    ('Allama Iqbal International Airport',    'LHE', (SELECT city_id FROM cities WHERE city_name='Lahore'),    'Asia/Karachi'),
    ('Islamabad International Airport',       'ISB', (SELECT city_id FROM cities WHERE city_name='Islamabad'), 'Asia/Karachi'),
    ('Dubai International Airport',           'DXB', (SELECT city_id FROM cities WHERE city_name='Dubai'),     'Asia/Dubai'),
    ('Abu Dhabi International Airport',       'AUH', (SELECT city_id FROM cities WHERE city_name='Abu Dhabi'), 'Asia/Dubai'),
    ('London Heathrow Airport',               'LHR', (SELECT city_id FROM cities WHERE city_name='London'),    'Europe/London'),
    ('John F. Kennedy International Airport', 'JFK', (SELECT city_id FROM cities WHERE city_name='New York'),  'America/New_York'),
    ('King Khalid International Airport',     'RUH', (SELECT city_id FROM cities WHERE city_name='Riyadh'),    'Asia/Riyadh'),
    ('King Abdulaziz International Airport',  'JED', (SELECT city_id FROM cities WHERE city_name='Jeddah'),    'Asia/Riyadh');

-- ============================================================
-- 4. AIRLINES  (4 records)
-- ============================================================
INSERT INTO airlines (airline_name, iata_code, country_id, logo_url, is_active) VALUES
    ('Pakistan International Airlines', 'PK', (SELECT country_id FROM countries WHERE country_code='PK'), 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/PIA_logo.svg/200px-PIA_logo.svg.png', TRUE),
    ('Emirates',                        'EK', (SELECT country_id FROM countries WHERE country_code='AE'), 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Emirates_logo.svg/200px-Emirates_logo.svg.png', TRUE),
    ('British Airways',                 'BA', (SELECT country_id FROM countries WHERE country_code='GB'), 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/British_Airways_Logo.svg/200px-British_Airways_Logo.svg.png', TRUE),
    ('Saudia',                          'SV', (SELECT country_id FROM countries WHERE country_code='SA'), 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Saudia_logo.svg/200px-Saudia_logo.svg.png', TRUE);

-- ============================================================
-- 5. AIRCRAFT  (6 records)
-- ============================================================
INSERT INTO aircraft (model, manufacturer, total_seats, airline_id) VALUES
    ('Boeing 737-800',    'Boeing',  162, (SELECT airline_id FROM airlines WHERE iata_code='PK')),
    ('Airbus A320-200',   'Airbus',  150, (SELECT airline_id FROM airlines WHERE iata_code='PK')),
    ('Boeing 777-300ER',  'Boeing',  354, (SELECT airline_id FROM airlines WHERE iata_code='EK')),
    ('Airbus A380-800',   'Airbus',  517, (SELECT airline_id FROM airlines WHERE iata_code='EK')),
    ('Boeing 787-9',      'Boeing',  216, (SELECT airline_id FROM airlines WHERE iata_code='BA')),
    ('Airbus A330-300',   'Airbus',  270, (SELECT airline_id FROM airlines WHERE iata_code='SV'));

-- ============================================================
-- 6. FLIGHTS  (18 records — mix of Scheduled / Completed / Cancelled)
-- ============================================================

-- Helper aliases
-- PK airline_id, EK airline_id, BA airline_id, SV airline_id
-- B738 = Boeing 737-800 (PK), A320 = Airbus A320 (PK)
-- B77W = Boeing 777-300ER (EK), A388 = Airbus A380 (EK)
-- B789 = Boeing 787-9 (BA), A333 = Airbus A330-300 (SV)

INSERT INTO flights (flight_number, airline_id, aircraft_id, origin_airport_id, dest_airport_id, departure_time, arrival_time, base_price, status, available_seats)
VALUES
-- ── Domestic (KHI ↔ ISB, KHI ↔ LHE, LHE ↔ ISB) ──────────────────────────────
('PK-101',
 (SELECT airline_id FROM airlines WHERE iata_code='PK'),
 (SELECT aircraft_id FROM aircraft WHERE model='Airbus A320-200'),
 (SELECT airport_id FROM airports WHERE iata_code='KHI'),
 (SELECT airport_id FROM airports WHERE iata_code='ISB'),
 '2026-06-25 07:00:00+05', '2026-06-25 08:30:00+05',  85.00, 'Scheduled', 0),

('PK-102',
 (SELECT airline_id FROM airlines WHERE iata_code='PK'),
 (SELECT aircraft_id FROM aircraft WHERE model='Airbus A320-200'),
 (SELECT airport_id FROM airports WHERE iata_code='ISB'),
 (SELECT airport_id FROM airports WHERE iata_code='KHI'),
 '2026-06-25 10:30:00+05', '2026-06-25 12:00:00+05',  85.00, 'Scheduled', 0),

('PK-201',
 (SELECT airline_id FROM airlines WHERE iata_code='PK'),
 (SELECT aircraft_id FROM aircraft WHERE model='Airbus A320-200'),
 (SELECT airport_id FROM airports WHERE iata_code='KHI'),
 (SELECT airport_id FROM airports WHERE iata_code='LHE'),
 '2026-06-28 09:00:00+05', '2026-06-28 10:30:00+05',  75.00, 'Scheduled', 0),

('PK-202',
 (SELECT airline_id FROM airlines WHERE iata_code='PK'),
 (SELECT aircraft_id FROM aircraft WHERE model='Airbus A320-200'),
 (SELECT airport_id FROM airports WHERE iata_code='LHE'),
 (SELECT airport_id FROM airports WHERE iata_code='KHI'),
 '2026-06-28 13:00:00+05', '2026-06-28 14:30:00+05',  75.00, 'Scheduled', 0),

-- ── Regional (KHI ↔ DXB) ──────────────────────────────────────────────────────
('PK-301',
 (SELECT airline_id FROM airlines WHERE iata_code='PK'),
 (SELECT aircraft_id FROM aircraft WHERE model='Boeing 737-800'),
 (SELECT airport_id FROM airports WHERE iata_code='KHI'),
 (SELECT airport_id FROM airports WHERE iata_code='DXB'),
 '2026-07-05 08:00:00+05', '2026-07-05 10:00:00+04', 280.00, 'Scheduled', 0),

('PK-302',
 (SELECT airline_id FROM airlines WHERE iata_code='PK'),
 (SELECT aircraft_id FROM aircraft WHERE model='Boeing 737-800'),
 (SELECT airport_id FROM airports WHERE iata_code='DXB'),
 (SELECT airport_id FROM airports WHERE iata_code='KHI'),
 '2026-07-06 09:00:00+04', '2026-07-06 12:00:00+05', 280.00, 'Scheduled', 0),

('EK-601',
 (SELECT airline_id FROM airlines WHERE iata_code='EK'),
 (SELECT aircraft_id FROM aircraft WHERE model='Airbus A380-800'),
 (SELECT airport_id FROM airports WHERE iata_code='KHI'),
 (SELECT airport_id FROM airports WHERE iata_code='DXB'),
 '2026-07-05 14:00:00+05', '2026-07-05 16:00:00+04', 320.00, 'Scheduled', 0),

('EK-602',
 (SELECT airline_id FROM airlines WHERE iata_code='EK'),
 (SELECT aircraft_id FROM aircraft WHERE model='Airbus A380-800'),
 (SELECT airport_id FROM airports WHERE iata_code='DXB'),
 (SELECT airport_id FROM airports WHERE iata_code='KHI'),
 '2026-07-06 22:00:00+04', '2026-07-07 01:30:00+05', 320.00, 'Scheduled', 0),

-- ── KHI ↔ RUH (Saudia & PIA) ──────────────────────────────────────────────────
('SV-701',
 (SELECT airline_id FROM airlines WHERE iata_code='SV'),
 (SELECT aircraft_id FROM aircraft WHERE model='Airbus A330-300'),
 (SELECT airport_id FROM airports WHERE iata_code='KHI'),
 (SELECT airport_id FROM airports WHERE iata_code='RUH'),
 '2026-07-03 06:00:00+05', '2026-07-03 08:30:00+03', 250.00, 'Scheduled', 0),

('SV-702',
 (SELECT airline_id FROM airlines WHERE iata_code='SV'),
 (SELECT aircraft_id FROM aircraft WHERE model='Airbus A330-300'),
 (SELECT airport_id FROM airports WHERE iata_code='RUH'),
 (SELECT airport_id FROM airports WHERE iata_code='KHI'),
 '2026-07-10 12:00:00+03', '2026-07-10 16:30:00+05', 250.00, 'Scheduled', 0),

-- ── Long-haul (KHI/DXB ↔ LHR) ────────────────────────────────────────────────
('BA-261',
 (SELECT airline_id FROM airlines WHERE iata_code='BA'),
 (SELECT aircraft_id FROM aircraft WHERE model='Boeing 787-9'),
 (SELECT airport_id FROM airports WHERE iata_code='KHI'),
 (SELECT airport_id FROM airports WHERE iata_code='LHR'),
 '2026-07-10 02:00:00+05', '2026-07-10 07:00:00+01', 620.00, 'Scheduled', 0),

('BA-262',
 (SELECT airline_id FROM airlines WHERE iata_code='BA'),
 (SELECT aircraft_id FROM aircraft WHERE model='Boeing 787-9'),
 (SELECT airport_id FROM airports WHERE iata_code='LHR'),
 (SELECT airport_id FROM airports WHERE iata_code='KHI'),
 '2026-07-20 14:00:00+01', '2026-07-21 04:00:00+05', 620.00, 'Scheduled', 0),

('EK-401',
 (SELECT airline_id FROM airlines WHERE iata_code='EK'),
 (SELECT aircraft_id FROM aircraft WHERE model='Boeing 777-300ER'),
 (SELECT airport_id FROM airports WHERE iata_code='DXB'),
 (SELECT airport_id FROM airports WHERE iata_code='LHR'),
 '2026-07-08 08:00:00+04', '2026-07-08 13:00:00+01', 480.00, 'Scheduled', 0),

('EK-402',
 (SELECT airline_id FROM airlines WHERE iata_code='EK'),
 (SELECT aircraft_id FROM aircraft WHERE model='Boeing 777-300ER'),
 (SELECT airport_id FROM airports WHERE iata_code='LHR'),
 (SELECT airport_id FROM airports WHERE iata_code='DXB'),
 '2026-07-15 15:00:00+01', '2026-07-15 23:00:00+04', 480.00, 'Scheduled', 0),

-- ── Ultra long-haul (DXB ↔ JFK) ───────────────────────────────────────────────
('EK-201',
 (SELECT airline_id FROM airlines WHERE iata_code='EK'),
 (SELECT aircraft_id FROM aircraft WHERE model='Airbus A380-800'),
 (SELECT airport_id FROM airports WHERE iata_code='DXB'),
 (SELECT airport_id FROM airports WHERE iata_code='JFK'),
 '2026-07-12 08:00:00+04', '2026-07-12 16:00:00-04', 850.00, 'Scheduled', 0),

('EK-202',
 (SELECT airline_id FROM airlines WHERE iata_code='EK'),
 (SELECT aircraft_id FROM aircraft WHERE model='Airbus A380-800'),
 (SELECT airport_id FROM airports WHERE iata_code='JFK'),
 (SELECT airport_id FROM airports WHERE iata_code='DXB'),
 '2026-07-25 23:00:00-04', '2026-07-27 00:00:00+04', 850.00, 'Scheduled', 0),

-- ── Historical — Completed ─────────────────────────────────────────────────────
('EK-603',
 (SELECT airline_id FROM airlines WHERE iata_code='EK'),
 (SELECT aircraft_id FROM aircraft WHERE model='Airbus A380-800'),
 (SELECT airport_id FROM airports WHERE iata_code='KHI'),
 (SELECT airport_id FROM airports WHERE iata_code='DXB'),
 '2026-06-01 14:00:00+05', '2026-06-01 16:00:00+04', 320.00, 'Completed', 0),

('BA-263',
 (SELECT airline_id FROM airlines WHERE iata_code='BA'),
 (SELECT aircraft_id FROM aircraft WHERE model='Boeing 787-9'),
 (SELECT airport_id FROM airports WHERE iata_code='LHR'),
 (SELECT airport_id FROM airports WHERE iata_code='KHI'),
 '2026-06-05 14:00:00+01', '2026-06-06 03:30:00+05', 620.00, 'Completed', 0);

-- ============================================================
-- 6.5 GENERATE MASSIVE FLIGHT SCHEDULE (Daily Flights: June 15 to July 15)
-- ============================================================
DO $$
DECLARE
    v_date DATE;
    v_flight_num INT := 1000;
    v_dep TIMESTAMPTZ;
    v_arr TIMESTAMPTZ;
BEGIN
    FOR i IN 0..30 LOOP
        v_date := '2026-06-15'::DATE + i;
        
        -- KHI ➔ ISB (PIA)
        v_flight_num := v_flight_num + 1;
        v_dep := (v_date::TEXT || ' 07:00:00 Asia/Karachi')::TIMESTAMPTZ;
        v_arr := v_dep + INTERVAL '1 hour 30 minutes';
        INSERT INTO flights (flight_number, airline_id, aircraft_id, origin_airport_id, dest_airport_id, departure_time, arrival_time, base_price, status, available_seats)
        VALUES ('PK-' || v_flight_num::TEXT, (SELECT airline_id FROM airlines WHERE iata_code='PK'), (SELECT aircraft_id FROM aircraft WHERE model='Airbus A320-200' LIMIT 1), (SELECT airport_id FROM airports WHERE iata_code='KHI'), (SELECT airport_id FROM airports WHERE iata_code='ISB'), v_dep, v_arr, 85.00, 'Scheduled', 0);

        -- ISB ➔ KHI (PIA)
        v_flight_num := v_flight_num + 1;
        v_dep := (v_date::TEXT || ' 10:00:00 Asia/Karachi')::TIMESTAMPTZ;
        v_arr := v_dep + INTERVAL '1 hour 30 minutes';
        INSERT INTO flights (flight_number, airline_id, aircraft_id, origin_airport_id, dest_airport_id, departure_time, arrival_time, base_price, status, available_seats)
        VALUES ('PK-' || v_flight_num::TEXT, (SELECT airline_id FROM airlines WHERE iata_code='PK'), (SELECT aircraft_id FROM aircraft WHERE model='Airbus A320-200' LIMIT 1), (SELECT airport_id FROM airports WHERE iata_code='ISB'), (SELECT airport_id FROM airports WHERE iata_code='KHI'), v_dep, v_arr, 85.00, 'Scheduled', 0);

        -- KHI ➔ LHE (PIA)
        v_flight_num := v_flight_num + 1;
        v_dep := (v_date::TEXT || ' 13:00:00 Asia/Karachi')::TIMESTAMPTZ;
        v_arr := v_dep + INTERVAL '1 hour 30 minutes';
        INSERT INTO flights (flight_number, airline_id, aircraft_id, origin_airport_id, dest_airport_id, departure_time, arrival_time, base_price, status, available_seats)
        VALUES ('PK-' || v_flight_num::TEXT, (SELECT airline_id FROM airlines WHERE iata_code='PK'), (SELECT aircraft_id FROM aircraft WHERE model='Airbus A320-200' LIMIT 1), (SELECT airport_id FROM airports WHERE iata_code='KHI'), (SELECT airport_id FROM airports WHERE iata_code='LHE'), v_dep, v_arr, 75.00, 'Scheduled', 0);

        -- LHE ➔ KHI (PIA)
        v_flight_num := v_flight_num + 1;
        v_dep := (v_date::TEXT || ' 16:00:00 Asia/Karachi')::TIMESTAMPTZ;
        v_arr := v_dep + INTERVAL '1 hour 30 minutes';
        INSERT INTO flights (flight_number, airline_id, aircraft_id, origin_airport_id, dest_airport_id, departure_time, arrival_time, base_price, status, available_seats)
        VALUES ('PK-' || v_flight_num::TEXT, (SELECT airline_id FROM airlines WHERE iata_code='PK'), (SELECT aircraft_id FROM aircraft WHERE model='Airbus A320-200' LIMIT 1), (SELECT airport_id FROM airports WHERE iata_code='LHE'), (SELECT airport_id FROM airports WHERE iata_code='KHI'), v_dep, v_arr, 75.00, 'Scheduled', 0);

        -- KHI ➔ DXB (Emirates)
        v_flight_num := v_flight_num + 1;
        v_dep := (v_date::TEXT || ' 11:00:00 Asia/Karachi')::TIMESTAMPTZ;
        v_arr := v_dep + INTERVAL '2 hours';
        INSERT INTO flights (flight_number, airline_id, aircraft_id, origin_airport_id, dest_airport_id, departure_time, arrival_time, base_price, status, available_seats)
        VALUES ('EK-' || v_flight_num::TEXT, (SELECT airline_id FROM airlines WHERE iata_code='EK'), (SELECT aircraft_id FROM aircraft WHERE model='Airbus A380-800' LIMIT 1), (SELECT airport_id FROM airports WHERE iata_code='KHI'), (SELECT airport_id FROM airports WHERE iata_code='DXB'), v_dep, v_arr, 320.00, 'Scheduled', 0);

        -- DXB ➔ KHI (Emirates)
        v_flight_num := v_flight_num + 1;
        v_dep := (v_date::TEXT || ' 15:00:00 Asia/Dubai')::TIMESTAMPTZ;
        v_arr := v_dep + INTERVAL '2 hours';
        INSERT INTO flights (flight_number, airline_id, aircraft_id, origin_airport_id, dest_airport_id, departure_time, arrival_time, base_price, status, available_seats)
        VALUES ('EK-' || v_flight_num::TEXT, (SELECT airline_id FROM airlines WHERE iata_code='EK'), (SELECT aircraft_id FROM aircraft WHERE model='Airbus A380-800' LIMIT 1), (SELECT airport_id FROM airports WHERE iata_code='DXB'), (SELECT airport_id FROM airports WHERE iata_code='KHI'), v_dep, v_arr, 320.00, 'Scheduled', 0);

        -- DXB ➔ LHR (British Airways)
        v_flight_num := v_flight_num + 1;
        v_dep := (v_date::TEXT || ' 09:00:00 Asia/Dubai')::TIMESTAMPTZ;
        v_arr := v_dep + INTERVAL '7 hours';
        INSERT INTO flights (flight_number, airline_id, aircraft_id, origin_airport_id, dest_airport_id, departure_time, arrival_time, base_price, status, available_seats)
        VALUES ('BA-' || v_flight_num::TEXT, (SELECT airline_id FROM airlines WHERE iata_code='BA'), (SELECT aircraft_id FROM aircraft WHERE model='Boeing 787-9' LIMIT 1), (SELECT airport_id FROM airports WHERE iata_code='DXB'), (SELECT airport_id FROM airports WHERE iata_code='LHR'), v_dep, v_arr, 480.00, 'Scheduled', 0);

        -- LHR ➔ DXB (British Airways)
        v_flight_num := v_flight_num + 1;
        v_dep := (v_date::TEXT || ' 17:00:00 Europe/London')::TIMESTAMPTZ;
        v_arr := v_dep + INTERVAL '7 hours';
        INSERT INTO flights (flight_number, airline_id, aircraft_id, origin_airport_id, dest_airport_id, departure_time, arrival_time, base_price, status, available_seats)
        VALUES ('BA-' || v_flight_num::TEXT, (SELECT airline_id FROM airlines WHERE iata_code='BA'), (SELECT aircraft_id FROM aircraft WHERE model='Boeing 787-9' LIMIT 1), (SELECT airport_id FROM airports WHERE iata_code='LHR'), (SELECT airport_id FROM airports WHERE iata_code='DXB'), v_dep, v_arr, 480.00, 'Scheduled', 0);

        -- DXB ➔ JFK (Emirates)
        v_flight_num := v_flight_num + 1;
        v_dep := (v_date::TEXT || ' 08:30:00 Asia/Dubai')::TIMESTAMPTZ;
        v_arr := v_dep + INTERVAL '14 hours';
        INSERT INTO flights (flight_number, airline_id, aircraft_id, origin_airport_id, dest_airport_id, departure_time, arrival_time, base_price, status, available_seats)
        VALUES ('EK-' || (v_flight_num + 2000)::TEXT, (SELECT airline_id FROM airlines WHERE iata_code='EK'), (SELECT aircraft_id FROM aircraft WHERE model='Boeing 777-300ER' LIMIT 1), (SELECT airport_id FROM airports WHERE iata_code='DXB'), (SELECT airport_id FROM airports WHERE iata_code='JFK'), v_dep, v_arr, 850.00, 'Scheduled', 0);

        -- JFK ➔ DXB (Emirates)
        v_flight_num := v_flight_num + 1;
        v_dep := (v_date::TEXT || ' 23:00:00 America/New_York')::TIMESTAMPTZ;
        v_arr := v_dep + INTERVAL '14 hours';
        INSERT INTO flights (flight_number, airline_id, aircraft_id, origin_airport_id, dest_airport_id, departure_time, arrival_time, base_price, status, available_seats)
        VALUES ('EK-' || (v_flight_num + 2000)::TEXT, (SELECT airline_id FROM airlines WHERE iata_code='EK'), (SELECT aircraft_id FROM aircraft WHERE model='Boeing 777-300ER' LIMIT 1), (SELECT airport_id FROM airports WHERE iata_code='JFK'), (SELECT airport_id FROM airports WHERE iata_code='DXB'), v_dep, v_arr, 850.00, 'Scheduled', 0);

        -- KHI ➔ RUH (Saudia)
        v_flight_num := v_flight_num + 1;
        v_dep := (v_date::TEXT || ' 06:30:00 Asia/Karachi')::TIMESTAMPTZ;
        v_arr := v_dep + INTERVAL '3 hours';
        INSERT INTO flights (flight_number, airline_id, aircraft_id, origin_airport_id, dest_airport_id, departure_time, arrival_time, base_price, status, available_seats)
        VALUES ('SV-' || v_flight_num::TEXT, (SELECT airline_id FROM airlines WHERE iata_code='SV'), (SELECT aircraft_id FROM aircraft WHERE model='Airbus A330-300' LIMIT 1), (SELECT airport_id FROM airports WHERE iata_code='KHI'), (SELECT airport_id FROM airports WHERE iata_code='RUH'), v_dep, v_arr, 260.00, 'Scheduled', 0);

        -- RUH ➔ KHI (Saudia)
        v_flight_num := v_flight_num + 1;
        v_dep := (v_date::TEXT || ' 12:30:00 Asia/Riyadh')::TIMESTAMPTZ;
        v_arr := v_dep + INTERVAL '3 hours';
        INSERT INTO flights (flight_number, airline_id, aircraft_id, origin_airport_id, dest_airport_id, departure_time, arrival_time, base_price, status, available_seats)
        VALUES ('SV-' || v_flight_num::TEXT, (SELECT airline_id FROM airlines WHERE iata_code='SV'), (SELECT aircraft_id FROM aircraft WHERE model='Airbus A330-300' LIMIT 1), (SELECT airport_id FROM airports WHERE iata_code='RUH'), (SELECT airport_id FROM airports WHERE iata_code='KHI'), v_dep, v_arr, 260.00, 'Scheduled', 0);
    END LOOP;
END $$;

-- ============================================================
-- 7. FLIGHT SEATS  — generate for every flight
--    Economy  rows 10-35  (A-F)  = 156 seats  @ base_price × 1.0 (bulkhead/exit +$15)
--    Business rows  4-9   (A-D)  =  24 seats  @ base_price × 2.5 (bulkhead +$40)
--    First    rows  1-3   (A-D)  =  12 seats  @ base_price × 5.0 (bulkhead +$80)
--    Total per flight = 192 seats
-- ============================================================
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN SELECT flight_id, base_price FROM flights LOOP

        -- Economy class
        INSERT INTO flight_seats (flight_id, seat_number, class, price, is_booked, seat_type, has_extra_legroom)
        SELECT rec.flight_id,
               gs::TEXT || sl,
               'Economy',
               CASE WHEN gs IN (10, 20) THEN rec.base_price + 15.00 ELSE rec.base_price END,
               FALSE,
               CASE WHEN sl IN ('A', 'F') THEN 'Window'
                    WHEN sl IN ('C', 'D') THEN 'Aisle'
                    ELSE 'Middle' END,
               CASE WHEN gs IN (10, 20) THEN TRUE ELSE FALSE END
        FROM generate_series(10, 35) gs
        CROSS JOIN unnest(ARRAY['A','B','C','D','E','F']) AS sl;

        -- Business class
        INSERT INTO flight_seats (flight_id, seat_number, class, price, is_booked, seat_type, has_extra_legroom)
        SELECT rec.flight_id,
               gs::TEXT || sl,
               'Business',
               CASE WHEN gs = 4 THEN ROUND(rec.base_price * 2.5, 2) + 40.00 ELSE ROUND(rec.base_price * 2.5, 2) END,
               FALSE,
               CASE WHEN sl IN ('A', 'D') THEN 'Window' ELSE 'Aisle' END,
               CASE WHEN gs = 4 THEN TRUE ELSE FALSE END
        FROM generate_series(4, 9) gs
        CROSS JOIN unnest(ARRAY['A','B','C','D']) AS sl;

        -- First class
        INSERT INTO flight_seats (flight_id, seat_number, class, price, is_booked, seat_type, has_extra_legroom)
        SELECT rec.flight_id,
               gs::TEXT || sl,
               'First',
               CASE WHEN gs = 1 THEN ROUND(rec.base_price * 5.0, 2) + 80.00 ELSE ROUND(rec.base_price * 5.0, 2) END,
               FALSE,
               CASE WHEN sl IN ('A', 'D') THEN 'Window' ELSE 'Aisle' END,
               CASE WHEN gs = 1 THEN TRUE ELSE FALSE END
        FROM generate_series(1, 3) gs
        CROSS JOIN unnest(ARRAY['A','B','C','D']) AS sl;

    END LOOP;
END $$;

-- Sync available_seats counter for all flights
UPDATE flights
SET available_seats = (
    SELECT COUNT(*) FROM flight_seats WHERE flight_id = flights.flight_id
);

-- ============================================================
-- 8. PASSENGERS  (15 records — supabase_uid left NULL; set via app)
-- ============================================================
INSERT INTO passengers (first_name, last_name, email, phone, passport_no, date_of_birth, nationality_id) VALUES
('Ahmed',    'Khan',      'ahmed.khan@email.com',     '+92-300-1234567', 'AA1234567', '1990-03-15', (SELECT country_id FROM countries WHERE country_code='PK')),
('Fatima',   'Ali',       'fatima.ali@email.com',     '+92-321-9876543', 'FA9876543', '1995-07-22', (SELECT country_id FROM countries WHERE country_code='PK')),
('Omar',     'Sheikh',    'omar.sheikh@email.com',    '+971-50-1111222', 'OS2233445', '1988-11-08', (SELECT country_id FROM countries WHERE country_code='AE')),
('Sara',     'Johnson',   'sara.j@email.com',         '+1-212-5556789',  'SJ5678901', '1992-04-30', (SELECT country_id FROM countries WHERE country_code='US')),
('James',    'Williams',  'james.w@email.com',        '+44-20-71234567', 'JW3344556', '1985-09-14', (SELECT country_id FROM countries WHERE country_code='GB')),
('Aisha',    'Malik',     'aisha.m@email.com',        '+92-333-7778889', 'AM7891234', '1998-01-25', (SELECT country_id FROM countries WHERE country_code='PK')),
('Khalid',   'Al-Rashid', 'khalid.r@email.com',       '+966-55-9988776', 'KR9988776', '1982-06-17', (SELECT country_id FROM countries WHERE country_code='SA')),
('Zara',     'Hussain',   'zara.h@email.com',         '+92-345-4445556', 'ZH4455667', '1997-12-03', (SELECT country_id FROM countries WHERE country_code='PK')),
('Michael',  'Brown',     'michael.b@email.com',      '+1-646-7778899',  'MB7788990', '1979-08-28', (SELECT country_id FROM countries WHERE country_code='US')),
('Priya',    'Sharma',    'priya.s@email.com',        '+44-7911-123456', 'PS1122334', '1993-05-11', (SELECT country_id FROM countries WHERE country_code='GB')),
('Hassan',   'Siddiqui',  'hassan.sid@email.com',     '+92-311-2223334', 'HS2223334', '1991-02-19', (SELECT country_id FROM countries WHERE country_code='PK')),
('Noor',     'Ahmed',     'noor.a@email.com',         '+92-302-6667778', 'NA6667778', '1996-09-07', (SELECT country_id FROM countries WHERE country_code='PK')),
('David',    'Chen',      'david.c@email.com',        '+1-415-3334445',  'DC3334445', '1987-03-22', (SELECT country_id FROM countries WHERE country_code='US')),
('Emma',     'Wilson',    'emma.w@email.com',         '+44-7700-900123', 'EW9001234', '2000-11-15', (SELECT country_id FROM countries WHERE country_code='GB')),
('Bilal',    'Qureshi',   'bilal.q@email.com',        '+92-322-5556667', 'BQ5556667', '1994-07-04', (SELECT country_id FROM countries WHERE country_code='PK'));

-- ============================================================
-- 9. BOOKINGS  (12 records — mix of one-way/round-trip, 1–3 pax)
-- ============================================================

-- Booking 1: one-way, 1 pax — KHI→DXB (PK-301)
INSERT INTO bookings (booking_reference, passenger_id, trip_type, outbound_flight_id, return_flight_id, booking_status, total_amount, num_passengers, booking_date)
VALUES ('BK001A2B',
    (SELECT passenger_id FROM passengers WHERE email='ahmed.khan@email.com'),
    'one-way',
    (SELECT flight_id FROM flights WHERE flight_number='PK-301'),
    NULL, 'Confirmed', 280.00, 1, '2026-06-10 09:00:00+05');

-- Booking 2: round-trip, 2 pax — KHI→LHR (BA-261) + LHR→KHI (BA-262)
INSERT INTO bookings (booking_reference, passenger_id, trip_type, outbound_flight_id, return_flight_id, booking_status, total_amount, num_passengers, booking_date)
VALUES ('BK002C3D',
    (SELECT passenger_id FROM passengers WHERE email='fatima.ali@email.com'),
    'round-trip',
    (SELECT flight_id FROM flights WHERE flight_number='BA-261'),
    (SELECT flight_id FROM flights WHERE flight_number='BA-262'),
    'Confirmed', 2480.00, 2, '2026-06-08 14:00:00+05');

-- Booking 3: one-way, 1 pax — DXB→JFK (EK-201)
INSERT INTO bookings (booking_reference, passenger_id, trip_type, outbound_flight_id, return_flight_id, booking_status, total_amount, num_passengers, booking_date)
VALUES ('BK003E4F',
    (SELECT passenger_id FROM passengers WHERE email='sara.j@email.com'),
    'one-way',
    (SELECT flight_id FROM flights WHERE flight_number='EK-201'),
    NULL, 'Confirmed', 850.00, 1, '2026-06-05 11:30:00+05');

-- Booking 4: one-way, 3 pax — KHI→ISB (PK-101)
INSERT INTO bookings (booking_reference, passenger_id, trip_type, outbound_flight_id, return_flight_id, booking_status, total_amount, num_passengers, booking_date)
VALUES ('BK004G5H',
    (SELECT passenger_id FROM passengers WHERE email='hassan.sid@email.com'),
    'one-way',
    (SELECT flight_id FROM flights WHERE flight_number='PK-101'),
    NULL, 'Confirmed', 255.00, 3, '2026-06-11 08:00:00+05');

-- Booking 5: round-trip, 1 pax — KHI→DXB + DXB→KHI (cancelled)
INSERT INTO bookings (booking_reference, passenger_id, trip_type, outbound_flight_id, return_flight_id, booking_status, total_amount, num_passengers, booking_date)
VALUES ('BK005I6J',
    (SELECT passenger_id FROM passengers WHERE email='aisha.m@email.com'),
    'round-trip',
    (SELECT flight_id FROM flights WHERE flight_number='EK-601'),
    (SELECT flight_id FROM flights WHERE flight_number='EK-602'),
    'Cancelled', 640.00, 1, '2026-06-09 16:00:00+05');

-- Booking 6: one-way, 1 pax — KHI→RUH (SV-701)
INSERT INTO bookings (booking_reference, passenger_id, trip_type, outbound_flight_id, return_flight_id, booking_status, total_amount, num_passengers, booking_date)
VALUES ('BK006K7L',
    (SELECT passenger_id FROM passengers WHERE email='khalid.r@email.com'),
    'one-way',
    (SELECT flight_id FROM flights WHERE flight_number='SV-701'),
    NULL, 'Confirmed', 250.00, 1, '2026-06-07 10:00:00+05');

-- Booking 7: round-trip, 2 pax — DXB→LHR + LHR→DXB
INSERT INTO bookings (booking_reference, passenger_id, trip_type, outbound_flight_id, return_flight_id, booking_status, total_amount, num_passengers, booking_date)
VALUES ('BK007M8N',
    (SELECT passenger_id FROM passengers WHERE email='james.w@email.com'),
    'round-trip',
    (SELECT flight_id FROM flights WHERE flight_number='EK-401'),
    (SELECT flight_id FROM flights WHERE flight_number='EK-402'),
    'Confirmed', 1920.00, 2, '2026-06-06 12:00:00+05');

-- Booking 8: one-way, 1 pax — KHI→LHE (PK-201)
INSERT INTO bookings (booking_reference, passenger_id, trip_type, outbound_flight_id, return_flight_id, booking_status, total_amount, num_passengers, booking_date)
VALUES ('BK008O9P',
    (SELECT passenger_id FROM passengers WHERE email='noor.a@email.com'),
    'one-way',
    (SELECT flight_id FROM flights WHERE flight_number='PK-201'),
    NULL, 'Confirmed', 75.00, 1, '2026-06-12 07:30:00+05');

-- Booking 9: round-trip, 1 pax — RUH→KHI + KHI→RUH
INSERT INTO bookings (booking_reference, passenger_id, trip_type, outbound_flight_id, return_flight_id, booking_status, total_amount, num_passengers, booking_date)
VALUES ('BK009Q0R',
    (SELECT passenger_id FROM passengers WHERE email='bilal.q@email.com'),
    'round-trip',
    (SELECT flight_id FROM flights WHERE flight_number='SV-702'),
    (SELECT flight_id FROM flights WHERE flight_number='SV-701'),
    'Confirmed', 500.00, 1, '2026-06-11 15:00:00+05');

-- Booking 10: one-way, 2 pax — KHI→DXB (EK-601)
INSERT INTO bookings (booking_reference, passenger_id, trip_type, outbound_flight_id, return_flight_id, booking_status, total_amount, num_passengers, booking_date)
VALUES ('BK010S1T',
    (SELECT passenger_id FROM passengers WHERE email='omar.sheikh@email.com'),
    'one-way',
    (SELECT flight_id FROM flights WHERE flight_number='EK-601'),
    NULL, 'Confirmed', 640.00, 2, '2026-06-09 13:00:00+05');

-- Booking 11: Completed historical — EK-603 (KHI→DXB)
INSERT INTO bookings (booking_reference, passenger_id, trip_type, outbound_flight_id, return_flight_id, booking_status, total_amount, num_passengers, booking_date)
VALUES ('BK011U2V',
    (SELECT passenger_id FROM passengers WHERE email='michael.b@email.com'),
    'one-way',
    (SELECT flight_id FROM flights WHERE flight_number='EK-603'),
    NULL, 'Confirmed', 320.00, 1, '2026-05-28 10:00:00+05');

-- Booking 12: Completed historical — BA-263 (LHR→KHI)
INSERT INTO bookings (booking_reference, passenger_id, trip_type, outbound_flight_id, return_flight_id, booking_status, total_amount, num_passengers, booking_date)
VALUES ('BK012W3X',
    (SELECT passenger_id FROM passengers WHERE email='emma.w@email.com'),
    'one-way',
    (SELECT flight_id FROM flights WHERE flight_number='BA-263'),
    NULL, 'Confirmed', 620.00, 1, '2026-05-30 09:00:00+05');

-- ============================================================
-- 10. BOOKING SEATS  (seat assignments per pax per flight leg)
-- ============================================================

-- BK001: 1 pax, KHI→DXB — seat 10A Economy (PK-301)
INSERT INTO booking_seats (booking_id, flight_id, seat_id, pax_first_name, pax_last_name, pax_passport, pax_dob)
SELECT b.booking_id, f.flight_id, fs.seat_id, 'Ahmed', 'Khan', 'AA1234567', '1990-03-15'
FROM bookings b
JOIN flights f   ON f.flight_number = 'PK-301'
JOIN flight_seats fs ON fs.flight_id = f.flight_id AND fs.seat_number = '10A'
WHERE b.booking_reference = 'BK001A2B';

-- BK002: 2 pax, outbound BA-261 seats 11A & 11B
INSERT INTO booking_seats (booking_id, flight_id, seat_id, pax_first_name, pax_last_name, pax_passport, pax_dob)
SELECT b.booking_id, f.flight_id, fs.seat_id, 'Fatima', 'Ali', 'FA9876543', '1995-07-22'
FROM bookings b
JOIN flights f   ON f.flight_number = 'BA-261'
JOIN flight_seats fs ON fs.flight_id = f.flight_id AND fs.seat_number = '11A'
WHERE b.booking_reference = 'BK002C3D';

INSERT INTO booking_seats (booking_id, flight_id, seat_id, pax_first_name, pax_last_name, pax_passport, pax_dob)
SELECT b.booking_id, f.flight_id, fs.seat_id, 'Zara', 'Hussain', 'ZH4455667', '1997-12-03'
FROM bookings b
JOIN flights f   ON f.flight_number = 'BA-261'
JOIN flight_seats fs ON fs.flight_id = f.flight_id AND fs.seat_number = '11B'
WHERE b.booking_reference = 'BK002C3D';

-- BK002: same 2 pax, return BA-262 seats 12A & 12B
INSERT INTO booking_seats (booking_id, flight_id, seat_id, pax_first_name, pax_last_name, pax_passport, pax_dob)
SELECT b.booking_id, f.flight_id, fs.seat_id, 'Fatima', 'Ali', 'FA9876543', '1995-07-22'
FROM bookings b
JOIN flights f   ON f.flight_number = 'BA-262'
JOIN flight_seats fs ON fs.flight_id = f.flight_id AND fs.seat_number = '12A'
WHERE b.booking_reference = 'BK002C3D';

INSERT INTO booking_seats (booking_id, flight_id, seat_id, pax_first_name, pax_last_name, pax_passport, pax_dob)
SELECT b.booking_id, f.flight_id, fs.seat_id, 'Zara', 'Hussain', 'ZH4455667', '1997-12-03'
FROM bookings b
JOIN flights f   ON f.flight_number = 'BA-262'
JOIN flight_seats fs ON fs.flight_id = f.flight_id AND fs.seat_number = '12B'
WHERE b.booking_reference = 'BK002C3D';

-- BK003: 1 pax EK-201 seat 4A Business
INSERT INTO booking_seats (booking_id, flight_id, seat_id, pax_first_name, pax_last_name, pax_passport, pax_dob)
SELECT b.booking_id, f.flight_id, fs.seat_id, 'Sara', 'Johnson', 'SJ5678901', '1992-04-30'
FROM bookings b
JOIN flights f   ON f.flight_number = 'EK-201'
JOIN flight_seats fs ON fs.flight_id = f.flight_id AND fs.seat_number = '4A'
WHERE b.booking_reference = 'BK003E4F';

-- BK004: 3 pax PK-101 seats 15A, 15B, 15C Economy
INSERT INTO booking_seats (booking_id, flight_id, seat_id, pax_first_name, pax_last_name, pax_passport, pax_dob)
SELECT b.booking_id, f.flight_id, fs.seat_id, 'Hassan', 'Siddiqui', 'HS2223334', '1991-02-19'
FROM bookings b
JOIN flights f   ON f.flight_number = 'PK-101'
JOIN flight_seats fs ON fs.flight_id = f.flight_id AND fs.seat_number = '15A'
WHERE b.booking_reference = 'BK004G5H';

INSERT INTO booking_seats (booking_id, flight_id, seat_id, pax_first_name, pax_last_name, pax_passport, pax_dob)
SELECT b.booking_id, f.flight_id, fs.seat_id, 'Noor', 'Siddiqui', 'NS1112223', '1993-05-10'
FROM bookings b
JOIN flights f   ON f.flight_number = 'PK-101'
JOIN flight_seats fs ON fs.flight_id = f.flight_id AND fs.seat_number = '15B'
WHERE b.booking_reference = 'BK004G5H';

INSERT INTO booking_seats (booking_id, flight_id, seat_id, pax_first_name, pax_last_name, pax_passport, pax_dob)
SELECT b.booking_id, f.flight_id, fs.seat_id, 'Hamza', 'Siddiqui', 'HS9998887', '1995-11-20'
FROM bookings b
JOIN flights f   ON f.flight_number = 'PK-101'
JOIN flight_seats fs ON fs.flight_id = f.flight_id AND fs.seat_number = '15C'
WHERE b.booking_reference = 'BK004G5H';

-- BK006: 1 pax SV-701 seat 1A First
INSERT INTO booking_seats (booking_id, flight_id, seat_id, pax_first_name, pax_last_name, pax_passport, pax_dob)
SELECT b.booking_id, f.flight_id, fs.seat_id, 'Khalid', 'Al-Rashid', 'KR9988776', '1982-06-17'
FROM bookings b
JOIN flights f   ON f.flight_number = 'SV-701'
JOIN flight_seats fs ON fs.flight_id = f.flight_id AND fs.seat_number = '1A'
WHERE b.booking_reference = 'BK006K7L';

-- BK007: 2 pax EK-401 outbound seats 4A & 4B Business
INSERT INTO booking_seats (booking_id, flight_id, seat_id, pax_first_name, pax_last_name, pax_passport, pax_dob)
SELECT b.booking_id, f.flight_id, fs.seat_id, 'James', 'Williams', 'JW3344556', '1985-09-14'
FROM bookings b
JOIN flights f   ON f.flight_number = 'EK-401'
JOIN flight_seats fs ON fs.flight_id = f.flight_id AND fs.seat_number = '4A'
WHERE b.booking_reference = 'BK007M8N';

INSERT INTO booking_seats (booking_id, flight_id, seat_id, pax_first_name, pax_last_name, pax_passport, pax_dob)
SELECT b.booking_id, f.flight_id, fs.seat_id, 'Priya', 'Sharma', 'PS1122334', '1993-05-11'
FROM bookings b
JOIN flights f   ON f.flight_number = 'EK-401'
JOIN flight_seats fs ON fs.flight_id = f.flight_id AND fs.seat_number = '4B'
WHERE b.booking_reference = 'BK007M8N';

-- BK007: return EK-402 same pax
INSERT INTO booking_seats (booking_id, flight_id, seat_id, pax_first_name, pax_last_name, pax_passport, pax_dob)
SELECT b.booking_id, f.flight_id, fs.seat_id, 'James', 'Williams', 'JW3344556', '1985-09-14'
FROM bookings b
JOIN flights f   ON f.flight_number = 'EK-402'
JOIN flight_seats fs ON fs.flight_id = f.flight_id AND fs.seat_number = '4A'
WHERE b.booking_reference = 'BK007M8N';

INSERT INTO booking_seats (booking_id, flight_id, seat_id, pax_first_name, pax_last_name, pax_passport, pax_dob)
SELECT b.booking_id, f.flight_id, fs.seat_id, 'Priya', 'Sharma', 'PS1122334', '1993-05-11'
FROM bookings b
JOIN flights f   ON f.flight_number = 'EK-402'
JOIN flight_seats fs ON fs.flight_id = f.flight_id AND fs.seat_number = '4B'
WHERE b.booking_reference = 'BK007M8N';

-- BK008: 1 pax PK-201 seat 20A Economy
INSERT INTO booking_seats (booking_id, flight_id, seat_id, pax_first_name, pax_last_name, pax_passport, pax_dob)
SELECT b.booking_id, f.flight_id, fs.seat_id, 'Noor', 'Ahmed', 'NA6667778', '1996-09-07'
FROM bookings b
JOIN flights f   ON f.flight_number = 'PK-201'
JOIN flight_seats fs ON fs.flight_id = f.flight_id AND fs.seat_number = '20A'
WHERE b.booking_reference = 'BK008O9P';

-- BK009: 1 pax SV-702 outbound seat 10A
INSERT INTO booking_seats (booking_id, flight_id, seat_id, pax_first_name, pax_last_name, pax_passport, pax_dob)
SELECT b.booking_id, f.flight_id, fs.seat_id, 'Bilal', 'Qureshi', 'BQ5556667', '1994-07-04'
FROM bookings b
JOIN flights f   ON f.flight_number = 'SV-702'
JOIN flight_seats fs ON fs.flight_id = f.flight_id AND fs.seat_number = '10A'
WHERE b.booking_reference = 'BK009Q0R';

-- BK009: return SV-701 seat 10A
INSERT INTO booking_seats (booking_id, flight_id, seat_id, pax_first_name, pax_last_name, pax_passport, pax_dob)
SELECT b.booking_id, f.flight_id, fs.seat_id, 'Bilal', 'Qureshi', 'BQ5556667', '1994-07-04'
FROM bookings b
JOIN flights f   ON f.flight_number = 'SV-701'
JOIN flight_seats fs ON fs.flight_id = f.flight_id AND fs.seat_number = '10A'
WHERE b.booking_reference = 'BK009Q0R';

-- BK010: 2 pax EK-601 seats 10A & 10B Economy
INSERT INTO booking_seats (booking_id, flight_id, seat_id, pax_first_name, pax_last_name, pax_passport, pax_dob)
SELECT b.booking_id, f.flight_id, fs.seat_id, 'Omar', 'Sheikh', 'OS2233445', '1988-11-08'
FROM bookings b
JOIN flights f   ON f.flight_number = 'EK-601'
JOIN flight_seats fs ON fs.flight_id = f.flight_id AND fs.seat_number = '10A'
WHERE b.booking_reference = 'BK010S1T';

INSERT INTO booking_seats (booking_id, flight_id, seat_id, pax_first_name, pax_last_name, pax_passport, pax_dob)
SELECT b.booking_id, f.flight_id, fs.seat_id, 'Layla', 'Sheikh', 'LS1112223', '1990-04-15'
FROM bookings b
JOIN flights f   ON f.flight_number = 'EK-601'
JOIN flight_seats fs ON fs.flight_id = f.flight_id AND fs.seat_number = '10B'
WHERE b.booking_reference = 'BK010S1T';

-- BK011: historical EK-603 seat 12A
INSERT INTO booking_seats (booking_id, flight_id, seat_id, pax_first_name, pax_last_name, pax_passport, pax_dob)
SELECT b.booking_id, f.flight_id, fs.seat_id, 'Michael', 'Brown', 'MB7788990', '1979-08-28'
FROM bookings b
JOIN flights f   ON f.flight_number = 'EK-603'
JOIN flight_seats fs ON fs.flight_id = f.flight_id AND fs.seat_number = '12A'
WHERE b.booking_reference = 'BK011U2V';

-- BK012: historical BA-263 seat 14A
INSERT INTO booking_seats (booking_id, flight_id, seat_id, pax_first_name, pax_last_name, pax_passport, pax_dob)
SELECT b.booking_id, f.flight_id, fs.seat_id, 'Emma', 'Wilson', 'EW9001234', '2000-11-15'
FROM bookings b
JOIN flights f   ON f.flight_number = 'BA-263'
JOIN flight_seats fs ON fs.flight_id = f.flight_id AND fs.seat_number = '14A'
WHERE b.booking_reference = 'BK012W3X';

-- Mark all booked seats as is_booked = TRUE
UPDATE flight_seats
SET is_booked = TRUE
WHERE seat_id IN (SELECT seat_id FROM booking_seats);

-- Decrement available_seats per flight for confirmed bookings
UPDATE flights
SET available_seats = available_seats - (
    SELECT COUNT(*) FROM booking_seats bs
    JOIN bookings b ON bs.booking_id = b.booking_id
    WHERE bs.flight_id = flights.flight_id
    AND b.booking_status = 'Confirmed'
);

-- ============================================================
-- 11. PAYMENTS  (one per booking)
-- ============================================================
INSERT INTO payments (booking_id, amount, payment_method, payment_status, card_last_four, paid_at)
SELECT b.booking_id, b.total_amount, 'Credit Card', 'Success', '4321', b.booking_date + INTERVAL '2 minutes'
FROM bookings b WHERE b.booking_reference = 'BK001A2B';

INSERT INTO payments (booking_id, amount, payment_method, payment_status, card_last_four, paid_at)
SELECT b.booking_id, b.total_amount, 'Credit Card', 'Success', '8765', b.booking_date + INTERVAL '3 minutes'
FROM bookings b WHERE b.booking_reference = 'BK002C3D';

INSERT INTO payments (booking_id, amount, payment_method, payment_status, card_last_four, paid_at)
SELECT b.booking_id, b.total_amount, 'PayPal', 'Success', NULL, b.booking_date + INTERVAL '1 minute'
FROM bookings b WHERE b.booking_reference = 'BK003E4F';

INSERT INTO payments (booking_id, amount, payment_method, payment_status, card_last_four, paid_at)
SELECT b.booking_id, b.total_amount, 'Debit Card', 'Success', '2211', b.booking_date + INTERVAL '2 minutes'
FROM bookings b WHERE b.booking_reference = 'BK004G5H';

INSERT INTO payments (booking_id, amount, payment_method, payment_status, card_last_four, paid_at)
SELECT b.booking_id, b.total_amount, 'Credit Card', 'Refunded', '9988', b.booking_date + INTERVAL '5 minutes'
FROM bookings b WHERE b.booking_reference = 'BK005I6J';

INSERT INTO payments (booking_id, amount, payment_method, payment_status, card_last_four, paid_at)
SELECT b.booking_id, b.total_amount, 'Bank Transfer', 'Success', NULL, b.booking_date + INTERVAL '10 minutes'
FROM bookings b WHERE b.booking_reference = 'BK006K7L';

INSERT INTO payments (booking_id, amount, payment_method, payment_status, card_last_four, paid_at)
SELECT b.booking_id, b.total_amount, 'Credit Card', 'Success', '1122', b.booking_date + INTERVAL '4 minutes'
FROM bookings b WHERE b.booking_reference = 'BK007M8N';

INSERT INTO payments (booking_id, amount, payment_method, payment_status, card_last_four, paid_at)
SELECT b.booking_id, b.total_amount, 'Debit Card', 'Success', '3344', b.booking_date + INTERVAL '1 minute'
FROM bookings b WHERE b.booking_reference = 'BK008O9P';

INSERT INTO payments (booking_id, amount, payment_method, payment_status, card_last_four, paid_at)
SELECT b.booking_id, b.total_amount, 'Credit Card', 'Success', '5566', b.booking_date + INTERVAL '2 minutes'
FROM bookings b WHERE b.booking_reference = 'BK009Q0R';

INSERT INTO payments (booking_id, amount, payment_method, payment_status, card_last_four, paid_at)
SELECT b.booking_id, b.total_amount, 'PayPal', 'Success', NULL, b.booking_date + INTERVAL '3 minutes'
FROM bookings b WHERE b.booking_reference = 'BK010S1T';

INSERT INTO payments (booking_id, amount, payment_method, payment_status, card_last_four, paid_at)
SELECT b.booking_id, b.total_amount, 'Credit Card', 'Success', '7788', b.booking_date + INTERVAL '2 minutes'
FROM bookings b WHERE b.booking_reference = 'BK011U2V';

INSERT INTO payments (booking_id, amount, payment_method, payment_status, card_last_four, paid_at)
SELECT b.booking_id, b.total_amount, 'Debit Card', 'Success', '9900', b.booking_date + INTERVAL '3 minutes'
FROM bookings b WHERE b.booking_reference = 'BK012W3X';

-- ============================================================
-- 12. BOARDING PASSES  (auto-generated for confirmed bookings)
-- ============================================================
INSERT INTO boarding_passes (booking_seat_id, barcode, gate, issued_at)
SELECT
    bs.booking_seat_id,
    UPPER(encode(gen_random_bytes(8), 'hex')) || '-' || LPAD(bs.booking_seat_id::TEXT, 4, '0'),
    'G' || (10 + (bs.booking_seat_id % 20))::TEXT,
    NOW()
FROM booking_seats bs
JOIN bookings b ON bs.booking_id = b.booking_id
WHERE b.booking_status = 'Confirmed';

-- ============================================================
-- 13. CREW MEMBERS  (12 records)
-- ============================================================
INSERT INTO crew_members (full_name, role, airline_id, license_no) VALUES
('Capt. Tariq Mehmood',   'Pilot',       (SELECT airline_id FROM airlines WHERE iata_code='PK'), 'PK-PIL-001'),
('F/O Amna Raza',          'Co-Pilot',    (SELECT airline_id FROM airlines WHERE iata_code='PK'), 'PK-COP-002'),
('Saima Baig',             'Cabin Crew',  (SELECT airline_id FROM airlines WHERE iata_code='PK'), 'PK-CAB-003'),
('Capt. Ahmed Al-Farsi',  'Pilot',       (SELECT airline_id FROM airlines WHERE iata_code='EK'), 'EK-PIL-101'),
('F/O Lina Johansson',     'Co-Pilot',    (SELECT airline_id FROM airlines WHERE iata_code='EK'), 'EK-COP-102'),
('Rania Khalil',           'Cabin Crew',  (SELECT airline_id FROM airlines WHERE iata_code='EK'), 'EK-CAB-103'),
('Carlos Rivera',          'Cabin Crew',  (SELECT airline_id FROM airlines WHERE iata_code='EK'), 'EK-CAB-104'),
('Capt. John Harrison',   'Pilot',       (SELECT airline_id FROM airlines WHERE iata_code='BA'), 'BA-PIL-201'),
('F/O Sophie Turner',      'Co-Pilot',    (SELECT airline_id FROM airlines WHERE iata_code='BA'), 'BA-COP-202'),
('Capt. Faisal Al-Ghamdi','Pilot',       (SELECT airline_id FROM airlines WHERE iata_code='SV'), 'SV-PIL-301'),
('F/O Mariam Al-Otaibi',  'Co-Pilot',    (SELECT airline_id FROM airlines WHERE iata_code='SV'), 'SV-COP-302'),
('Ibrahim Hassan',         'Engineer',    (SELECT airline_id FROM airlines WHERE iata_code='PK'), 'PK-ENG-005');

-- ============================================================
-- 14. FLIGHT CREW  (assign crew to flights)
-- ============================================================
INSERT INTO flight_crew (flight_id, crew_id) VALUES
-- PK-101 domestic crew
((SELECT flight_id FROM flights WHERE flight_number='PK-101'), (SELECT crew_id FROM crew_members WHERE license_no='PK-PIL-001')),
((SELECT flight_id FROM flights WHERE flight_number='PK-101'), (SELECT crew_id FROM crew_members WHERE license_no='PK-COP-002')),
((SELECT flight_id FROM flights WHERE flight_number='PK-101'), (SELECT crew_id FROM crew_members WHERE license_no='PK-CAB-003')),
-- PK-301 KHI-DXB crew
((SELECT flight_id FROM flights WHERE flight_number='PK-301'), (SELECT crew_id FROM crew_members WHERE license_no='PK-PIL-001')),
((SELECT flight_id FROM flights WHERE flight_number='PK-301'), (SELECT crew_id FROM crew_members WHERE license_no='PK-COP-002')),
((SELECT flight_id FROM flights WHERE flight_number='PK-301'), (SELECT crew_id FROM crew_members WHERE license_no='PK-ENG-005')),
-- EK-601 crew
((SELECT flight_id FROM flights WHERE flight_number='EK-601'), (SELECT crew_id FROM crew_members WHERE license_no='EK-PIL-101')),
((SELECT flight_id FROM flights WHERE flight_number='EK-601'), (SELECT crew_id FROM crew_members WHERE license_no='EK-COP-102')),
((SELECT flight_id FROM flights WHERE flight_number='EK-601'), (SELECT crew_id FROM crew_members WHERE license_no='EK-CAB-103')),
((SELECT flight_id FROM flights WHERE flight_number='EK-601'), (SELECT crew_id FROM crew_members WHERE license_no='EK-CAB-104')),
-- EK-201 DXB-JFK crew
((SELECT flight_id FROM flights WHERE flight_number='EK-201'), (SELECT crew_id FROM crew_members WHERE license_no='EK-PIL-101')),
((SELECT flight_id FROM flights WHERE flight_number='EK-201'), (SELECT crew_id FROM crew_members WHERE license_no='EK-COP-102')),
((SELECT flight_id FROM flights WHERE flight_number='EK-201'), (SELECT crew_id FROM crew_members WHERE license_no='EK-CAB-103')),
-- BA-261 crew
((SELECT flight_id FROM flights WHERE flight_number='BA-261'), (SELECT crew_id FROM crew_members WHERE license_no='BA-PIL-201')),
((SELECT flight_id FROM flights WHERE flight_number='BA-261'), (SELECT crew_id FROM crew_members WHERE license_no='BA-COP-202')),
-- SV-701 crew
((SELECT flight_id FROM flights WHERE flight_number='SV-701'), (SELECT crew_id FROM crew_members WHERE license_no='SV-PIL-301')),
((SELECT flight_id FROM flights WHERE flight_number='SV-701'), (SELECT crew_id FROM crew_members WHERE license_no='SV-COP-302'));
