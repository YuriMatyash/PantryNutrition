"""Recipe generator agent using mock mode or OpenAI mode."""

import os

from services.openai_service import OpenAIConfigError, OpenAIJSONError, OpenAIService


class RecipeGeneratorAgent:
    """Generates recipes from pantry + user preferences."""

    def __init__(self) -> None:
        self.openai_service = OpenAIService()

    def _generate_mock_recipe(
        self,
        pantry_items: list[dict],
        meal_type: str,
        preference: str,
        use_only_pantry: bool,
        user_message: str,
    ) -> dict:
        pantry_names = {item["name"] for item in pantry_items}
        base_ingredients = []
        for item in pantry_items[:4]:
            base_ingredients.append(
                {
                    "name": item["name"],
                    "amount": min(float(item["amount"]), 200),
                    "unit": item["unit"],
                }
            )

        if not base_ingredients:
            base_ingredients = [{"name": "egg", "amount": 2, "unit": "unit"}]

        missing_ingredients = []
        if not use_only_pantry and "salt" not in pantry_names:
            missing_ingredients.append({"name": "salt", "amount": 2, "unit": "g"})

        return {
            "title": f"Mock {preference.title()} {meal_type.title()} Bowl",
            "ingredients": base_ingredients,
            "instructions": [
                "Prepare ingredients from the list.",
                "Cook and combine ingredients in a pan or pot.",
                "Serve warm.",
                f"User request considered: {user_message.strip()}" if user_message.strip() else "",
            ],
            "servings": 1,
            "tags": [preference, meal_type, "mock"],
            "missing_ingredients": missing_ingredients,
        }

    def _build_openai_prompt(
        self,
        pantry_items: list[dict],
        meal_type: str,
        preference: str,
        use_only_pantry: bool,
        user_message: str,
    ) -> str:
        return f"""
You are a recipe generator. Return JSON only (no markdown, no explanations).

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
- Allowed units only: g, ml, unit.
- Forbidden units: cup, cups, tbsp, tsp, pinch, handful, to taste.
- Every ingredient must include name, amount, unit.
- If use_only_pantry is true, use only pantry ingredients.
- If use_only_pantry is false, you may suggest missing ingredients and list them in missing_ingredients.

Inputs:
- pantry_items: {pantry_items}
- meal_type: {meal_type}
- preference: {preference}
- use_only_pantry: {use_only_pantry}
- user_message: {user_message}
"""

    def generate_recipe(
        self,
        pantry_items: list[dict],
        meal_type: str,
        preference: str,
        use_only_pantry: bool,
        user_message: str,
    ) -> dict:
        use_mock_openai = os.getenv("USE_MOCK_OPENAI", "false").lower() == "true"
        if use_mock_openai:
            recipe = self._generate_mock_recipe(
                pantry_items, meal_type, preference, use_only_pantry, user_message
            )
            recipe["instructions"] = [s for s in recipe["instructions"] if s]
            return recipe

        prompt = self._build_openai_prompt(
            pantry_items, meal_type, preference, use_only_pantry, user_message
        )
        try:
            return self.openai_service.generate_recipe_json(prompt)
        except (OpenAIConfigError, OpenAIJSONError):
            raise
        except Exception as exc:
            raise RuntimeError(str(exc))
