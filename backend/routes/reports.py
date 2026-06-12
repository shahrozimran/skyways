from flask import Blueprint, request, jsonify
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config import supabase_admin
from routes.auth import require_admin

reports_bp = Blueprint("reports", __name__)


# ── GET /api/reports/revenue ──────────────────────────────────────────────────
@reports_bp.route("/revenue", methods=["GET"])
@require_admin
def revenue_report():
    """
    Revenue report by date range.
    Query params: start_date (YYYY-MM-DD), end_date (YYYY-MM-DD)
    Calls fn_revenue_report stored function.
    """
    start = request.args.get("start_date", "")
    end   = request.args.get("end_date", "")
    params = {}
    if start: params["p_start_date"] = start
    if end:   params["p_end_date"]   = end
    try:
        resp = supabase_admin.rpc("fn_revenue_report", params).execute()
        total = sum(r.get("revenue") or 0 for r in (resp.data or []))
        return jsonify({
            "report":        resp.data or [],
            "total_revenue": round(total, 2),
            "start_date":    start or "all",
            "end_date":      end   or "today",
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── GET /api/reports/occupancy ────────────────────────────────────────────────
@reports_bp.route("/occupancy", methods=["GET"])
@require_admin
def occupancy_report():
    """Seat occupancy per flight using vw_flight_occupancy view."""
    try:
        resp = supabase_admin.table("vw_flight_occupancy").select("*").order(
            "occupancy_pct", desc=True
        ).execute()
        return jsonify({"occupancy": resp.data or []}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── GET /api/reports/popular-routes ──────────────────────────────────────────
@reports_bp.route("/popular-routes", methods=["GET"])
@require_admin
def popular_routes():
    """Most popular routes by booking count using vw_popular_routes view."""
    try:
        limit = min(int(request.args.get("limit", 10)), 50)
        resp  = supabase_admin.table("vw_popular_routes").select("*").limit(limit).execute()
        return jsonify({"routes": resp.data or []}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── GET /api/reports/airlines ─────────────────────────────────────────────────
@reports_bp.route("/airlines", methods=["GET"])
@require_admin
def airline_revenue():
    """Revenue breakdown per airline using vw_revenue_by_airline view."""
    try:
        resp = supabase_admin.table("vw_revenue_by_airline").select("*").order(
            "total_revenue", desc=True
        ).execute()
        return jsonify({"airlines": resp.data or []}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── GET /api/reports/summary ──────────────────────────────────────────────────
@reports_bp.route("/summary", methods=["GET"])
@require_admin
def dashboard_summary():
    """High-level KPIs for the admin dashboard."""
    try:
        # Total bookings
        total_bookings = supabase_admin.table("bookings").select("booking_id", count="exact").execute()
        # Confirmed bookings
        confirmed = supabase_admin.table("bookings").select("booking_id", count="exact").eq(
            "booking_status", "Confirmed"
        ).execute()
        # Total revenue
        payments = supabase_admin.table("payments").select("amount").eq("payment_status", "Success").execute()
        total_revenue = sum(p["amount"] for p in (payments.data or []))
        # Total passengers
        passengers = supabase_admin.table("passengers").select("passenger_id", count="exact").execute()
        # Active flights
        active = supabase_admin.table("flights").select("flight_id", count="exact").in_(
            "status", ["Scheduled", "Delayed"]
        ).execute()

        return jsonify({
            "total_bookings":     total_bookings.count or 0,
            "confirmed_bookings": confirmed.count or 0,
            "total_revenue":      round(total_revenue, 2),
            "total_passengers":   passengers.count or 0,
            "active_flights":     active.count or 0,
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── GET /api/reports/passenger/<passenger_id> ─────────────────────────────────
@reports_bp.route("/passenger/<int:passenger_id>", methods=["GET"])
@require_admin
def passenger_stats(passenger_id):
    """Detailed stats for a specific passenger using fn_passenger_stats."""
    try:
        resp = supabase_admin.rpc("fn_passenger_stats", {"p_passenger_id": passenger_id}).execute()
        return jsonify({"stats": resp.data[0] if resp.data else {}}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
