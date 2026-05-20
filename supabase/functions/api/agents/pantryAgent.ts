export class PantryValidationError extends Error {}

const ALLOWED_UNITS = new Set(["g", "ml", "unit"]);

function normalizeName(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeUnit(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function isEmptyAmount(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

export interface PantryItem {
  name: string;
  amount: number;
  unit: "g" | "ml" | "unit";
}

export function cleanPantryItems(items: unknown): PantryItem[] {
  if (!Array.isArray(items)) {
    throw new PantryValidationError("Pantry items must be an array.");
  }

  const cleaned: PantryItem[] = [];

  for (let i = 0; i < items.length; i += 1) {
    const row = items[i] as Record<string, unknown>;
    const name = normalizeName(row?.name);
    const unit = normalizeUnit(row?.unit);
    const amountRaw = row?.amount;

    if (name === "" && isEmptyAmount(amountRaw) && unit === "") {
      continue;
    }

    if (!name) {
      throw new PantryValidationError(`Invalid pantry item at row ${i + 1}: name is required.`);
    }

    const amount = Number(amountRaw);
    if (!Number.isFinite(amount)) {
      throw new PantryValidationError(`Invalid amount for '${name}'. Amount must be numeric.`);
    }

    if (amount <= 0) {
      throw new PantryValidationError(`Invalid amount for '${name}'. Amount must be greater than 0.`);
    }

    if (!ALLOWED_UNITS.has(unit)) {
      throw new PantryValidationError(`Invalid unit for '${name}'. Allowed units are: g, ml, unit.`);
    }

    cleaned.push({ name, amount, unit: unit as PantryItem["unit"] });
  }

  return cleaned;
}
