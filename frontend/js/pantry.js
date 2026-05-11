const ALLOWED_UNITS = ["g", "ml", "unit"];

function createUnitSelect(selectedUnit = "unit") {
  const select = document.createElement("select");
  select.className = "pantry-unit";

  ALLOWED_UNITS.forEach((unit) => {
    const option = document.createElement("option");
    option.value = unit;
    option.textContent = unit;
    if (unit === selectedUnit) option.selected = true;
    select.appendChild(option);
  });

  return select;
}

function addPantryRow(item = { name: "", amount: "", unit: "unit" }) {
  const rowsContainer = document.getElementById("pantry-rows");

  const row = document.createElement("div");
  row.className = "pantry-row";

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.placeholder = "Ingredient name";
  nameInput.className = "pantry-name";
  nameInput.value = item.name || "";

  const amountInput = document.createElement("input");
  amountInput.type = "number";
  amountInput.step = "any";
  amountInput.min = "0";
  amountInput.placeholder = "Amount";
  amountInput.className = "pantry-amount";
  amountInput.value = item.amount ?? "";

  const unitSelect = createUnitSelect(item.unit || "unit");

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.textContent = "Delete";
  deleteBtn.addEventListener("click", () => row.remove());

  row.appendChild(nameInput);
  row.appendChild(amountInput);
  row.appendChild(unitSelect);
  row.appendChild(deleteBtn);

  rowsContainer.appendChild(row);
}

function collectPantryRows() {
  const rows = document.querySelectorAll(".pantry-row");
  const items = [];

  rows.forEach((row) => {
    const name = row.querySelector(".pantry-name").value;
    const amount = row.querySelector(".pantry-amount").value;
    const unit = row.querySelector(".pantry-unit").value;
    items.push({ name, amount, unit });
  });

  return items;
}

async function loadPantryForUser(userId) {
  const messageEl = document.getElementById("message");
  try {
    const data = await apiGet(`/api/users/${userId}/pantry`);
    const items = data.items || [];

    const rowsContainer = document.getElementById("pantry-rows");
    rowsContainer.innerHTML = "";

    const empty = document.getElementById("pantry-empty");
    if (items.length === 0) {
      if (empty) empty.style.display = "block";
      addPantryRow();
      return;
    }

    if (empty) empty.style.display = "none";

    items.forEach((item) => addPantryRow(item));
  } catch (error) {
    messageEl.textContent = error.message;
  }
}

async function savePantryForUser(userId) {
  const messageEl = document.getElementById("message");
  const items = collectPantryRows();

  try {
    await apiPut(`/api/users/${userId}/pantry`, { items });
    messageEl.textContent = "Pantry saved successfully.";
    await loadPantryForUser(userId);
  } catch (error) {
    messageEl.textContent = error.message;
  }
}

(function initPantryPage() {
  const addRowBtn = document.getElementById("add-row-btn");
  const saveBtn = document.getElementById("save-pantry-btn");
  // Not on pantry page.
  if (!addRowBtn || !saveBtn) return;

  const user = requireLogin();
  if (!user) return;

  document.getElementById("user-info").textContent = `Logged in as: ${user.username}`;

  addRowBtn.addEventListener("click", () => addPantryRow());
  saveBtn.addEventListener("click", () => savePantryForUser(user.user_id));

  loadPantryForUser(user.user_id);
})();
