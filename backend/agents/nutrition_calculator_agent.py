"""Nutrition calculator for whole recipe totals."""

import os


class NutritionCalculatorAgent:
    def __init__(self) -> None:
        self.app_env = os.getenv("APP_ENV", "local").lower()

    def _is_local(self) -> bool:
        return self.app_env == "local"

    def _local_log(self, message: str) -> None:
        if self._is_local():
            print(f"[NutritionCalculatorAgent] {message}")

    def _nutrition_contribution(self, item: dict) -> tuple[float, str | None]:
        unit = item.get("unit")
        amount = float(item.get("amount", 0))
        name = str(item.get("name", "")).lower()

        if unit in {"g", "ml"}:
            return amount / 100.0, None

        if unit == "unit":
            if "egg" in name:
                return (amount * 50.0) / 100.0, None
            return 0.0, f"Skipped nutrition for unit-based ingredient '{item.get('name')}' without safe conversion."

        return 0.0, f"Unsupported unit '{unit}' for ingredient '{item.get('name')}'."

    def calculate_total_nutrition(self, nutrition_items: list[dict]) -> dict:
        total = {"calories": 0.0, "protein_g": 0.0, "carbs_g": 0.0, "fat_g": 0.0}
        ingredients = []
        warnings = []

        for item in nutrition_items:
            per_100g = item.get("per_100g")
            if per_100g is None:
                warnings.append(item.get("warning") or f"Missing nutrition data for '{item['name']}'.")
                ingredients.append(
                    {
                        "name": item["name"],
                        "matched_usda_food": item.get("matched_usda_food"),
                        "usda_food_id": item.get("usda_food_id"),
                        "data_type": item.get("data_type"),
                        "amount": item["amount"],
                        "unit": item["unit"],
                        "calories": 0.0,
                        "protein_g": 0.0,
                        "carbs_g": 0.0,
                        "fat_g": 0.0,
                        "fiber_g": 0.0,
                        "sugar_g": 0.0,
                        "sodium_mg": 0.0,
                    }
                )
                continue

            factor, factor_warning = self._nutrition_contribution(item)
            if factor_warning:
                warnings.append(factor_warning)

            ing = {
                "name": item["name"],
                "matched_usda_food": item.get("matched_usda_food", item["name"]),
                "usda_food_id": item.get("usda_food_id"),
                "data_type": item.get("data_type"),
                "amount": item["amount"],
                "unit": item["unit"],
                "calories": round(float(per_100g.get("calories", 0)) * factor, 2),
                "protein_g": round(float(per_100g.get("protein_g", 0)) * factor, 2),
                "carbs_g": round(float(per_100g.get("carbs_g", 0)) * factor, 2),
                "fat_g": round(float(per_100g.get("fat_g", 0)) * factor, 2),
                "fiber_g": round(float(per_100g.get("fiber_g", 0)) * factor, 2),
                "sugar_g": round(float(per_100g.get("sugar_g", 0)) * factor, 2),
                "sodium_mg": round(float(per_100g.get("sodium_mg", 0)) * factor, 2),
            }
            ingredients.append(ing)

            total["calories"] += ing["calories"]
            total["protein_g"] += ing["protein_g"]
            total["carbs_g"] += ing["carbs_g"]
            total["fat_g"] += ing["fat_g"]

            if item.get("warning"):
                warnings.append(item["warning"])

            self._local_log(f"ingredient='{item['name']}' calories_contribution={ing['calories']}")

        return {
            "total": {
                "calories": round(total["calories"], 2),
                "protein_g": round(total["protein_g"], 2),
                "carbs_g": round(total["carbs_g"], 2),
                "fat_g": round(total["fat_g"], 2),
            },
            "ingredients": ingredients,
            "warnings": warnings,
        }
