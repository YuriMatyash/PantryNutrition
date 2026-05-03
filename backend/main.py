"""FastAPI entrypoint for Pantry Recipe Agent backend."""

from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from agents.pantry_agent import PantryAgent
from models.schemas import LoginRequest, PantryUpdateRequest, RegisterRequest
from services.supabase_service import SupabaseService


# Load backend/.env for local development.
BACKEND_DIR = Path(__file__).resolve().parent
ENV_FILE = BACKEND_DIR / ".env"
load_dotenv(dotenv_path=ENV_FILE)

app = FastAPI(title="Pantry Recipe Agent API")

# CORS is enabled so local frontend pages can call this backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

supabase_service = SupabaseService()
pantry_agent = PantryAgent()


@app.get("/api/health")
def health_check() -> dict:
    """Simple health endpoint to verify the backend is running."""
    return {"status": "ok"}


@app.post("/api/register")
def register_user(payload: RegisterRequest) -> dict:
    username = payload.username.strip().lower()
    password = payload.password

    if not username or not password:
        raise HTTPException(status_code=400, detail={"error": "Username and password are required."})

    try:
        return supabase_service.create_user(username=username, password=password)
    except ValueError as exc:
        message = str(exc)
        if message == "Username already exists.":
            raise HTTPException(status_code=409, detail={"error": message})
        raise HTTPException(status_code=400, detail={"error": message})
    except Exception:
        raise HTTPException(status_code=500, detail={"error": "Failed to register user."})


@app.post("/api/login")
def login_user(payload: LoginRequest) -> dict:
    username = payload.username.strip().lower()
    password = payload.password

    if not username or not password:
        raise HTTPException(status_code=400, detail={"error": "Username and password are required."})

    try:
        user = supabase_service.verify_login(username=username, password=password)
    except Exception:
        raise HTTPException(status_code=500, detail={"error": "Failed to login."})

    if not user:
        raise HTTPException(status_code=401, detail={"error": "Invalid username or password."})

    return user


@app.get("/api/users/{user_id}/pantry")
def get_user_pantry(user_id: str) -> dict:
    try:
        if not supabase_service.user_exists(user_id):
            raise HTTPException(status_code=404, detail={"error": "User does not exist."})

        items = supabase_service.get_pantry(user_id)
        return {"items": items}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail={"error": "Failed to load pantry."})


@app.put("/api/users/{user_id}/pantry")
def save_user_pantry(user_id: str, payload: PantryUpdateRequest) -> dict:
    try:
        if not supabase_service.user_exists(user_id):
            raise HTTPException(status_code=404, detail={"error": "User does not exist."})

        cleaned_items = pantry_agent.clean_pantry_items([item.model_dump() for item in payload.items])
        saved_items = supabase_service.save_pantry(user_id, cleaned_items)
        return {"success": True, "items": saved_items}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail={"error": str(exc)})
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail={"error": "Failed to save pantry."})
