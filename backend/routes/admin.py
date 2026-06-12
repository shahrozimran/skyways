from flask import Blueprint, request, jsonify
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config import supabase_admin
from routes.auth import require_admin

admin_bp = Blueprint("admin", __name__)


# ── GET /api/admin/flights ────────────────────────────────────────────────────
@admin_bp.route("/flights", methods=["GET"])
@require_admin
def list_all_flights():
    """Admin: list all flights with full details and occupancy."""
    try:
        resp = supabase_admin.table("vw_flight_occupancy").select("*").execute()
        return jsonify({"flights": resp.data or []}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── POST /api/admin/flights ───────────────────────────────────────────────────
@admin_bp.route("/flights", methods=["POST"])
@require_admin
def create_flight():
    """Admin: add a new flight."""
    data = request.get_json() or {}
    required = ["flight_number", "airline_id", "aircraft_id", "origin_airport_id",
                "dest_airport_id", "departure_time", "arrival_time", "base_price"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing: {', '.join(missing)}"}), 400

    try:
        flight_data = {
            "flight_number":      data["flight_number"],
            "airline_id":         data["airline_id"],
            "aircraft_id":        data["aircraft_id"],
            "origin_airport_id":  data["origin_airport_id"],
            "dest_airport_id":    data["dest_airport_id"],
            "departure_time":     data["departure_time"],
            "arrival_time":       data["arrival_time"],
            "base_price":         float(data["base_price"]),
            "status":             data.get("status", "Scheduled"),
            "available_seats":    0,
        }
        resp = supabase_admin.table("flights").insert(flight_data).execute()
        flight_id = resp.data[0]["flight_id"]

        return jsonify({"message": "Flight created", "flight_id": flight_id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── PUT /api/admin/flights/<flight_id> ────────────────────────────────────────
@admin_bp.route("/flights/<int:flight_id>", methods=["PUT"])
@require_admin
def update_flight(flight_id):
    """Admin: update flight details or status (status change triggers audit log)."""
    data = request.get_json() or {}
    allowed = ["departure_time", "arrival_time", "base_price", "status", "available_seats"]
    update_data = {k: v for k, v in data.items() if k in allowed}
    if not update_data:
        return jsonify({"error": "No valid fields to update"}), 400
    try:
        resp = supabase_admin.table("flights").update(update_data).eq("flight_id", flight_id).execute()
        return jsonify({"message": "Flight updated", "flight": resp.data[0] if resp.data else {}}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── DELETE /api/admin/flights/<flight_id> ─────────────────────────────────────
@admin_bp.route("/flights/<int:flight_id>", methods=["DELETE"])
@require_admin
def delete_flight(flight_id):
    """Admin: cancel (soft delete) a flight by setting status to Cancelled."""
    try:
        supabase_admin.table("flights").update({"status": "Cancelled"}).eq("flight_id", flight_id).execute()
        return jsonify({"message": "Flight cancelled successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── GET /api/admin/passengers ─────────────────────────────────────────────────
@admin_bp.route("/passengers", methods=["GET"])
@require_admin
def list_passengers():
    """Admin: list all passengers."""
    try:
        resp = supabase_admin.table("vw_passenger_history").select("*").execute()
        return jsonify({"passengers": resp.data or []}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── GET /api/admin/bookings ───────────────────────────────────────────────────
@admin_bp.route("/bookings", methods=["GET"])
@require_admin
def list_all_bookings():
    """Admin: list all bookings with full details."""
    status = request.args.get("status")
    try:
        query = supabase_admin.table("vw_booking_details").select("*")
        if status:
            query = query.eq("booking_status", status)
        resp = query.execute()
        return jsonify({"bookings": resp.data or []}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── GET /api/admin/status-log ─────────────────────────────────────────────────
@admin_bp.route("/status-log", methods=["GET"])
@require_admin
def status_log():
    """Admin: view flight status change audit log."""
    try:
        resp = supabase_admin.table("flight_status_log").select(
            "*, flights(flight_number)"
        ).order("changed_at", desc=True).limit(100).execute()
        return jsonify({"logs": resp.data or []}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── GET /api/admin/airlines ───────────────────────────────────────────────────
@admin_bp.route("/airlines", methods=["GET"])
@require_admin
def list_airlines():
    """Admin: list all airlines."""
    try:
        resp = supabase_admin.table("airlines").select("*").execute()
        return jsonify({"airlines": resp.data or []}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── GET /api/admin/aircraft ───────────────────────────────────────────────────
@admin_bp.route("/aircraft", methods=["GET"])
@require_admin
def list_aircraft():
    """Admin: list all aircraft."""
    try:
        resp = supabase_admin.table("aircraft").select("*, airlines(airline_name)").execute()
        return jsonify({"aircraft": resp.data or []}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
