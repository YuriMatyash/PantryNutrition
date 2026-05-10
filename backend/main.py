"""FastAPI entrypoint for Pantry Recipe Agent backend."""

import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from agents.conversation_agent import ConversationAgent
from agents.ingredient_extractor_agent import IngredientExtractorAgent
from agents.nutrition_calculator_agent import NutritionCalculatorAgent
from agents.nutrition_lookup_agent import NutritionLookupAgent
from agents.pantry_agent import PantryAgent
from agents.recipe_generator_agent import RecipeGeneratorAgent
from agents.validation_agent import ValidationAgent
from models.schemas import LoginRequest, PantryUpdateRequest, RecipeGenerateRequest, RegisterRequest
from services.openai_service import OpenAIConfigError, OpenAIJSONError
from services.supabase_service import (
    DuplicateUsernameError,
    SupabaseConfigError,
    SupabaseInsertError,
    SupabaseService,
)

BACKEND_DIR = Path(__file__).resolve().parent
ENV_FILE = BACKEND_DIR / ".env"
load_dotenv(dotenv_path=ENV_FILE)

app = FastAPI(title="Pantry Recipe Agent API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

supabase_service = SupabaseService()
pantry_agent = PantryAgent()
recipe_generator_agent = RecipeGeneratorAgent()
ingredient_extractor_agent = IngredientExtractorAgent()
nutrition_lookup_agent = NutritionLookupAgent()
nutrition_calculator_agent = NutritionCalculatorAgent()
validation_agent = ValidationAgent()
conversation_agent = ConversationAgent(supabase_service)


@app.get("/api/health")
def health_check() -> dict:
    return {"status": "ok"}


@app.post("/api/register")
def register_user(payload: RegisterRequest) -> dict:
    username = payload.username.strip().lower()
    password = payload.password
    if not username or not password:
        raise HTTPException(status_code=400, detail={"error": "Username and password are required."})
    try:
        return supabase_service.create_user(username=username, password=password)
    except DuplicateUsernameError:
        raise HTTPException(status_code=409, detail={"error": "Username already exists."})
    except SupabaseConfigError as exc:
        print(f"[register_user] {type(exc).__name__}: {exc}")
        raise HTTPException(status_code=500, detail={"error": str(exc)})
    except SupabaseInsertError as exc:
        print(f"[register_user] {type(exc).__name__}: {exc}")
        raise HTTPException(status_code=500, detail={"error": "Failed to register user."})
    except Exception as exc:
        print(f"[register_user] Unexpected error: {type(exc).__name__}: {exc}")
        raise HTTPException(status_code=500, detail={"error": "Failed to register user."})


@app.post("/api/login")
def login_user(payload: LoginRequest) -> dict:
    username = payload.username.strip().lower()
    password = payload.password
    if not username or not password:
        raise HTTPException(status_code=400, detail={"error": "Username and password are required."})
    user = supabase_service.verify_login(username=username, password=password)
    if not user:
        raise HTTPException(status_code=401, detail={"error": "Invalid username or password."})
    return user


@app.get("/api/users/{user_id}/pantry")
def get_user_pantry(user_id: str) -> dict:
    if not supabase_service.user_exists(user_id):
        raise HTTPException(status_code=404, detail={"error": "User does not exist."})
    return {"items": supabase_service.get_pantry(user_id)}


@app.put("/api/users/{user_id}/pantry")
def save_user_pantry(user_id: str, payload: PantryUpdateRequest) -> dict:
    if not supabase_service.user_exists(user_id):
        raise HTTPException(status_code=404, detail={"error": "User does not exist."})
    try:
        cleaned_items = pantry_agent.clean_pantry_items([item.model_dump() for item in payload.items])
        saved_items = supabase_service.save_pantry(user_id, cleaned_items)
        return {"success": True, "items": saved_items}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail={"error": str(exc)})


@app.get("/api/users/{user_id}/recipes")
def list_user_recipes(user_id: str) -> list[dict]:
    if not supabase_service.user_exists(user_id):
        raise HTTPException(status_code=404, detail={"error": "User does not exist."})
    return supabase_service.list_user_recipes(user_id)


@app.get("/api/recipes/{recipe_id}")
def get_recipe(recipe_id: str, user_id: str) -> dict:
    recipe = supabase_service.get_recipe_by_id(recipe_id, user_id)
    if not recipe:
        raise HTTPException(status_code=404, detail={"error": "Recipe not found."})
    return recipe


@app.delete("/api/recipes/{recipe_id}")
def delete_recipe(recipe_id: str, user_id: str) -> dict:
    deleted = supabase_service.delete_recipe(recipe_id, user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail={"error": "Recipe not found."})
    return {"success": True}


@app.post("/api/users/{user_id}/recipes/generate")
def generate_recipe(user_id: str, payload: RecipeGenerateRequest) -> dict:
    if not supabase_service.user_exists(user_id):
        raise HTTPException(status_code=404, detail={"error": "User does not exist."})

    if os.getenv("USE_MOCK_USDA", "false").lower() != "true":
        raise HTTPException(status_code=400, detail={"error": "USE_MOCK_USDA must be true in this phase."})

    pantry_items = supabase_service.get_pantry(user_id)
    cleaned_pantry = pantry_agent.clean_pantry_items(pantry_items)

    conversation_id = conversation_agent.create_conversation(user_id=user_id)
    conversation_agent.add_message(conversation_id, "user", payload.message)

    try:
        recipe = recipe_generator_agent.generate_recipe(
            pantry_items=cleaned_pantry,
            meal_type=payload.meal_type,
            preference=payload.preference,
            use_only_pantry=payload.use_only_pantry,
            user_message=payload.message,
        )
    except OpenAIConfigError as exc:
        raise HTTPException(status_code=500, detail={"error": str(exc)})
    except OpenAIJSONError as exc:
        raise HTTPException(status_code=502, detail={"error": str(exc)})
    except Exception as exc:
        raise HTTPException(status_code=500, detail={"error": f"Recipe generation failed: {exc}"})

    recipe = validation_agent.validate_recipe(recipe)
    ingredients = ingredient_extractor_agent.extract_ingredients(recipe)
    nutrition_items = nutrition_lookup_agent.lookup_ingredients(ingredients)
    nutrition = nutrition_calculator_agent.calculate_total_nutrition(nutrition_items)

    recipe_to_save = {
        "user_id": user_id,
        "title": recipe["title"],
        "description": "Generated in mock mode",
        "ingredients": recipe["ingredients"],
        "instructions": recipe["instructions"],
        "servings": recipe["servings"],
        "nutrition": nutrition,
        "tags": recipe.get("tags", []),
    }
    saved_recipe = supabase_service.save_recipe(recipe_to_save)

    supabase_service.link_conversation_to_recipe(conversation_id, saved_recipe["id"])
    conversation_agent.add_message(conversation_id, "assistant", f"Created recipe: {saved_recipe['title']}")

    saved_recipe["missing_ingredients"] = recipe.get("missing_ingredients", [])
    return {"recipe": saved_recipe, "conversation_id": conversation_id}
