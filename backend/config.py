import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")
SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"

# Anon client — used for public operations
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Admin client — used for auth verification and privileged operations
supabase_admin: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
