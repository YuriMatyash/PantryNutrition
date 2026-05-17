"""Nutrition calculator for whole recipe totals."""


class NutritionCalculatorAgent:
    def _estimate_grams(self, amount: float, unit: str, ingredient_name: str = "") -> float:
        if unit == "g":
            return amount
        if unit == "ml":
            # MVP assumption: liquids are close to water unless clearly oil/fat.
            oil_keywords = ["oil", "butter", "ghee"]
            if any(word in ingredient_name.lower() for word in oil_keywords):
                return amount * 0.92
            return amount
        if unit == "unit":
            return amount * 50  # 1 egg ~= 50 g simple assumption
        return amount

    def calculate_total_nutrition(self, nutrition_items: list[dict]) -> dict:
        total = {"calories": 0.0, "protein_g": 0.0, "carbs_g": 0.0, "fat_g": 0.0}
        ingredients = []
        warnings = []

        for item in nutrition_items:
            per_100g = item.get("per_100g", {})
            if not per_100g:
                warnings.append(f"Missing nutrition data for '{item['name']}'.")
                continue

            grams = self._estimate_grams(float(item["amount"]), item["unit"], item["name"])
            factor = grams / 100.0

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
