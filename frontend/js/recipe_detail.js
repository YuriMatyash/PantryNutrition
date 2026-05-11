function getRecipeIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("recipe_id");
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
      if (typeof item === "string") {
        li.textContent = item;
      } else {
        li.textContent = `${item.name}: ${item.amount} ${item.unit}`;
      }
      missingList.appendChild(li);
    });
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

loadRecipeDetail();
