from flask import Blueprint, request, jsonify
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config import supabase, supabase_admin
from routes.auth import require_auth

flights_bp = Blueprint("flights", __name__)


# ── GET /api/flights/search ───────────────────────────────────────────────────
@flights_bp.route("/search", methods=["GET"])
def search_flights():
    """
    Search available flights.
    Query params: origin, destination, date, class (default Economy),
                  passengers (default 1), trip_type (one-way|round-trip),
                  return_date (required when trip_type=round-trip)
    """
    origin      = request.args.get("origin", "").upper()
    destination = request.args.get("destination", "").upper()
    date        = request.args.get("date", "")
    cabin_class = request.args.get("class", "Economy")
    passengers  = int(request.args.get("passengers", 1))
    trip_type   = request.args.get("trip_type", "one-way")
    return_date = request.args.get("return_date", "")

    if not origin or not destination or not date:
        return jsonify({"error": "origin, destination, and date are required"}), 400

    try:
        # Call stored function fn_search_flights
        outbound = supabase_admin.rpc("fn_search_flights", {
            "p_origin_iata":  origin,
            "p_dest_iata":    destination,
            "p_dep_date":     date,
            "p_class":        cabin_class,
            "p_pax_count":    passengers,
        }).execute()

        result = {
            "outbound_flights": outbound.data or [],
            "return_flights": [],
            "available_outbound_dates": [],
            "available_return_dates": []
        }

        # Query all available outbound dates for this route
        ob_dates_resp = supabase_admin.table("vw_available_flights").select("departure_time")\
            .eq("origin_iata", origin).eq("dest_iata", destination).execute()
        if ob_dates_resp.data:
            unique_ob = sorted(list(set([d["departure_time"].split("T")[0] for d in ob_dates_resp.data])))
            result["available_outbound_dates"] = unique_ob

        # Round-trip: also search return flights and available return dates
        if trip_type == "round-trip":
            if return_date:
                return_flights = supabase_admin.rpc("fn_search_flights", {
                    "p_origin_iata":  destination,
                    "p_dest_iata":    origin,
                    "p_dep_date":     return_date,
                    "p_class":        cabin_class,
                    "p_pax_count":    passengers,
                }).execute()
                result["return_flights"] = return_flights.data or []

            ret_dates_resp = supabase_admin.table("vw_available_flights").select("departure_time")\
                .eq("origin_iata", destination).eq("dest_iata", origin).execute()
            if ret_dates_resp.data:
                unique_ret = sorted(list(set([d["departure_time"].split("T")[0] for d in ret_dates_resp.data])))
                result["available_return_dates"] = unique_ret

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": "Search failed", "detail": str(e)}), 500


# ── GET /api/flights/available-dates ──────────────────────────────────────────
@flights_bp.route("/available-dates", methods=["GET"])
def get_available_dates():
    """Get unique available flight dates for a given route."""
    origin      = request.args.get("origin", "").upper()
    destination = request.args.get("destination", "").upper()

    if not origin or not destination:
        return jsonify({"error": "origin and destination are required"}), 400

    try:
        # Outbound dates
        ob_dates_resp = supabase_admin.table("vw_available_flights").select("departure_time")\
            .eq("origin_iata", origin).eq("dest_iata", destination).execute()
        unique_ob = []
        if ob_dates_resp.data:
            unique_ob = sorted(list(set([d["departure_time"].split("T")[0] for d in ob_dates_resp.data])))

        # Return/Inbound dates
        ret_dates_resp = supabase_admin.table("vw_available_flights").select("departure_time")\
            .eq("origin_iata", destination).eq("dest_iata", origin).execute()
        unique_ret = []
        if ret_dates_resp.data:
            unique_ret = sorted(list(set([d["departure_time"].split("T")[0] for d in ret_dates_resp.data])))

        return jsonify({
            "available_outbound_dates": unique_ob,
            "available_return_dates": unique_ret
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── GET /api/flights ──────────────────────────────────────────────────────────
@flights_bp.route("/", methods=["GET"])
def list_flights():
    """List all available flights from the vw_available_flights view."""
    try:
        limit  = min(int(request.args.get("limit", 20)), 100)
        offset = int(request.args.get("offset", 0))
        resp   = supabase_admin.table("vw_available_flights").select("*").limit(limit).offset(offset).execute()
        return jsonify({"flights": resp.data, "count": len(resp.data)}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── GET /api/flights/<flight_id> ──────────────────────────────────────────────
@flights_bp.route("/<int:flight_id>", methods=["GET"])
def get_flight(flight_id):
    """Get detailed information for a single flight."""
    try:
        resp = supabase_admin.table("vw_available_flights").select("*").eq("flight_id", flight_id).execute()
        if not resp.data:
            # Try including non-available flights (for admin / booking confirmation)
            resp2 = supabase_admin.table("flights").select(
                "*, airlines(airline_name, iata_code, logo_url), "
                "aircraft(model, manufacturer, total_seats), "
                "origin:airports!origin_airport_id(iata_code, airport_name, cities(city_name, countries(country_name))), "
                "dest:airports!dest_airport_id(iata_code, airport_name, cities(city_name, countries(country_name)))"
            ).eq("flight_id", flight_id).execute()
            if not resp2.data:
                return jsonify({"error": "Flight not found"}), 404
            return jsonify({"flight": resp2.data[0]}), 200
        return jsonify({"flight": resp.data[0]}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── GET /api/flights/<flight_id>/seats ────────────────────────────────────────
@flights_bp.route("/<int:flight_id>/seats", methods=["GET"])
def get_seat_map(flight_id):
    """
    Get the complete seat map for a flight.
    Optional query param: class=Economy|Business|First
    """
    cabin_class = request.args.get("class", None)
    try:
        resp = supabase_admin.table("flight_seats").select(
            "seat_id, seat_number, class, price, is_booked, seat_type, has_extra_legroom"
        ).eq("flight_id", flight_id).execute()
        seats = resp.data or []
        if cabin_class:
            seats = [s for s in seats if s.get("class") == cabin_class]
        # Group by class for easier frontend consumption
        grouped = {"Economy": [], "Business": [], "First": []}
        for seat in seats:
            cls = seat.get("class", "Economy")
            if cls in grouped:
                grouped[cls].append(seat)
        return jsonify({"flight_id": flight_id, "seats": grouped}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── GET /api/flights/airports ─────────────────────────────────────────────────
@flights_bp.route("/airports", methods=["GET"])
def list_airports():
    """List all airports with city and country info for search dropdowns."""
    try:
        resp = supabase_admin.table("airports").select(
            "airport_id, airport_name, iata_code, cities(city_name, countries(country_name))"
        ).execute()
        return jsonify({"airports": resp.data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── GET /api/flights/upcoming ─────────────────────────────────────────────────
@flights_bp.route("/upcoming", methods=["GET"])
def upcoming_flights():
    """Flights departing in the next 30 days (uses vw_upcoming_flights view)."""
    try:
        resp = supabase_admin.table("vw_upcoming_flights").select("*").execute()
        return jsonify({"flights": resp.data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
