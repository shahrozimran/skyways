-- ============================================================
-- ✈️  FLIGHT BOOKING SYSTEM — TRIGGERS & TRIGGER FUNCTIONS
--     Run AFTER views.sql in the Supabase SQL Editor
-- ============================================================

-- ============================================================
-- TRIGGER 1: trg_decrease_seats
--   AFTER INSERT on booking_seats
--   → Decrements available_seats on the flight
--   → Marks the seat as is_booked = TRUE
-- ============================================================
CREATE OR REPLACE FUNCTION fn_decrease_seats()
RETURNS TRIGGER AS $$
BEGIN
    -- Mark seat as booked
    UPDATE flight_seats
    SET is_booked = TRUE
    WHERE seat_id = NEW.seat_id;

    -- Decrement available seat counter on the flight
    UPDATE flights
    SET available_seats = available_seats - 1
    WHERE flight_id = NEW.flight_id
      AND available_seats > 0;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_decrease_seats ON booking_seats;
CREATE TRIGGER trg_decrease_seats
    AFTER INSERT ON booking_seats
    FOR EACH ROW
    EXECUTE FUNCTION fn_decrease_seats();

COMMENT ON FUNCTION fn_decrease_seats() IS 'Decrements available_seats and marks seat booked when a booking_seat row is inserted';

-- ============================================================
-- TRIGGER 2: trg_restore_seats
--   AFTER UPDATE on bookings — when status changes to Cancelled
--   → Restores available_seats for all seats in that booking
--   → Unmarks each seat (is_booked = FALSE)
-- ============================================================
CREATE OR REPLACE FUNCTION fn_restore_seats()
RETURNS TRIGGER AS $$
BEGIN
    -- Only act when status changes TO Cancelled
    IF NEW.booking_status = 'Cancelled' AND OLD.booking_status <> 'Cancelled' THEN

        -- Unmark all seats for this booking
        UPDATE flight_seats
        SET is_booked = FALSE
        WHERE seat_id IN (
            SELECT seat_id FROM booking_seats WHERE booking_id = NEW.booking_id
        );

        -- Restore available_seats per flight
        UPDATE flights f
        SET available_seats = available_seats + sub.cnt
        FROM (
            SELECT bs.flight_id, COUNT(*) AS cnt
            FROM booking_seats bs
            WHERE bs.booking_id = NEW.booking_id
            GROUP BY bs.flight_id
        ) sub
        WHERE f.flight_id = sub.flight_id;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_restore_seats ON bookings;
CREATE TRIGGER trg_restore_seats
    AFTER UPDATE OF booking_status ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION fn_restore_seats();

COMMENT ON FUNCTION fn_restore_seats() IS 'Restores seats when a booking is cancelled';

-- ============================================================
-- TRIGGER 3: trg_auto_boarding_pass
--   AFTER INSERT on booking_seats
--   → Automatically generates a boarding pass with a unique barcode
--   → Only for Confirmed bookings
-- ============================================================
CREATE OR REPLACE FUNCTION fn_auto_boarding_pass()
RETURNS TRIGGER AS $$
DECLARE
    v_status     TEXT;
    v_barcode    TEXT;
    v_gate       TEXT;
    v_seat_num   TEXT;
    v_flight_num TEXT;
BEGIN
    -- Check parent booking status
    SELECT booking_status INTO v_status
    FROM bookings WHERE booking_id = NEW.booking_id;

    IF v_status = 'Confirmed' THEN
        -- Generate barcode: FLIGHTNUM-SEATNUM-RANDOMHEX
        SELECT seat_number INTO v_seat_num FROM flight_seats  WHERE seat_id  = NEW.seat_id;
        SELECT flight_number INTO v_flight_num FROM flights   WHERE flight_id = NEW.flight_id;

        v_barcode := UPPER(v_flight_num) || '-' ||
                     UPPER(v_seat_num)   || '-' ||
                     UPPER(encode(gen_random_bytes(6), 'hex'));

        -- Random gate G10 – G30
        v_gate := 'G' || (10 + (EXTRACT(EPOCH FROM NOW())::INT % 21))::TEXT;

        INSERT INTO boarding_passes (booking_seat_id, barcode, gate, issued_at)
        VALUES (NEW.booking_seat_id, v_barcode, v_gate, NOW())
        ON CONFLICT (booking_seat_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_boarding_pass ON booking_seats;
CREATE TRIGGER trg_auto_boarding_pass
    AFTER INSERT ON booking_seats
    FOR EACH ROW
    EXECUTE FUNCTION fn_auto_boarding_pass();

COMMENT ON FUNCTION fn_auto_boarding_pass() IS 'Auto-generates a boarding pass with unique barcode on confirmed booking seat insert';

-- ============================================================
-- TRIGGER 4: trg_prevent_double_booking
--   BEFORE INSERT on booking_seats
--   → Raises an exception if the seat is already booked
-- ============================================================
CREATE OR REPLACE FUNCTION fn_prevent_double_booking()
RETURNS TRIGGER AS $$
DECLARE
    v_is_booked BOOLEAN;
BEGIN
    SELECT is_booked INTO v_is_booked
    FROM flight_seats
    WHERE seat_id = NEW.seat_id;

    IF v_is_booked THEN
        RAISE EXCEPTION 'Seat % is already booked. Please choose a different seat.', NEW.seat_id
            USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_double_booking ON booking_seats;
CREATE TRIGGER trg_prevent_double_booking
    BEFORE INSERT ON booking_seats
    FOR EACH ROW
    EXECUTE FUNCTION fn_prevent_double_booking();

COMMENT ON FUNCTION fn_prevent_double_booking() IS 'Prevents double-booking of the same seat by raising an exception';

-- ============================================================
-- TRIGGER 5: trg_flight_status_log
--   AFTER UPDATE on flights — when status column changes
--   → Inserts a record into flight_status_log for audit trail
-- ============================================================
CREATE OR REPLACE FUNCTION fn_flight_status_log()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        INSERT INTO flight_status_log (flight_id, old_status, new_status, changed_at, changed_by)
        VALUES (NEW.flight_id, OLD.status, NEW.status, NOW(), current_user);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_flight_status_log ON flights;
CREATE TRIGGER trg_flight_status_log
    AFTER UPDATE OF status ON flights
    FOR EACH ROW
    EXECUTE FUNCTION fn_flight_status_log();

COMMENT ON FUNCTION fn_flight_status_log() IS 'Logs every flight status change to flight_status_log for full audit trail';
