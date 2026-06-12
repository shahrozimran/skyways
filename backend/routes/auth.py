from flask import Blueprint, request, jsonify
from functools import wraps
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config import supabase, supabase_admin

auth_bp = Blueprint("auth", __name__)

# ── Auth middleware decorator ─────────────────────────────────────────────────
def require_auth(f):
    """Verifies Supabase JWT from Authorization header."""
    @wraps(f)
    def decorated(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid Authorization header"}), 401
        token = header.split(" ", 1)[1]
        try:
            user_resp = supabase_admin.auth.get_user(token)
            user = user_resp.user
            request.user = user
            
            # Ensure passenger profile exists in database
            pax = supabase_admin.table("passengers").select("passenger_id").eq("supabase_uid", user.id).execute()
            if not pax.data:
                metadata = getattr(user, "user_metadata", {}) or {}
                first_name = metadata.get("first_name") or metadata.get("name") or "Passenger"
                last_name = metadata.get("last_name") or "User"
                if "name" in metadata and not metadata.get("first_name"):
                    parts = metadata["name"].split(" ", 1)
                    first_name = parts[0]
                    last_name = parts[1] if len(parts) > 1 else "User"
                
                supabase_admin.table("passengers").insert({
                    "supabase_uid": user.id,
                    "first_name": first_name,
                    "last_name": last_name,
                    "email": user.email
                }).execute()
        except Exception as e:
            return jsonify({"error": "Invalid or expired token", "detail": str(e)}), 401
        return f(*args, **kwargs)
    return decorated


def require_admin(f):
    """Extends require_auth — also checks admins table."""
    @wraps(f)
    @require_auth
    def decorated(*args, **kwargs):
        uid = request.user.id
        result = supabase_admin.table("admins").select("admin_id").eq("supabase_uid", uid).execute()
        if not result.data:
            return jsonify({"error": "Admin access required"}), 403
        return f(*args, **kwargs)
    return decorated


# ── POST /api/auth/register ───────────────────────────────────────────────────
@auth_bp.route("/register", methods=["POST"])
def register():
    """Register a new passenger account via Supabase Auth."""
    data = request.get_json() or {}
    required = ["email", "password", "first_name", "last_name"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    try:
        # 1. Create Supabase Auth user
        auth_resp = supabase_admin.auth.admin.create_user({
            "email": data["email"],
            "password": data["password"],
            "email_confirm": True,
        })
        uid = auth_resp.user.id

        # 2. Create passenger profile
        passenger_data = {
            "supabase_uid":   uid,
            "first_name":     data["first_name"],
            "last_name":      data["last_name"],
            "email":          data["email"],
            "phone":          data.get("phone"),
            "passport_no":    data.get("passport_no"),
            "date_of_birth":  data.get("date_of_birth"),
            "nationality_id": data.get("nationality_id"),
        }
        pax_resp = supabase_admin.table("passengers").insert(passenger_data).execute()

        return jsonify({
            "message": "Registration successful",
            "passenger": pax_resp.data[0] if pax_resp.data else {},
        }), 201

    except Exception as e:
        return jsonify({"error": "Registration failed", "detail": str(e)}), 400


# ── POST /api/auth/login ──────────────────────────────────────────────────────
@auth_bp.route("/login", methods=["POST"])
def login():
    """Sign in via Supabase Auth and return session tokens."""
    data = request.get_json() or {}
    email    = data.get("email", "").strip()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    try:
        session = supabase.auth.sign_in_with_password({"email": email, "password": password})
        user    = session.user
        token   = session.session.access_token

        # Fetch passenger profile or create if missing
        pax = supabase_admin.table("passengers").select("*").eq("supabase_uid", user.id).execute()
        pax_data = None
        if pax.data:
            pax_data = pax.data[0]
        else:
            metadata = getattr(user, "user_metadata", {}) or {}
            first_name = metadata.get("first_name") or metadata.get("name") or "Passenger"
            last_name = metadata.get("last_name") or "User"
            if "name" in metadata and not metadata.get("first_name"):
                parts = metadata["name"].split(" ", 1)
                first_name = parts[0]
                last_name = parts[1] if len(parts) > 1 else "User"
            
            insert_resp = supabase_admin.table("passengers").insert({
                "supabase_uid": user.id,
                "first_name": first_name,
                "last_name": last_name,
                "email": user.email
            }).execute()
            if insert_resp.data:
                pax_data = insert_resp.data[0]

        # Check admin
        adm = supabase_admin.table("admins").select("admin_id").eq("supabase_uid", user.id).execute()
        is_admin = bool(adm.data)

        return jsonify({
            "message":      "Login successful",
            "access_token": token,
            "user": {
                "id":        user.id,
                "email":     user.email,
                "is_admin":  is_admin,
            },
            "passenger": pax_data,
        }), 200

    except Exception as e:
        return jsonify({"error": "Login failed", "detail": str(e)}), 401


# ── POST /api/auth/logout ─────────────────────────────────────────────────────
@auth_bp.route("/logout", methods=["POST"])
@require_auth
def logout():
    """Sign out current user."""
    try:
        supabase.auth.sign_out()
        return jsonify({"message": "Logged out successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# ── GET /api/auth/profile ─────────────────────────────────────────────────────
@auth_bp.route("/profile", methods=["GET"])
@require_auth
def profile():
    """Get the current user's passenger profile."""
    uid = request.user.id
    pax = supabase_admin.table("passengers").select("*, countries(country_name)").eq("supabase_uid", uid).execute()
    if not pax.data:
        return jsonify({"error": "Profile not found"}), 404
    return jsonify({"passenger": pax.data[0]}), 200


# ── PUT /api/auth/profile ─────────────────────────────────────────────────────
@auth_bp.route("/profile", methods=["PUT"])
@require_auth
def update_profile():
    """Update the current user's passenger profile."""
    uid  = request.user.id
    data = request.get_json() or {}

    allowed = ["first_name", "last_name", "phone", "passport_no", "date_of_birth", "nationality_id"]
    update_data = {k: v for k, v in data.items() if k in allowed}

    if not update_data:
        return jsonify({"error": "No valid fields to update"}), 400

    resp = supabase_admin.table("passengers").update(update_data).eq("supabase_uid", uid).execute()
    return jsonify({"message": "Profile updated", "passenger": resp.data[0] if resp.data else {}}), 200


# ── GET /api/auth/countries ───────────────────────────────────────────────────
@auth_bp.route("/countries", methods=["GET"])
def get_countries():
    """Get the master list of countries for registration/profile forms."""
    try:
        res = supabase_admin.table("countries").select("*").order("country_name").execute()
        return jsonify({"countries": res.data or []}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

