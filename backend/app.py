from flask import Flask
from flask_cors import CORS
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from config import SECRET_KEY, DEBUG


def create_app():
    app = Flask(__name__)
    app.url_map.strict_slashes = False
    app.secret_key = SECRET_KEY

    # CORS setup: restrict origins in production
    CORS_ORIGIN = os.getenv("ALLOWED_CORS_ORIGIN", "http://localhost:3000")
    CORS(app, origins=[CORS_ORIGIN] if not DEBUG else "*", supports_credentials=True,
         allow_headers=["Content-Type", "Authorization"])

    # Security headers filter
    @app.after_request
    def set_security_headers(response):
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        if not DEBUG:
            # Enforce HTTPS only in production
            response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
        return response

    # ── Register Blueprints ───────────────────────────────────
    from routes.auth     import auth_bp
    from routes.flights  import flights_bp
    from routes.bookings import bookings_bp
    from routes.admin    import admin_bp
    from routes.reports  import reports_bp

    app.register_blueprint(auth_bp,     url_prefix="/api/auth")
    app.register_blueprint(flights_bp,  url_prefix="/api/flights")
    app.register_blueprint(bookings_bp, url_prefix="/api/bookings")
    app.register_blueprint(admin_bp,    url_prefix="/api/admin")
    app.register_blueprint(reports_bp,  url_prefix="/api/reports")

    # ── Health check ─────────────────────────────────────────
    @app.route("/api/health")
    def health():
        return {"status": "ok", "message": "✈️  Flight Booking API is running"}

    # ── Global error handlers ─────────────────────────────────
    @app.errorhandler(404)
    def not_found(e):
        return {"error": "Resource not found"}, 404

    @app.errorhandler(500)
    def server_error(e):
        return {"error": "Internal server error", "detail": str(e)}, 500

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=DEBUG, port=5000)
