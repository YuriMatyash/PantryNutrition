"""PantryAgent: cleans and validates pantry items from the frontend."""


class PantryAgent:
    """Simple pantry cleaning and validation logic."""

    ALLOWED_UNITS = {"g", "ml", "unit"}

    def clean_pantry_items(self, items: list[dict]) -> list[dict]:
        """Remove empty rows, normalize values, and validate units/amounts."""
        cleaned_items: list[dict] = []

        for raw_item in items:
            name = str(raw_item.get("name", "")).strip().lower()
            amount_raw = raw_item.get("amount")
            unit = str(raw_item.get("unit", "")).strip().lower()

            # Skip truly empty rows so users can keep blank input lines.
            if name == "" and (amount_raw in (None, "")) and unit == "":
                continue

            if not name:
                raise ValueError("Pantry item name is required.")

            try:
                amount = float(amount_raw)
            except (TypeError, ValueError):
                raise ValueError(f"Invalid amount for '{name}'. Amount must be numeric.")

            if amount <= 0:
                raise ValueError(f"Invalid amount for '{name}'. Amount must be greater than zero.")

            if unit not in self.ALLOWED_UNITS:
                raise ValueError(
                    f"Invalid unit for '{name}'. Allowed units are: g, ml, unit."
                )

            cleaned_items.append({"name": name, "amount": amount, "unit": unit})

        return cleaned_items
