-- ============================================================
-- ✈️  FLIGHT BOOKING SYSTEM — COMPLEX QUERIES
--     Run any of these individually in the Supabase SQL Editor
--     to demonstrate SQL features: JOINs, subqueries, CTEs,
--     window functions, aggregations, correlated queries, etc.
-- ============================================================

-- ============================================================
-- QUERY 1: Multi-table INNER JOIN (6 tables)
--   Full booking report: passenger + outbound flight +
--   seat + payment + origin/destination airports
-- ============================================================
SELECT
    b.booking_reference,
    b.trip_type,
    b.booking_status,
    p.first_name || ' ' || p.last_name        AS passenger_name,
    p.email,
    al.airline_name,
    f.flight_number,
    oa.iata_code || ' → ' || da.iata_code     AS route,
    f.departure_time,
    f.arrival_time,
    fs.seat_number,
    fs.class                                   AS seat_class,
    fs.price                                   AS seat_price,
    b.total_amount,
    py.payment_method,
    py.payment_status,
    py.paid_at
FROM bookings b
JOIN passengers  p   ON b.passenger_id       = p.passenger_id
JOIN flights     f   ON b.outbound_flight_id = f.flight_id
JOIN airlines    al  ON f.airline_id         = al.airline_id
JOIN airports    oa  ON f.origin_airport_id  = oa.airport_id
JOIN airports    da  ON f.dest_airport_id    = da.airport_id
JOIN booking_seats bs ON b.booking_id        = bs.booking_id
                      AND bs.flight_id       = f.flight_id
JOIN flight_seats fs ON bs.seat_id           = fs.seat_id
JOIN payments    py  ON b.booking_id         = py.booking_id
ORDER BY b.booking_date DESC;


-- ============================================================
-- QUERY 2: LEFT JOIN — Flights WITH or WITHOUT any bookings
--   Shows flights that have zero bookings (great for admin)
-- ============================================================
SELECT
    f.flight_number,
    al.airline_name,
    oa.iata_code || ' → ' || da.iata_code     AS route,
    f.departure_time,
    f.status,
    COUNT(b.booking_id)                        AS booking_count,
    COALESCE(SUM(b.num_passengers), 0)         AS total_passengers,
    COALESCE(SUM(b.total_amount), 0)           AS total_revenue
FROM flights f
JOIN airlines al  ON f.airline_id        = al.airline_id
JOIN airports oa  ON f.origin_airport_id = oa.airport_id
JOIN airports da  ON f.dest_airport_id   = da.airport_id
LEFT JOIN bookings b ON f.flight_id      IN (b.outbound_flight_id, b.return_flight_id)
                     AND b.booking_status  = 'Confirmed'
GROUP BY f.flight_id, f.flight_number, al.airline_name,
         oa.iata_code, da.iata_code, f.departure_time, f.status
ORDER BY f.departure_time;


-- ============================================================
-- QUERY 3: SELF JOIN — Find pairs of flights departing
--   from the same airport on the same day
-- ============================================================
SELECT
    f1.flight_number   AS flight_1,
    f2.flight_number   AS flight_2,
    al1.airline_name   AS airline_1,
    al2.airline_name   AS airline_2,
    oa.iata_code       AS shared_origin,
    f1.departure_time  AS departure_1,
    f2.departure_time  AS departure_2
FROM flights f1
JOIN flights  f2  ON f1.flight_id         <  f2.flight_id
                  AND f1.origin_airport_id = f2.origin_airport_id
                  AND f1.departure_time::DATE = f2.departure_time::DATE
JOIN airlines al1 ON f1.airline_id        = al1.airline_id
JOIN airlines al2 ON f2.airline_id        = al2.airline_id
JOIN airports oa  ON f1.origin_airport_id = oa.airport_id
ORDER BY oa.iata_code, f1.departure_time;


-- ============================================================
-- QUERY 4: INNER JOIN — Flight crew roster per flight
-- ============================================================
SELECT
    f.flight_number,
    al.airline_name,
    oa.iata_code || ' → ' || da.iata_code     AS route,
    f.departure_time,
    cm.full_name                               AS crew_member,
    cm.role,
    cm.license_no
FROM flights f
JOIN airlines     al ON f.airline_id        = al.airline_id
JOIN airports     oa ON f.origin_airport_id = oa.airport_id
JOIN airports     da ON f.dest_airport_id   = da.airport_id
JOIN flight_crew  fc ON f.flight_id         = fc.flight_id
JOIN crew_members cm ON fc.crew_id          = cm.crew_id
ORDER BY f.flight_number, cm.role;


-- ============================================================
-- QUERY 5: Subquery in WHERE — Passengers who have
--   made MORE THAN 1 confirmed booking
-- ============================================================
SELECT
    p.passenger_id,
    p.first_name || ' ' || p.last_name  AS passenger_name,
    p.email,
    cn.country_name                     AS nationality
FROM passengers p
JOIN countries cn ON p.nationality_id = cn.country_id
WHERE p.passenger_id IN (
    SELECT passenger_id
    FROM bookings
    WHERE booking_status = 'Confirmed'
    GROUP BY passenger_id
    HAVING COUNT(*) > 1
)
ORDER BY passenger_name;


-- ============================================================
-- QUERY 6: Correlated Subquery — Each passenger's LATEST booking
-- ============================================================
SELECT
    b.booking_id,
    b.booking_reference,
    p.first_name || ' ' || p.last_name  AS passenger_name,
    f.flight_number,
    b.trip_type,
    b.total_amount,
    b.booking_date
FROM bookings b
JOIN passengers p ON b.passenger_id       = p.passenger_id
JOIN flights    f ON b.outbound_flight_id = f.flight_id
WHERE b.booking_date = (
    -- Correlated: picks the most recent booking date for each passenger
    SELECT MAX(b2.booking_date)
    FROM bookings b2
    WHERE b2.passenger_id = b.passenger_id
)
ORDER BY b.booking_date DESC;


-- ============================================================
-- QUERY 7: NOT EXISTS — Flights with ZERO confirmed bookings
-- ============================================================
SELECT
    f.flight_number,
    al.airline_name,
    oa.iata_code || ' → ' || da.iata_code  AS route,
    f.departure_time,
    f.status,
    f.available_seats
FROM flights f
JOIN airlines al ON f.airline_id        = al.airline_id
JOIN airports oa ON f.origin_airport_id = oa.airport_id
JOIN airports da ON f.dest_airport_id   = da.airport_id
WHERE NOT EXISTS (
    SELECT 1 FROM bookings b
    WHERE (b.outbound_flight_id = f.flight_id OR b.return_flight_id = f.flight_id)
      AND b.booking_status = 'Confirmed'
)
ORDER BY f.departure_time;


-- ============================================================
-- QUERY 8: Subquery in FROM — Average revenue per route,
--   then filter routes above the overall average
-- ============================================================
SELECT
    route_data.route,
    route_data.bookings_count,
    route_data.avg_revenue
FROM (
    SELECT
        oa.iata_code || ' → ' || da.iata_code  AS route,
        COUNT(b.booking_id)                     AS bookings_count,
        ROUND(AVG(py.amount), 2)                AS avg_revenue
    FROM bookings b
    JOIN flights  f  ON b.outbound_flight_id = f.flight_id
    JOIN airports oa ON f.origin_airport_id  = oa.airport_id
    JOIN airports da ON f.dest_airport_id    = da.airport_id
    JOIN payments py ON b.booking_id         = py.booking_id
    WHERE b.booking_status  = 'Confirmed'
      AND py.payment_status = 'Success'
    GROUP BY oa.iata_code, da.iata_code
) route_data
WHERE route_data.avg_revenue > (
    SELECT AVG(py2.amount)
    FROM payments py2
    JOIN bookings b2 ON py2.booking_id = b2.booking_id
    WHERE b2.booking_status = 'Confirmed' AND py2.payment_status = 'Success'
)
ORDER BY route_data.avg_revenue DESC;


-- ============================================================
-- QUERY 9: CTE + Window Function — Running total of revenue
--   per day, with cumulative sum using window function
-- ============================================================
WITH daily_revenue AS (
    SELECT
        py.paid_at::DATE                         AS pay_date,
        COUNT(DISTINCT b.booking_id)             AS daily_bookings,
        SUM(py.amount)                           AS daily_revenue
    FROM payments py
    JOIN bookings b ON py.booking_id = b.booking_id
    WHERE py.payment_status = 'Success'
      AND b.booking_status  = 'Confirmed'
    GROUP BY py.paid_at::DATE
)
SELECT
    pay_date,
    daily_bookings,
    daily_revenue,
    SUM(daily_revenue) OVER (ORDER BY pay_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
        AS cumulative_revenue,
    ROUND(AVG(daily_revenue) OVER (ORDER BY pay_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2)
        AS rolling_3day_avg
FROM daily_revenue
ORDER BY pay_date;


-- ============================================================
-- QUERY 10: Window Function — Rank passengers by total spend
-- ============================================================
SELECT
    passenger_rank,
    full_name,
    email,
    nationality,
    total_bookings,
    total_spent,
    spend_percentile
FROM (
    SELECT
        p.first_name || ' ' || p.last_name          AS full_name,
        p.email,
        cn.country_name                              AS nationality,
        COUNT(DISTINCT b.booking_id)                 AS total_bookings,
        COALESCE(SUM(py.amount), 0)                  AS total_spent,
        RANK() OVER (ORDER BY COALESCE(SUM(py.amount), 0) DESC)
                                                     AS passenger_rank,
        ROUND(
            PERCENT_RANK() OVER (ORDER BY COALESCE(SUM(py.amount), 0)) * 100, 1
        )                                            AS spend_percentile
    FROM passengers p
    LEFT JOIN bookings b  ON p.passenger_id = b.passenger_id
                          AND b.booking_status = 'Confirmed'
    LEFT JOIN payments py ON b.booking_id    = py.booking_id
                          AND py.payment_status = 'Success'
    LEFT JOIN countries cn ON p.nationality_id = cn.country_id
    GROUP BY p.passenger_id, p.first_name, p.last_name, p.email, cn.country_name
) ranked
ORDER BY passenger_rank;


-- ============================================================
-- QUERY 11: GROUP BY + HAVING — Airlines earning above
--   the average airline revenue
-- ============================================================
SELECT
    al.airline_name,
    al.iata_code,
    COUNT(DISTINCT b.booking_id)     AS total_bookings,
    SUM(py.amount)                   AS total_revenue,
    ROUND(AVG(py.amount), 2)         AS avg_booking_value
FROM airlines al
JOIN flights   f  ON al.airline_id  = f.airline_id
JOIN bookings  b  ON f.flight_id    IN (b.outbound_flight_id, b.return_flight_id)
JOIN payments  py ON b.booking_id   = py.booking_id
WHERE b.booking_status  = 'Confirmed'
  AND py.payment_status = 'Success'
GROUP BY al.airline_id, al.airline_name, al.iata_code
HAVING SUM(py.amount) > (
    SELECT AVG(airline_rev) FROM (
        SELECT SUM(py2.amount) AS airline_rev
        FROM airlines al2
        JOIN flights f2    ON al2.airline_id = f2.airline_id
        JOIN bookings b2   ON f2.flight_id   IN (b2.outbound_flight_id, b2.return_flight_id)
        JOIN payments py2  ON b2.booking_id  = py2.booking_id
        WHERE b2.booking_status = 'Confirmed' AND py2.payment_status = 'Success'
        GROUP BY al2.airline_id
    ) revenue_per_airline
)
ORDER BY total_revenue DESC;


-- ============================================================
-- QUERY 12: Advanced CTE — Route profitability analysis
--   Calculates revenue, avg occupancy, and profit margin per route
-- ============================================================
WITH route_bookings AS (
    SELECT
        oa.iata_code || ' → ' || da.iata_code  AS route,
        oc.city_name                            AS origin_city,
        dc.city_name                            AS dest_city,
        COUNT(DISTINCT b.booking_id)            AS booking_count,
        SUM(b.num_passengers)                   AS total_pax,
        SUM(py.amount)                          AS total_revenue,
        ROUND(AVG(py.amount / NULLIF(b.num_passengers, 0)), 2)  AS avg_ticket_price
    FROM bookings b
    JOIN payments py ON b.booking_id          = py.booking_id
    JOIN flights f   ON b.outbound_flight_id  = f.flight_id
    JOIN airports oa ON f.origin_airport_id   = oa.airport_id
    JOIN cities oc   ON oa.city_id            = oc.city_id
    JOIN airports da ON f.dest_airport_id     = da.airport_id
    JOIN cities dc   ON da.city_id            = dc.city_id
    WHERE b.booking_status = 'Confirmed' AND py.payment_status = 'Success'
    GROUP BY oa.iata_code, da.iata_code, oc.city_name, dc.city_name
),
route_capacity AS (
    SELECT
        oa.iata_code || ' → ' || da.iata_code  AS route,
        COUNT(DISTINCT f.flight_id)             AS flight_count,
        SUM(ac.total_seats)                     AS total_capacity
    FROM flights f
    JOIN aircraft ac ON f.aircraft_id        = ac.aircraft_id
    JOIN airports oa ON f.origin_airport_id  = oa.airport_id
    JOIN airports da ON f.dest_airport_id    = da.airport_id
    WHERE f.status IN ('Scheduled', 'Completed')
    GROUP BY oa.iata_code, da.iata_code
)
SELECT
    rb.route,
    rb.origin_city,
    rb.dest_city,
    rb.booking_count,
    rb.total_pax,
    rb.total_revenue,
    rb.avg_ticket_price,
    rc.flight_count,
    rc.total_capacity,
    ROUND(rb.total_pax * 100.0 / NULLIF(rc.total_capacity, 0), 2)  AS load_factor_pct,
    RANK() OVER (ORDER BY rb.total_revenue DESC)                    AS revenue_rank
FROM route_bookings rb
JOIN route_capacity rc ON rb.route = rc.route
ORDER BY rb.total_revenue DESC;
