"""Nutrition calculator for whole recipe totals."""


class NutritionCalculatorAgent:
    def _estimate_grams(self, amount: float, unit: str) -> float:
        if unit == "g":
            return amount
        if unit == "ml":
            return amount  # simple 1 ml ~= 1 g for mock mode
        if unit == "unit":
            return amount * 50  # simple assumption for unit ingredients like eggs
        return amount

    def calculate_total_nutrition(self, nutrition_items: list[dict]) -> dict:
        total = {"calories": 0.0, "protein_g": 0.0, "carbs_g": 0.0, "fat_g": 0.0}
        ingredients = []
        warnings = []

        for item in nutrition_items:
            grams = self._estimate_grams(float(item["amount"]), item["unit"])
            factor = grams / 100.0
            per_100g = item["per_100g"]

            ing = {
                "name": item["name"],
                "matched_usda_food": item["matched_usda_food"],
                "amount": item["amount"],
                "unit": item["unit"],
                "calories": round(per_100g["calories"] * factor, 2),
                "protein_g": round(per_100g["protein_g"] * factor, 2),
                "carbs_g": round(per_100g["carbs_g"] * factor, 2),
                "fat_g": round(per_100g["fat_g"] * factor, 2),
            }
            ingredients.append(ing)

            total["calories"] += ing["calories"]
            total["protein_g"] += ing["protein_g"]
            total["carbs_g"] += ing["carbs_g"]
            total["fat_g"] += ing["fat_g"]

            if item.get("warning"):
                warnings.append(item["warning"])

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
