-- ============================================================
-- ✈️  FLIGHT BOOKING SYSTEM — STORED PROCEDURES & FUNCTIONS
--     Run AFTER triggers.sql in the Supabase SQL Editor
-- ============================================================

-- ============================================================
-- FUNCTION 1: fn_search_flights
--   Search available flights by origin IATA, destination IATA,
--   departure date, preferred class, and passenger count.
--   Called via: SELECT * FROM fn_search_flights('KHI','DXB','2026-07-05','Economy',1)
-- ============================================================
CREATE OR REPLACE FUNCTION fn_search_flights(
    p_origin_iata   CHAR(3),
    p_dest_iata     CHAR(3),
    p_dep_date      DATE,
    p_class         VARCHAR(20) DEFAULT 'Economy',
    p_pax_count     INT         DEFAULT 1
)
RETURNS TABLE (
    flight_id         INT,
    flight_number     VARCHAR,
    airline_name      VARCHAR,
    airline_code      CHAR,
    departure_time    TIMESTAMPTZ,
    arrival_time      TIMESTAMPTZ,
    duration          INTERVAL,
    origin_iata       CHAR,
    dest_iata         CHAR,
    origin_city       VARCHAR,
    dest_city         VARCHAR,
    class             VARCHAR,
    seat_price        NUMERIC,
    seats_available   BIGINT,
    status            VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        f.flight_id,
        f.flight_number,
        al.airline_name,
        al.iata_code                                 AS airline_code,
        f.departure_time,
        f.arrival_time,
        (f.arrival_time - f.departure_time)          AS duration,
        oa.iata_code                                 AS origin_iata,
        da.iata_code                                 AS dest_iata,
        oc.city_name                                 AS origin_city,
        dc.city_name                                 AS dest_city,
        fs_agg.class,
        MIN(fs_agg.price)                            AS seat_price,
        COUNT(fs_agg.seat_id)                        AS seats_available,
        f.status
    FROM flights f
    JOIN airlines  al ON f.airline_id        = al.airline_id
    JOIN airports  oa ON f.origin_airport_id = oa.airport_id
    JOIN cities    oc ON oa.city_id          = oc.city_id
    JOIN airports  da ON f.dest_airport_id   = da.airport_id
    JOIN cities    dc ON da.city_id          = dc.city_id
    JOIN flight_seats fs_agg ON f.flight_id  = fs_agg.flight_id
        AND fs_agg.class    = p_class
        AND fs_agg.is_booked = FALSE
    WHERE oa.iata_code     = p_origin_iata
      AND da.iata_code     = p_dest_iata
      AND f.departure_time::DATE = p_dep_date
      AND f.status IN ('Scheduled', 'Delayed')
    GROUP BY f.flight_id, f.flight_number, al.airline_name, al.iata_code,
             f.departure_time, f.arrival_time, oa.iata_code, da.iata_code,
             oc.city_name, dc.city_name, fs_agg.class, f.status
    HAVING COUNT(fs_agg.seat_id) >= p_pax_count
    ORDER BY f.departure_time;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION fn_search_flights IS 'Search available flights by route, date, class, and required seat count';

-- ============================================================
-- FUNCTION 2: fn_get_seat_map
--   Returns the full seat map for a flight, including booking status.
--   Called via: SELECT * FROM fn_get_seat_map(5)
-- ============================================================
CREATE OR REPLACE FUNCTION fn_get_seat_map(p_flight_id INT)
RETURNS TABLE (
    seat_id     INT,
    seat_number VARCHAR,
    class       VARCHAR,
    price       NUMERIC,
    is_booked   BOOLEAN,
    seat_type   VARCHAR,
    has_extra_legroom BOOLEAN,
    booked_by   TEXT      -- pax name if booked, else NULL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        fs.seat_id,
        fs.seat_number,
        fs.class,
        fs.price,
        fs.is_booked,
        fs.seat_type::VARCHAR,
        fs.has_extra_legroom,
        CASE WHEN fs.is_booked
            THEN (
                SELECT bs.pax_first_name || ' ' || bs.pax_last_name
                FROM booking_seats bs
                JOIN bookings b ON bs.booking_id = b.booking_id
                WHERE bs.seat_id = fs.seat_id
                  AND b.booking_status = 'Confirmed'
                LIMIT 1
            )
            ELSE NULL
        END AS booked_by
    FROM flight_seats fs
    WHERE fs.flight_id = p_flight_id
    ORDER BY
        CASE fs.class WHEN 'First' THEN 1 WHEN 'Business' THEN 2 ELSE 3 END,
        fs.seat_number;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION fn_get_seat_map IS 'Returns the complete seat map for a flight with availability and occupant info';

-- ============================================================
-- FUNCTION 3: fn_book_flight
--   Full transactional booking procedure.
--   Creates booking + booking_seats + payment in one atomic transaction.
--   Returns the new booking_id and booking_reference.
-- ============================================================
CREATE OR REPLACE FUNCTION fn_book_flight(
    p_passenger_id         INT,
    p_trip_type            VARCHAR(10),
    p_outbound_flight_id   INT,
    p_return_flight_id     INT,          -- pass NULL for one-way
    p_outbound_seat_ids    INT[],        -- array of seat_ids for outbound leg
    p_return_seat_ids      INT[],        -- array of seat_ids for return leg (empty for one-way)
    p_pax_first_names      TEXT[],
    p_pax_last_names       TEXT[],
    p_pax_passports        TEXT[],
    p_pax_dobs             DATE[],
    p_payment_method       VARCHAR(30),
    p_card_last_four       CHAR(4),
    p_total_amount         NUMERIC
)
RETURNS TABLE (new_booking_id INT, booking_reference VARCHAR) AS $$
DECLARE
    v_booking_id   INT;
    v_ref          VARCHAR;
    v_pax_count    INT;
    i              INT;
BEGIN
    v_pax_count := array_length(p_outbound_seat_ids, 1);

    -- 1. Create booking header
    INSERT INTO bookings (
        passenger_id, trip_type, outbound_flight_id, return_flight_id,
        booking_status, total_amount, num_passengers
    )
    VALUES (
        p_passenger_id, p_trip_type, p_outbound_flight_id, p_return_flight_id,
        'Confirmed', p_total_amount, v_pax_count
    )
    RETURNING bookings.booking_id, bookings.booking_reference
    INTO v_booking_id, v_ref;

    -- 2. Insert outbound booking_seats (trigger handles seat marking + boarding pass)
    FOR i IN 1..v_pax_count LOOP
        INSERT INTO booking_seats (booking_id, flight_id, seat_id, pax_first_name, pax_last_name, pax_passport, pax_dob)
        VALUES (
            v_booking_id,
            p_outbound_flight_id,
            p_outbound_seat_ids[i],
            p_pax_first_names[i],
            p_pax_last_names[i],
            NULLIF(p_pax_passports[i], ''),
            p_pax_dobs[i]
        );
    END LOOP;

    -- 3. Insert return booking_seats (round-trip only)
    IF p_trip_type = 'round-trip' AND array_length(p_return_seat_ids, 1) > 0 THEN
        FOR i IN 1..v_pax_count LOOP
            INSERT INTO booking_seats (booking_id, flight_id, seat_id, pax_first_name, pax_last_name, pax_passport, pax_dob)
            VALUES (
                v_booking_id,
                p_return_flight_id,
                p_return_seat_ids[i],
                p_pax_first_names[i],
                p_pax_last_names[i],
                NULLIF(p_pax_passports[i], ''),
                p_pax_dobs[i]
            );
        END LOOP;
    END IF;

    -- 4. Mock payment record
    INSERT INTO payments (booking_id, amount, payment_method, payment_status, card_last_four)
    VALUES (v_booking_id, p_total_amount, p_payment_method, 'Success', p_card_last_four);

    RETURN QUERY SELECT v_booking_id, v_ref;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Booking failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_book_flight IS 'Atomic booking procedure: creates booking, assigns seats (triggers fire), records payment';

-- ============================================================
-- FUNCTION 4: fn_cancel_booking
--   Cancels a booking and processes a refund (mock).
--   Triggers fn_restore_seats automatically.
-- ============================================================
CREATE OR REPLACE FUNCTION fn_cancel_booking(p_booking_id INT)
RETURNS TABLE (
    success          BOOLEAN,
    message          TEXT,
    refund_amount    NUMERIC,
    transaction_ref  VARCHAR
) AS $$
DECLARE
    v_status         TEXT;
    v_amount         NUMERIC;
    v_orig_ref       VARCHAR;
    v_booking_date   TIMESTAMPTZ;
    v_dep_time       TIMESTAMPTZ;
    v_hours_ahead    NUMERIC;
BEGIN
    -- Fetch booking details
    SELECT b.booking_status, b.total_amount, b.booking_date, f.departure_time
    INTO   v_status,          v_amount,       v_booking_date,  v_dep_time
    FROM bookings b
    JOIN flights f ON b.outbound_flight_id = f.flight_id
    WHERE b.booking_id = p_booking_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Booking not found', 0::NUMERIC, NULL::VARCHAR;
        RETURN;
    END IF;

    IF v_status = 'Cancelled' THEN
        RETURN QUERY SELECT FALSE, 'Booking is already cancelled', 0::NUMERIC, NULL::VARCHAR;
        RETURN;
    END IF;

    -- Hours until departure
    v_hours_ahead := EXTRACT(EPOCH FROM (v_dep_time - NOW())) / 3600;

    -- Cancellation policy: <24h = 50% refund, <72h = 80% refund, else full refund
    IF v_hours_ahead < 0 THEN
        RETURN QUERY SELECT FALSE, 'Cannot cancel a past flight', 0::NUMERIC, NULL::VARCHAR;
        RETURN;
    ELSIF v_hours_ahead < 24 THEN
        v_amount := ROUND(v_amount * 0.5, 2);
    ELSIF v_hours_ahead < 72 THEN
        v_amount := ROUND(v_amount * 0.8, 2);
    END IF;

    -- Cancel the booking (triggers fn_restore_seats)
    UPDATE bookings SET booking_status = 'Cancelled' WHERE booking_id = p_booking_id;

    -- Mark payment as Refunded
    UPDATE payments SET payment_status = 'Refunded' WHERE booking_id = p_booking_id;

    -- Fetch new transaction ref
    SELECT transaction_ref INTO v_orig_ref FROM payments WHERE booking_id = p_booking_id LIMIT 1;

    RETURN QUERY SELECT TRUE,
        format('Booking cancelled. Refund of $%s will be processed within 5-7 business days.', v_amount),
        v_amount,
        v_orig_ref;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_cancel_booking IS 'Cancels a booking with policy-based refund calculation; triggers seat restoration';

-- ============================================================
-- FUNCTION 5: fn_revenue_report
--   Generates a revenue summary within a date range.
-- ============================================================
CREATE OR REPLACE FUNCTION fn_revenue_report(
    p_start_date DATE DEFAULT (NOW() - INTERVAL '30 days')::DATE,
    p_end_date   DATE DEFAULT NOW()::DATE
)
RETURNS TABLE (
    report_date      DATE,
    airline_name     VARCHAR,
    route            TEXT,
    bookings_count   BIGINT,
    passengers_count BIGINT,
    revenue          NUMERIC,
    avg_ticket       NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        b.booking_date::DATE                            AS report_date,
        al.airline_name,
        oa.iata_code || ' → ' || da.iata_code          AS route,
        COUNT(DISTINCT b.booking_id)                    AS bookings_count,
        SUM(b.num_passengers)                           AS passengers_count,
        SUM(py.amount)                                  AS revenue,
        ROUND(AVG(py.amount), 2)                        AS avg_ticket
    FROM bookings b
    JOIN payments py   ON b.booking_id          = py.booking_id
    JOIN flights  f    ON b.outbound_flight_id   = f.flight_id
    JOIN airlines al   ON f.airline_id           = al.airline_id
    JOIN airports oa   ON f.origin_airport_id    = oa.airport_id
    JOIN airports da   ON f.dest_airport_id      = da.airport_id
    WHERE b.booking_date::DATE BETWEEN p_start_date AND p_end_date
      AND b.booking_status = 'Confirmed'
      AND py.payment_status = 'Success'
    GROUP BY b.booking_date::DATE, al.airline_name, oa.iata_code, da.iata_code
    ORDER BY report_date DESC, revenue DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION fn_revenue_report IS 'Revenue report broken down by date, airline, and route for a given period';

-- ============================================================
-- FUNCTION 6: fn_passenger_stats
--   Returns statistics for a specific passenger.
-- ============================================================
CREATE OR REPLACE FUNCTION fn_passenger_stats(p_passenger_id INT)
RETURNS TABLE (
    full_name          TEXT,
    email              VARCHAR,
    member_since       DATE,
    total_bookings     BIGINT,
    confirmed_bookings BIGINT,
    cancelled_bookings BIGINT,
    round_trips        BIGINT,
    one_way_trips      BIGINT,
    total_spent        NUMERIC,
    favourite_airline  TEXT,
    favourite_route    TEXT,
    flights_taken      BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH pax_bookings AS (
        SELECT b.*, py.amount, py.payment_status
        FROM bookings b
        LEFT JOIN payments py ON b.booking_id = py.booking_id
        WHERE b.passenger_id = p_passenger_id
    ),
    fav_airline AS (
        SELECT al.airline_name
        FROM pax_bookings pb
        JOIN flights f  ON pb.outbound_flight_id = f.flight_id
        JOIN airlines al ON f.airline_id          = al.airline_id
        WHERE pb.booking_status = 'Confirmed'
        GROUP BY al.airline_name
        ORDER BY COUNT(*) DESC
        LIMIT 1
    ),
    fav_route AS (
        SELECT oa.iata_code || ' → ' || da.iata_code AS route
        FROM pax_bookings pb
        JOIN flights f  ON pb.outbound_flight_id = f.flight_id
        JOIN airports oa ON f.origin_airport_id  = oa.airport_id
        JOIN airports da ON f.dest_airport_id    = da.airport_id
        WHERE pb.booking_status = 'Confirmed'
        GROUP BY oa.iata_code, da.iata_code
        ORDER BY COUNT(*) DESC
        LIMIT 1
    )
    SELECT
        p.first_name || ' ' || p.last_name                              AS full_name,
        p.email,
        p.created_at::DATE                                              AS member_since,
        COUNT(pb.booking_id)                                            AS total_bookings,
        COUNT(pb.booking_id) FILTER (WHERE pb.booking_status='Confirmed')  AS confirmed_bookings,
        COUNT(pb.booking_id) FILTER (WHERE pb.booking_status='Cancelled')  AS cancelled_bookings,
        COUNT(pb.booking_id) FILTER (WHERE pb.trip_type='round-trip')      AS round_trips,
        COUNT(pb.booking_id) FILTER (WHERE pb.trip_type='one-way')         AS one_way_trips,
        COALESCE(SUM(pb.amount) FILTER (WHERE pb.payment_status='Success'), 0) AS total_spent,
        (SELECT airline_name FROM fav_airline)                          AS favourite_airline,
        (SELECT route FROM fav_route)                                   AS favourite_route,
        -- Count each confirmed booking as 1 flight (+ 1 for round-trip)
        COALESCE(
            SUM(CASE WHEN pb.trip_type='round-trip' AND pb.booking_status='Confirmed' THEN 2
                     WHEN pb.booking_status='Confirmed' THEN 1
                     ELSE 0 END), 0
        )                                                               AS flights_taken
    FROM passengers p
    LEFT JOIN pax_bookings pb ON TRUE
    WHERE p.passenger_id = p_passenger_id
    GROUP BY p.first_name, p.last_name, p.email, p.created_at;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION fn_passenger_stats IS 'Comprehensive statistics for a single passenger including spend, favourite airline, and route';
