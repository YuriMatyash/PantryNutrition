"""Nutrition lookup agent (mock USDA data for Phase 7)."""


class NutritionLookupAgent:
    """Returns predictable nutrition per ingredient for mock mode."""

    MOCK_NUTRITION_PER_100G = {
        "egg": {"calories": 155, "protein_g": 13, "carbs_g": 1.1, "fat_g": 11},
        "rice": {"calories": 130, "protein_g": 2.7, "carbs_g": 28, "fat_g": 0.3},
        "milk": {"calories": 61, "protein_g": 3.2, "carbs_g": 4.8, "fat_g": 3.3},
    }

    def lookup_ingredients(self, ingredients: list[dict]) -> list[dict]:
        results: list[dict] = []
        for item in ingredients:
            name = item["name"]
            nutrition = self.MOCK_NUTRITION_PER_100G.get(
                name,
                {"calories": 90, "protein_g": 3.0, "carbs_g": 12.0, "fat_g": 2.0},
            )

            results.append(
                {
                    "name": name,
                    "matched_usda_food": f"Mock food: {name}",
                    "amount": item["amount"],
                    "unit": item["unit"],
                    "per_100g": nutrition,
                    "warning": None,
                }
            )
        return results
