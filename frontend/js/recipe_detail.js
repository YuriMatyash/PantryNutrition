let isEditingRecipe = false;

function getRecipeIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("recipe_id");
}

function setEditStatus(text) {
  const status = document.getElementById("edit-status");
  if (status) status.textContent = text || "";
}

function setEditButtonLoading(isLoading) {
  const button = document.getElementById("edit-recipe-btn");
  if (!button) return;
  button.disabled = isLoading;
  button.textContent = isLoading ? "Editing..." : "Send Edit Request";
}

function renderRecipeDetail(recipe) {
  document.getElementById("recipe-title").textContent = recipe.title || "Recipe";
  document.getElementById("recipe-servings").textContent = recipe.servings || 1;

  const ingredientsBody = document.getElementById("ingredients-body");
  ingredientsBody.innerHTML = "";
  (recipe.ingredients || []).forEach((item) => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${item.name}</td><td>${item.amount}</td><td>${item.unit}</td>`;
    ingredientsBody.appendChild(row);
  });

  const instructionsList = document.getElementById("instructions-list");
  instructionsList.innerHTML = "";
  (recipe.instructions || []).forEach((step) => {
    const li = document.createElement("li");
    li.textContent = step;
    instructionsList.appendChild(li);
  });

  const totals = recipe.nutrition?.total || {};
  document.getElementById("nutrition-calories").textContent = totals.calories ?? 0;
  document.getElementById("nutrition-protein").textContent = totals.protein_g ?? 0;
  document.getElementById("nutrition-carbs").textContent = totals.carbs_g ?? 0;
  document.getElementById("nutrition-fat").textContent = totals.fat_g ?? 0;

  const warnings = recipe.nutrition?.warnings || [];
  const warningSection = document.getElementById("nutrition-warning-section");
  const warningList = document.getElementById("nutrition-warning-list");
  if (warningSection && warningList) {
    warningList.innerHTML = "";
    if (warnings.length > 0) {
      warningSection.style.display = "block";
      warnings.forEach((warning) => {
        const li = document.createElement("li");
        li.textContent = warning;
        warningList.appendChild(li);
      });
    } else {
      warningSection.style.display = "none";
    }
  }

  const missing = recipe.missing_ingredients || [];
  const missingSection = document.getElementById("missing-section");
  const missingList = document.getElementById("missing-list");
  missingList.innerHTML = "";
  if (missing.length > 0) {
    missingSection.style.display = "block";
    missing.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = typeof item === "string" ? item : `${item.name}: ${item.amount} ${item.unit}`;
      missingList.appendChild(li);
    });
  } else {
    missingSection.style.display = "none";
  }


  const usdaSection = document.getElementById("usda-match-section");
  const usdaBody = document.getElementById("usda-match-body");
  if (usdaSection && usdaBody) {
    usdaBody.innerHTML = "";
    const items = recipe.nutrition?.ingredients || [];
    if (items.length > 0) {
      usdaSection.style.display = "block";
      items.forEach((item) => {
        const row = document.createElement("tr");
        row.innerHTML = `<td>${item.name || ""}</td><td>${item.matched_usda_food || "-"}</td><td>${item.data_type || "-"}</td><td>${item.warning || "-"}</td>`;
        usdaBody.appendChild(row);
      });
    } else {
      usdaSection.style.display = "none";
    }
  }

  document.getElementById("recipe-content").style.display = "block";
}

async function loadRecipeDetail() {
  const user = requireLogin();
  if (!user) return;

  const messageEl = document.getElementById("detail-message");
  const recipeId = getRecipeIdFromUrl();

  if (!recipeId) {
    messageEl.textContent = "Missing recipe_id in URL.";
    return;
  }

  try {
    const recipe = await apiGet(`/api/recipes/${recipeId}?user_id=${user.user_id}`);
    renderRecipeDetail(recipe);
  } catch (error) {
    messageEl.textContent = `Failed to load recipe: ${error.message}`;
  }
}

async function handleRecipeEdit() {
  if (isEditingRecipe) return;

  const user = requireLogin();
  if (!user) return;

  const recipeId = getRecipeIdFromUrl();
  const input = document.getElementById("edit-message");
  const message = input.value.trim();

  if (!message) {
    setEditStatus("Please enter an edit request.");
    return;
  }

  isEditingRecipe = true;
  setEditButtonLoading(true);
  setEditStatus("Editing recipe...");

  try {
    const response = await apiPost(`/api/recipes/${recipeId}/edit`, {
      user_id: user.user_id,
      message,
    });
    renderRecipeDetail(response.recipe);
    setEditStatus("Recipe updated successfully.");
    input.value = "";
  } catch (error) {
    setEditStatus(`Edit failed: ${error.message}`);
  } finally {
    isEditingRecipe = false;
    setEditButtonLoading(false);
  }
}

(function initRecipeDetailPage() {
  loadRecipeDetail();
  const editBtn = document.getElementById("edit-recipe-btn");
  if (editBtn) {
    editBtn.addEventListener("click", handleRecipeEdit);
  }
})();
