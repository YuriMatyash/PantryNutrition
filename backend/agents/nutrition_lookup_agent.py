"""Nutrition lookup agent with mock and USDA modes."""

import os

from services.usda_service import USDAConfigError, USDAService, USDAServiceError


class NutritionLookupAgent:
    MOCK_NUTRITION_PER_100G = {
        "egg": {"calories": 155, "protein_g": 13, "carbs_g": 1.1, "fat_g": 11},
        "rice": {"calories": 130, "protein_g": 2.7, "carbs_g": 28, "fat_g": 0.3},
        "milk": {"calories": 61, "protein_g": 3.2, "carbs_g": 4.8, "fat_g": 3.3},
    }

    def __init__(self) -> None:
        self.usda_service = USDAService()

    def _mock_lookup(self, item: dict) -> dict:
        name = item["name"]
        nutrition = self.MOCK_NUTRITION_PER_100G.get(
            name,
            {"calories": 90, "protein_g": 3.0, "carbs_g": 12.0, "fat_g": 2.0},
        )
        return {
            "name": name,
            "matched_usda_food": f"Mock food: {name}",
            "usda_food_id": None,
            "amount": item["amount"],
            "unit": item["unit"],
            "per_100g": nutrition,
            "warning": None,
        }

    def lookup_ingredients(self, ingredients: list[dict]) -> list[dict]:
        use_mock_usda = os.getenv("USE_MOCK_USDA", "false").lower() == "true"
        results: list[dict] = []

        for item in ingredients:
            if use_mock_usda:
                results.append(self._mock_lookup(item))
                continue

            try:
                match = self.usda_service.search_best_match(item["name"])
                if not match:
                    results.append(
                        {
                            "name": item["name"],
                            "matched_usda_food": item["name"],
                            "usda_food_id": None,
                            "amount": item["amount"],
                            "unit": item["unit"],
                            "per_100g": {"calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0},
                            "warning": f"No USDA match found for '{item['name']}'.",
                        }
                    )
                    continue

                warning = None
                if str(match.get("data_type", "")).lower() == "branded":
                    warning = f"Used branded USDA match for '{item['name']}'."

                results.append(
                    {
                        "name": item["name"],
                        "matched_usda_food": match.get("description", item["name"]),
                        "usda_food_id": match.get("fdc_id"),
                        "amount": item["amount"],
                        "unit": item["unit"],
                        "per_100g": match.get("per_100g", {"calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0}),
                        "warning": warning,
                    }
                )
            except USDAConfigError:
                raise
            except USDAServiceError as exc:
                results.append(
                    {
                        "name": item["name"],
                        "matched_usda_food": item["name"],
                        "usda_food_id": None,
                        "amount": item["amount"],
                        "unit": item["unit"],
                        "per_100g": {"calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0},
                        "warning": f"USDA lookup failed for '{item['name']}': {exc}",
                    }
                )

        return results
