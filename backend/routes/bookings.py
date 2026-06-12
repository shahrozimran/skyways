from flask import Blueprint, request, jsonify
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config import supabase_admin, DEBUG
from routes.auth import require_auth

bookings_bp = Blueprint("bookings", __name__)


# ── POST /api/bookings ────────────────────────────────────────────────────────
@bookings_bp.route("/", methods=["POST"])
@require_auth
def create_booking():
    """
    Create a new booking (one-way or round-trip, 1-N passengers).
    Calls the fn_book_flight stored procedure.
    
    Expected JSON body:
    {
        "trip_type": "one-way" | "round-trip",
        "outbound_flight_id": int,
        "return_flight_id": int | null,
        "outbound_seat_ids": [int, ...],
        "return_seat_ids": [int, ...],   // empty for one-way
        "passengers": [
            {"first_name": str, "last_name": str, "passport": str, "dob": str}
        ],
        "payment_method": str,
        "card_last_four": str | null,
        "total_amount": float
    }
    """
    uid  = request.user.id
    data = request.get_json() or {}

    # Validate required fields
    required = ["trip_type", "outbound_flight_id", "outbound_seat_ids",
                "passengers", "payment_method", "total_amount"]
    missing = [f for f in required if data.get(f) is None]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    # Input sanitization and strict type checking
    try:
        trip_type = str(data["trip_type"]).strip()
        if trip_type not in ["one-way", "round-trip"]:
            return jsonify({"error": "Invalid trip_type"}), 400
            
        outbound_flight_id = int(data["outbound_flight_id"])
        outbound_seat_ids = [int(sid) for sid in data["outbound_seat_ids"]]
        total_amount = float(data["total_amount"])
        if total_amount < 0:
            return jsonify({"error": "total_amount cannot be negative"}), 400
            
        payment_method = str(data["payment_method"]).strip()[:50]
        
        return_flight_id = data.get("return_flight_id")
        if return_flight_id is not None:
            return_flight_id = int(return_flight_id)
            
        return_seat_ids = data.get("return_seat_ids", []) or []
        if return_seat_ids:
            return_seat_ids = [int(sid) for sid in return_seat_ids]
    except (ValueError, TypeError) as val_err:
        return jsonify({"error": "Invalid field types", "detail": str(val_err)}), 400

    passengers = data["passengers"]
    if not isinstance(passengers, list) or not passengers:
        return jsonify({"error": "At least one passenger is required"}), 400

    if len(passengers) != len(outbound_seat_ids):
        return jsonify({"error": "Number of passengers must match number of seats selected"}), 400

    if trip_type == "round-trip":
        if not return_flight_id:
            return jsonify({"error": "return_flight_id is required for round-trip bookings"}), 400
        if len(return_seat_ids) != len(passengers):
            return jsonify({"error": "Return seat count must match passenger count"}), 400

    # Sanitize passenger profiles
    for p in passengers:
        if not isinstance(p, dict) or not p.get("first_name") or not p.get("last_name"):
            return jsonify({"error": "Each passenger must have a first_name and last_name"}), 400
        p["first_name"] = str(p["first_name"]).strip()[:60]
        p["last_name"] = str(p["last_name"]).strip()[:60]
        if p.get("passport"):
            p["passport"] = str(p["passport"]).strip()[:20]

    try:
        # Get passenger_id from passengers table
        pax_resp = supabase_admin.table("passengers").select("passenger_id").eq("supabase_uid", uid).execute()
        if not pax_resp.data:
            return jsonify({"error": "Passenger profile not found. Please complete registration."}), 404
        passenger_id = pax_resp.data[0]["passenger_id"]

        # Call transactional stored procedure
        result = supabase_admin.rpc("fn_book_flight", {
            "p_passenger_id":       passenger_id,
            "p_trip_type":          trip_type,
            "p_outbound_flight_id": outbound_flight_id,
            "p_return_flight_id":   return_flight_id,
            "p_outbound_seat_ids":  outbound_seat_ids,
            "p_return_seat_ids":    return_seat_ids,
            "p_pax_first_names":    [p["first_name"] for p in passengers],
            "p_pax_last_names":     [p["last_name"]  for p in passengers],
            "p_pax_passports":      [p.get("passport", "") for p in passengers],
            "p_pax_dobs":           [p.get("dob") for p in passengers],
            "p_payment_method":     payment_method,
            "p_card_last_four":     data.get("card_last_four"),
            "p_total_amount":       total_amount,
        }).execute()

        if not result.data:
            return jsonify({"error": "Booking failed — no data returned"}), 500

        booking_row = result.data[0]
        new_booking_id = booking_row["new_booking_id"]

        # Fetch full booking details to return
        booking_detail = supabase_admin.table("vw_booking_details").select("*").eq(
            "booking_id", new_booking_id
        ).execute()

        # Fetch boarding passes for this specific booking with full nested relation details
        passes = supabase_admin.table("boarding_passes").select(
            "*, booking_seats!inner("
            "pax_first_name, pax_last_name, pax_passport, "
            "flight_seats(seat_number, class), "
            "flights(flight_number, departure_time, arrival_time, "
            "airlines(airline_name, iata_code), "
            "origin_ap:airports!origin_airport_id(iata_code, airport_name, cities(city_name)), "
            "dest_ap:airports!dest_airport_id(iata_code, airport_name, cities(city_name))))"
        ).eq("booking_seats.booking_id", new_booking_id).execute()

        return jsonify({
            "message":           "Booking confirmed! 🎉",
            "booking_id":        new_booking_id,
            "booking_reference": booking_row["booking_reference"],
            "booking_details":   booking_detail.data[0] if booking_detail.data else {},
            "boarding_passes":   passes.data or [],
        }), 201

    except Exception as e:
        err_msg = str(e)
        if "already booked" in err_msg.lower():
            return jsonify({"error": "One or more selected seats are already booked. Please try again."}), 409
        
        import logging
        logging.error(f"Booking failure exception: {err_msg}")
        
        display_msg = "An unexpected error occurred while booking. Please try again."
        if DEBUG:
            display_msg = err_msg
        return jsonify({"error": "Booking failed", "detail": display_msg}), 500


# ── GET /api/bookings/my ──────────────────────────────────────────────────────
@bookings_bp.route("/my", methods=["GET"])
@require_auth
def my_bookings():
    """Get all bookings for the currently logged-in passenger."""
    uid = request.user.id
    try:
        pax = supabase_admin.table("passengers").select("passenger_id").eq("supabase_uid", uid).execute()
        if not pax.data:
            return jsonify({"bookings": []}), 200
        passenger_id = pax.data[0]["passenger_id"]
        # Direct approach
        direct = supabase_admin.table("bookings").select(
            "*, passengers!inner(passenger_id, first_name, last_name, email, phone), "
            "outbound:flights!outbound_flight_id(flight_number, departure_time, arrival_time, status, "
            "airlines(airline_name, iata_code), "
            "origin_ap:airports!origin_airport_id(iata_code, cities(city_name)), "
            "dest_ap:airports!dest_airport_id(iata_code, cities(city_name))), "
            "return_f:flights!return_flight_id(flight_number, departure_time, arrival_time), "
            "payments(amount, payment_method, payment_status, paid_at, transaction_ref)"
        ).eq("passenger_id", passenger_id).order("booking_date", desc=True).execute()

        return jsonify({"bookings": direct.data or []}), 200

    except Exception as e:
        import logging
        logging.error(f"My bookings exception: {str(e)}")
        err_msg = "An unexpected error occurred while fetching bookings."
        if DEBUG:
            err_msg = str(e)
        return jsonify({"error": err_msg}), 500


# ── GET /api/bookings/<booking_id> ────────────────────────────────────────────
@bookings_bp.route("/<int:booking_id>", methods=["GET"])
@require_auth
def get_booking(booking_id):
    """Get full details of a specific booking including boarding passes."""
    uid = request.user.id
    try:
        # Verify ownership
        pax = supabase_admin.table("passengers").select("passenger_id").eq("supabase_uid", uid).execute()
        if not pax.data:
            return jsonify({"error": "Not found"}), 404
        passenger_id = pax.data[0]["passenger_id"]

        booking = supabase_admin.table("bookings").select("*").eq("booking_id", booking_id).execute()
        if not booking.data:
            return jsonify({"error": "Booking not found"}), 404
        if booking.data[0]["passenger_id"] != passenger_id:
            return jsonify({"error": "Access denied"}), 403

        # Booking seats + boarding passes
        seats = supabase_admin.table("booking_seats").select(
            "*, flight_seats(seat_number, class, price), "
            "flights(flight_number, departure_time, arrival_time, "
            "airlines(airline_name), "
            "origin_ap:airports!origin_airport_id(iata_code, cities(city_name)), "
            "dest_ap:airports!dest_airport_id(iata_code, cities(city_name))), "
            "boarding_passes(barcode, gate, issued_at)"
        ).eq("booking_id", booking_id).execute()

        # Payment
        payment = supabase_admin.table("payments").select("*").eq("booking_id", booking_id).execute()

        return jsonify({
            "booking":        booking.data[0],
            "seats":          seats.data or [],
            "payment":        payment.data[0] if payment.data else None,
        }), 200

    except Exception as e:
        import logging
        logging.error(f"Get booking exception: {str(e)}")
        err_msg = "An unexpected error occurred while fetching booking details."
        if DEBUG:
            err_msg = str(e)
        return jsonify({"error": err_msg}), 500


# ── PUT /api/bookings/<booking_id>/cancel ─────────────────────────────────────
@bookings_bp.route("/<int:booking_id>/cancel", methods=["PUT"])
@require_auth
def cancel_booking(booking_id):
    """Cancel a booking by performing calculations and updating status in DB."""
    uid = request.user.id
    try:
        # Verify passenger profile exists and matches user
        pax = supabase_admin.table("passengers").select("passenger_id").eq("supabase_uid", uid).execute()
        if not pax.data:
            return jsonify({"error": "Passenger profile not found"}), 404
        passenger_id = pax.data[0]["passenger_id"]

        # Fetch booking details and the departure time of its outbound flight
        booking_resp = supabase_admin.table("bookings").select(
            "booking_id, passenger_id, booking_status, total_amount, booking_date, "
            "outbound:flights!outbound_flight_id(departure_time)"
        ).eq("booking_id", booking_id).execute()

        if not booking_resp.data:
            return jsonify({"error": "Booking not found"}), 404
        
        booking_data = booking_resp.data[0]
        if booking_data["passenger_id"] != passenger_id:
            return jsonify({"error": "Access denied"}), 403

        if booking_data["booking_status"] == "Cancelled":
            return jsonify({"error": "Booking is already cancelled"}), 400

        # Calculate hours ahead of departure
        from datetime import datetime, timezone
        dep_time_str = booking_data["outbound"]["departure_time"]
        
        # Parse ISO date string (replace Z with +00:00 for python fromisoformat compatibility)
        if dep_time_str.endswith("Z"):
            dep_time_str = dep_time_str[:-1] + "+00:00"
        dep_time = datetime.fromisoformat(dep_time_str)
        now = datetime.now(timezone.utc)
        
        delta = dep_time - now
        hours_ahead = delta.total_seconds() / 3600.0

        if hours_ahead < 0:
            return jsonify({"error": "Cannot cancel a past flight"}), 400

        # Cancellation refund policy: <24h = 50% refund, <72h = 80% refund, else full refund
        refund_amount = float(booking_data["total_amount"])
        if hours_ahead < 24:
            refund_amount = round(refund_amount * 0.5, 2)
        elif hours_ahead < 72:
            refund_amount = round(refund_amount * 0.8, 2)

        # 1. Cancel the booking (This triggers trg_restore_seats automatically in DB)
        supabase_admin.table("bookings").update({"booking_status": "Cancelled"}).eq("booking_id", booking_id).execute()

        # 2. Mark payment as Refunded
        supabase_admin.table("payments").update({"payment_status": "Refunded"}).eq("booking_id", booking_id).execute()

        # 3. Fetch transaction reference
        pay_resp = supabase_admin.table("payments").select("transaction_ref").eq("booking_id", booking_id).limit(1).execute()
        transaction_ref = pay_resp.data[0]["transaction_ref"] if pay_resp.data else None

        message = f"Booking cancelled. Refund of ${refund_amount:.2f} will be processed within 5-7 business days."

        return jsonify({
            "message":         message,
            "refund_amount":   refund_amount,
            "transaction_ref": transaction_ref,
        }), 200

    except Exception as e:
        import logging
        logging.error(f"Cancel booking exception: {str(e)}")
        err_msg = "An unexpected error occurred while cancelling the booking."
        if DEBUG:
            err_msg = str(e)
        return jsonify({"error": err_msg}), 500


# ── GET /api/bookings/<booking_id>/boarding-passes ────────────────────────────
@bookings_bp.route("/<int:booking_id>/boarding-passes", methods=["GET"])
@require_auth
def get_boarding_passes(booking_id):
    """Get all boarding passes for a confirmed booking."""
    uid = request.user.id
    try:
        pax = supabase_admin.table("passengers").select("passenger_id").eq("supabase_uid", uid).execute()
        if not pax.data:
            return jsonify({"error": "Not found"}), 404
        passenger_id = pax.data[0]["passenger_id"]

        booking = supabase_admin.table("bookings").select("passenger_id, booking_status").eq(
            "booking_id", booking_id
        ).execute()
        if not booking.data:
            return jsonify({"error": "Booking not found"}), 404
        if booking.data[0]["passenger_id"] != passenger_id:
            return jsonify({"error": "Access denied"}), 403
        if booking.data[0]["booking_status"] != "Confirmed":
            return jsonify({"error": "Boarding passes are only available for confirmed bookings"}), 400

        passes = supabase_admin.table("boarding_passes").select(
            "*, booking_seats!inner("
            "pax_first_name, pax_last_name, pax_passport, "
            "flight_seats(seat_number, class), "
            "flights(flight_number, departure_time, arrival_time, "
            "airlines(airline_name, iata_code), "
            "origin_ap:airports!origin_airport_id(iata_code, airport_name, cities(city_name)), "
            "dest_ap:airports!dest_airport_id(iata_code, airport_name, cities(city_name))))"
        ).eq("booking_seats.booking_id", booking_id).execute()

        return jsonify({"boarding_passes": passes.data or []}), 200

    except Exception as e:
        import logging
        logging.error(f"Get boarding passes exception: {str(e)}")
        err_msg = "An unexpected error occurred while fetching boarding passes."
        if DEBUG:
            err_msg = str(e)
        return jsonify({"error": err_msg}), 500
