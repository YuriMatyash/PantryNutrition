"""Recipe editor agent using mock mode or OpenAI mode."""

import copy
import os

from services.openai_service import OpenAIConfigError, OpenAIJSONError, OpenAIService


class RecipeEditorAgent:
    def __init__(self) -> None:
        self.openai_service = OpenAIService()

    def _mock_edit_recipe(self, recipe: dict, user_message: str) -> dict:
        updated = copy.deepcopy(recipe)
        msg = user_message.lower()

        if "2 servings" in msg or "for 2" in msg:
            updated["servings"] = 2
        if "remove eggs" in msg:
            updated["ingredients"] = [i for i in updated.get("ingredients", []) if i.get("name") != "egg"]
        if "replace milk with water" in msg:
            for ingredient in updated.get("ingredients", []):
                if ingredient.get("name") == "milk":
                    ingredient["name"] = "water"

        updated["tags"] = list(set(updated.get("tags", []) + ["edited", "mock-edit"]))
        updated.setdefault("missing_ingredients", [])
        return {
            "title": updated.get("title", "Updated Recipe"),
            "ingredients": updated.get("ingredients", []),
            "instructions": updated.get("instructions", []),
            "servings": int(updated.get("servings", 1)),
            "tags": updated.get("tags", []),
            "missing_ingredients": updated.get("missing_ingredients", []),
        }

    def _build_edit_prompt(self, recipe: dict, user_message: str) -> str:
        return f"""
You are a recipe editor. Update recipe JSON based on user request.
Return JSON only, no markdown.

Required JSON schema:
{{
  "title": "Recipe title",
  "ingredients": [{{"name":"ingredient","amount":100,"unit":"g"}}],
  "instructions": ["Step 1", "Step 2"],
  "servings": 1,
  "tags": ["high protein", "lunch"],
  "missing_ingredients": []
}}

Rules:
- Keep only units: g, ml, unit.
- Forbidden units: cup, cups, tbsp, tsp, pinch, handful, to taste.
- Every ingredient must contain name, amount, unit.

Current recipe:
{recipe}

User edit request:
{user_message}
"""

    def edit_recipe(self, recipe: dict, user_message: str) -> dict:
        use_mock_openai = os.getenv("USE_MOCK_OPENAI", "false").lower() == "true"
        if use_mock_openai:
            return self._mock_edit_recipe(recipe, user_message)

        prompt = self._build_edit_prompt(recipe, user_message)
        try:
            return self.openai_service.generate_recipe_json(prompt)
        except (OpenAIConfigError, OpenAIJSONError):
            raise
        except Exception as exc:
            raise RuntimeError(str(exc))
