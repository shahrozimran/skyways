-- ============================================================
-- ✈️  FLIGHT BOOKING SYSTEM — VIEWS
--     Run AFTER seed.sql in the Supabase SQL Editor
-- ============================================================

-- ============================================================
-- VIEW 1: vw_available_flights
--   All currently bookable flights with full route & airline info
-- ============================================================
CREATE OR REPLACE VIEW vw_available_flights AS
SELECT
    f.flight_id,
    f.flight_number,
    f.departure_time,
    f.arrival_time,
    (f.arrival_time - f.departure_time)              AS duration,
    f.base_price,
    f.available_seats,
    f.status,
    al.airline_name,
    al.iata_code                                     AS airline_code,
    al.logo_url,
    -- Origin
    oa.iata_code                                     AS origin_iata,
    oa.airport_name                                  AS origin_airport,
    oc.city_name                                     AS origin_city,
    ocn.country_name                                 AS origin_country,
    -- Destination
    da.iata_code                                     AS dest_iata,
    da.airport_name                                  AS dest_airport,
    dc.city_name                                     AS dest_city,
    dcn.country_name                                 AS dest_country,
    -- Seat class availability counts
    (SELECT COUNT(*) FROM flight_seats fs WHERE fs.flight_id = f.flight_id AND fs.class='Economy'  AND NOT fs.is_booked) AS economy_available,
    (SELECT COUNT(*) FROM flight_seats fs WHERE fs.flight_id = f.flight_id AND fs.class='Business' AND NOT fs.is_booked) AS business_available,
    (SELECT COUNT(*) FROM flight_seats fs WHERE fs.flight_id = f.flight_id AND fs.class='First'    AND NOT fs.is_booked) AS first_available,
    -- Prices per class
    (SELECT MIN(fs.price) FROM flight_seats fs WHERE fs.flight_id = f.flight_id AND fs.class='Economy')  AS economy_price,
    (SELECT MIN(fs.price) FROM flight_seats fs WHERE fs.flight_id = f.flight_id AND fs.class='Business') AS business_price,
    (SELECT MIN(fs.price) FROM flight_seats fs WHERE fs.flight_id = f.flight_id AND fs.class='First')    AS first_price
FROM flights f
JOIN airlines  al ON f.airline_id        = al.airline_id
JOIN airports  oa ON f.origin_airport_id = oa.airport_id
JOIN cities    oc ON oa.city_id          = oc.city_id
JOIN countries ocn ON oc.country_id     = ocn.country_id
JOIN airports  da ON f.dest_airport_id   = da.airport_id
JOIN cities    dc ON da.city_id          = dc.city_id
JOIN countries dcn ON dc.country_id     = dcn.country_id
WHERE f.available_seats > 0
  AND f.status IN ('Scheduled', 'Delayed');

COMMENT ON VIEW vw_available_flights IS 'All bookable flights with full route, airline, and class-level availability';

-- ============================================================
-- VIEW 2: vw_booking_details
--   Full booking information joined across 8 tables
-- ============================================================
CREATE OR REPLACE VIEW vw_booking_details AS
SELECT
    b.booking_id,
    b.booking_reference,
    b.trip_type,
    b.booking_status,
    b.total_amount,
    b.num_passengers,
    b.booking_date,
    -- Lead passenger
    p.first_name  || ' ' || p.last_name           AS lead_passenger,
    p.email                                        AS passenger_email,
    p.phone,
    -- Outbound flight
    of_.flight_number                              AS outbound_flight,
    oa.iata_code || ' → ' || da.iata_code         AS outbound_route,
    of_.departure_time                             AS outbound_departure,
    of_.arrival_time                               AS outbound_arrival,
    -- Return flight (nullable)
    rf_.flight_number                              AS return_flight,
    ra.iata_code || ' → ' || rd.iata_code         AS return_route,
    rf_.departure_time                             AS return_departure,
    rf_.arrival_time                               AS return_arrival,
    -- Payment
    py.payment_method,
    py.payment_status,
    py.transaction_ref,
    py.paid_at
FROM bookings b
JOIN passengers p   ON b.passenger_id       = p.passenger_id
JOIN flights of_    ON b.outbound_flight_id  = of_.flight_id
JOIN airports oa    ON of_.origin_airport_id = oa.airport_id
JOIN airports da    ON of_.dest_airport_id   = da.airport_id
LEFT JOIN flights rf_  ON b.return_flight_id    = rf_.flight_id
LEFT JOIN airports ra  ON rf_.origin_airport_id = ra.airport_id
LEFT JOIN airports rd  ON rf_.dest_airport_id   = rd.airport_id
LEFT JOIN payments py  ON b.booking_id          = py.booking_id;

COMMENT ON VIEW vw_booking_details IS 'Complete booking view joining passenger, flights (outbound + return), and payment data';

-- ============================================================
-- VIEW 3: vw_revenue_by_airline
--   Total confirmed revenue grouped by airline
-- ============================================================
CREATE OR REPLACE VIEW vw_revenue_by_airline AS
SELECT
    al.airline_id,
    al.airline_name,
    al.iata_code,
    COUNT(DISTINCT b.booking_id)                     AS total_bookings,
    SUM(b.num_passengers)                            AS total_passengers,
    SUM(py.amount)                                   AS total_revenue,
    ROUND(AVG(py.amount), 2)                         AS avg_booking_value,
    MAX(py.amount)                                   AS max_booking_value,
    MIN(py.amount)                                   AS min_booking_value
FROM airlines al
JOIN flights f        ON al.airline_id    = f.airline_id
JOIN bookings b       ON f.flight_id      IN (b.outbound_flight_id, b.return_flight_id)
JOIN payments py      ON b.booking_id     = py.booking_id
WHERE b.booking_status = 'Confirmed'
  AND py.payment_status = 'Success'
GROUP BY al.airline_id, al.airline_name, al.iata_code;

COMMENT ON VIEW vw_revenue_by_airline IS 'Revenue analytics aggregated per airline for confirmed bookings';

-- ============================================================
-- VIEW 4: vw_popular_routes
--   Most booked origin → destination pairs
-- ============================================================
CREATE OR REPLACE VIEW vw_popular_routes AS
SELECT
    oa.iata_code                            AS origin_iata,
    oc.city_name                            AS origin_city,
    da.iata_code                            AS dest_iata,
    dc.city_name                            AS dest_city,
    COUNT(b.booking_id)                     AS total_bookings,
    SUM(b.num_passengers)                   AS total_passengers,
    SUM(b.total_amount)                     AS total_revenue,
    ROUND(AVG(b.total_amount), 2)           AS avg_ticket_price
FROM bookings b
JOIN flights f   ON b.outbound_flight_id = f.flight_id
JOIN airports oa ON f.origin_airport_id  = oa.airport_id
JOIN cities   oc ON oa.city_id           = oc.city_id
JOIN airports da ON f.dest_airport_id    = da.airport_id
JOIN cities   dc ON da.city_id           = dc.city_id
WHERE b.booking_status = 'Confirmed'
GROUP BY oa.iata_code, oc.city_name, da.iata_code, dc.city_name
ORDER BY total_bookings DESC;

COMMENT ON VIEW vw_popular_routes IS 'Route popularity ranked by number of confirmed bookings';

-- ============================================================
-- VIEW 5: vw_passenger_history
--   Each passenger with their full booking summary
-- ============================================================
CREATE OR REPLACE VIEW vw_passenger_history AS
SELECT
    p.passenger_id,
    p.first_name || ' ' || p.last_name              AS full_name,
    p.email,
    p.passport_no,
    cn.country_name                                  AS nationality,
    COUNT(DISTINCT b.booking_id)                     AS total_bookings,
    SUM(b.num_passengers)                            AS total_passengers_booked,
    SUM(CASE WHEN b.booking_status='Confirmed'  THEN 1 ELSE 0 END) AS confirmed_bookings,
    SUM(CASE WHEN b.booking_status='Cancelled'  THEN 1 ELSE 0 END) AS cancelled_bookings,
    SUM(CASE WHEN b.trip_type='round-trip'      THEN 1 ELSE 0 END) AS round_trips,
    SUM(CASE WHEN b.trip_type='one-way'         THEN 1 ELSE 0 END) AS one_way_trips,
    COALESCE(SUM(py.amount) FILTER (WHERE py.payment_status='Success'), 0) AS total_spent,
    MAX(b.booking_date)                              AS last_booking_date
FROM passengers p
LEFT JOIN bookings b  ON p.passenger_id = b.passenger_id
LEFT JOIN payments py ON b.booking_id   = py.booking_id
LEFT JOIN countries cn ON p.nationality_id = cn.country_id
GROUP BY p.passenger_id, p.first_name, p.last_name, p.email, p.passport_no, cn.country_name;

COMMENT ON VIEW vw_passenger_history IS 'Consolidated booking history and spending summary per passenger';

-- ============================================================
-- VIEW 6: vw_flight_occupancy
--   Seat occupancy statistics per flight
-- ============================================================
CREATE OR REPLACE VIEW vw_flight_occupancy AS
SELECT
    f.flight_id,
    f.flight_number,
    f.departure_time,
    f.status,
    al.airline_name,
    oa.iata_code || ' → ' || da.iata_code          AS route,
    -- Total seats
    COUNT(fs.seat_id)                               AS total_seats,
    -- Booked counts
    COUNT(fs.seat_id) FILTER (WHERE fs.is_booked)  AS booked_seats,
    -- Available
    COUNT(fs.seat_id) FILTER (WHERE NOT fs.is_booked) AS available_seats,
    -- Occupancy %
    ROUND(
        COUNT(fs.seat_id) FILTER (WHERE fs.is_booked) * 100.0
        / NULLIF(COUNT(fs.seat_id), 0), 2
    )                                               AS occupancy_pct,
    -- By class
    COUNT(fs.seat_id) FILTER (WHERE fs.class='Economy'  AND fs.is_booked) AS economy_booked,
    COUNT(fs.seat_id) FILTER (WHERE fs.class='Business' AND fs.is_booked) AS business_booked,
    COUNT(fs.seat_id) FILTER (WHERE fs.class='First'    AND fs.is_booked) AS first_booked
FROM flights f
JOIN airlines  al ON f.airline_id        = al.airline_id
JOIN airports  oa ON f.origin_airport_id = oa.airport_id
JOIN airports  da ON f.dest_airport_id   = da.airport_id
JOIN flight_seats fs ON f.flight_id      = fs.flight_id
GROUP BY f.flight_id, f.flight_number, f.departure_time, f.status, al.airline_name,
         oa.iata_code, da.iata_code;

COMMENT ON VIEW vw_flight_occupancy IS 'Seat occupancy percentage and class-level breakdown per flight';

-- ============================================================
-- VIEW 7: vw_upcoming_flights
--   All flights departing in the next 30 days
-- ============================================================
CREATE OR REPLACE VIEW vw_upcoming_flights AS
SELECT
    f.flight_id,
    f.flight_number,
    f.departure_time,
    f.arrival_time,
    (f.arrival_time - f.departure_time)             AS duration,
    f.status,
    f.available_seats,
    f.base_price,
    al.airline_name,
    oa.iata_code                                    AS origin_iata,
    oc.city_name                                    AS origin_city,
    da.iata_code                                    AS dest_iata,
    dc.city_name                                    AS dest_city,
    NOW()::DATE                                     AS today,
    (f.departure_time::DATE - NOW()::DATE)          AS days_until_departure
FROM flights f
JOIN airlines  al ON f.airline_id        = al.airline_id
JOIN airports  oa ON f.origin_airport_id = oa.airport_id
JOIN cities    oc ON oa.city_id          = oc.city_id
JOIN airports  da ON f.dest_airport_id   = da.airport_id
JOIN cities    dc ON da.city_id          = dc.city_id
WHERE f.departure_time BETWEEN NOW() AND NOW() + INTERVAL '30 days'
  AND f.status NOT IN ('Cancelled', 'Completed')
ORDER BY f.departure_time ASC;

COMMENT ON VIEW vw_upcoming_flights IS 'Flights departing within the next 30 days, ordered by departure time';
