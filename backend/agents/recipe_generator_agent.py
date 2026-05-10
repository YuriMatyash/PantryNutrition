"""Recipe generator agent (mock mode for Phase 7)."""


class RecipeGeneratorAgent:
    """Generates a recipe dictionary using predictable mock logic."""

    def generate_recipe(
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

        title = f"Mock {preference.title()} {meal_type.title()} Bowl"
        instructions = [
            "Prepare ingredients from the list.",
            "Cook and combine ingredients in a pan or pot.",
            "Serve warm.",
        ]

        if user_message.strip():
            instructions.append(f"User request considered: {user_message.strip()}")

        return {
            "title": title,
            "ingredients": base_ingredients,
            "instructions": instructions,
            "servings": 1,
            "tags": [preference, meal_type, "mock"],
            "missing_ingredients": missing_ingredients,
        }
