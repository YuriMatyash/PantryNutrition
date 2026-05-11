# AGENTS.md

## Project Name

Pantry Recipe Agent Web App

## Goal

Build a local-first, host-ready web app for a university project.

The app allows users to:

1. Register and login.
2. Save their pantry ingredients.
3. Generate recipes using the OpenAI API.
4. Choose recipe preferences such as high protein, low calorie, vegetarian, cheap, quick meal, etc.
5. Save generated recipes.
6. Edit saved recipes through a chatbot.
7. Save recipe-related conversations.
8. Use the USDA FoodData Central API to calculate nutrition values for generated or edited recipes.

The project must clearly demonstrate an **agent-based backend architecture**. Agents must be implemented as real Python classes or functions in separate files.

---

## Local-First, Host-Ready Requirement

The project should run locally first, but it should be written in a way that can later be hosted without a major rewrite.

For now:

- Frontend runs locally.
- Backend runs locally.
- Supabase is used as the database.
- OpenAI and USDA APIs are called from the backend.
- Secrets are stored in a local `.env` file.

Later:

- The frontend can be hosted as static files.
- The backend can be hosted on a Python-compatible service.
- The same Supabase database can still be used.
- Environment variables can be configured in the hosting platform.

Do not write the app in a way that only works on one local computer.

---

## Tech Stack

Use exactly this stack:

- Frontend: plain HTML, CSS, and vanilla JavaScript
- Backend: Python
- Backend framework: FastAPI
- Database: Supabase
- AI API: OpenAI API
- Nutrition API: USDA FoodData Central API

Do not use:

- React
- Vue
- Angular
- Node backend
- Django
- Local JSON storage for main app data

---

## Repository Structure

Create this structure:

```text
project-root/
  AGENTS.md
  README.md
  .gitignore

  frontend/
    index.html
    login.html
    register.html
    pantry.html
    recipes.html
    recipe_detail.html

    css/
      styles.css

    js/
      config.js
      api.js
      auth.js
      pantry.js
      recipes.js
      chat.js

  backend/
    main.py
    requirements.txt
    .env.example

    agents/
      __init__.py
      pantry_agent.py
      recipe_generator_agent.py
      ingredient_extractor_agent.py
      nutrition_lookup_agent.py
      nutrition_calculator_agent.py
      recipe_editor_agent.py
      conversation_agent.py
      validation_agent.py

    services/
      __init__.py
      openai_service.py
      usda_service.py
      supabase_service.py

    models/
      __init__.py
      schemas.py

    utils/
      __init__.py
      ids.py
      time_utils.py
      unit_utils.py

  database/
    schema.sql
```

---

## Important Rules for Codex

1. Keep the code beginner-friendly.
2. Use clear file names, class names, and function names.
3. Add useful comments to explain important logic.
4. Do not over-engineer.
5. Do not use frontend frameworks.
6. Do not call Supabase directly from the frontend.
7. All database access must go through the Python backend.
8. All OpenAI API calls must go through the Python backend.
9. All USDA API calls must go through the Python backend.
10. Do not hardcode API keys in Python files.
11. Use environment variables from `.env`.
12. Put `.env` in `.gitignore`.
13. Agents must be real separate backend modules.
14. The README must explain the agent pipeline clearly.
15. The app must be runnable locally before adding advanced features.
16. Build simple working functionality first, then improve.

---

## Environment Variables

Create:

```text
backend/.env.example
```

With:

```env
OPENAI_API_KEY=your-openai-api-key-here
USDA_API_KEY=your-usda-api-key-here
SUPABASE_URL=your-supabase-url-here
SUPABASE_KEY=your-supabase-key-here
APP_ENV=local
USE_MOCK_OPENAI=false
USE_MOCK_USDA=false
```

The real local file should be:

```text
backend/.env
```

Do not commit `backend/.env`.

Update `.gitignore`:

```gitignore
backend/.env
.env
__pycache__/
*.pyc
.venv/
venv/
node_modules/
.DS_Store
```

Use `python-dotenv` to load environment variables locally.

---

## Frontend Config

Create:

```text
frontend/js/config.js
```

With:

```javascript
const API_BASE_URL = "http://127.0.0.1:8000";
```

All frontend API calls must use `API_BASE_URL`.

Example:

```javascript
fetch(`${API_BASE_URL}/api/health`)
```

Do not hardcode backend URLs in multiple files.

Later, for hosting, only `config.js` should need to change.

---

## Database Design

Use Supabase with SQL schema stored in:

```text
database/schema.sql
```

Use simple project-level authentication. Do not use Supabase Auth for this MVP unless requested later.

---

## Tables

### users

Stores simple app users.

```sql
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  created_at timestamp with time zone default now()
);
```

Use password hashing if simple to implement. Do not store plain passwords if avoidable.

---

### pantries

Each user has one current pantry.

```sql
create table if not exists pantries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  updated_at timestamp with time zone default now(),
  unique(user_id)
);
```

Example `items`:

```json
[
  {
    "name": "egg",
    "amount": 3,
    "unit": "unit"
  },
  {
    "name": "rice",
    "amount": 300,
    "unit": "g"
  },
  {
    "name": "milk",
    "amount": 500,
    "unit": "ml"
  }
]
```

---

### recipes

Stores saved recipes.

```sql
create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  title text not null,
  description text,
  ingredients jsonb not null default '[]'::jsonb,
  instructions jsonb not null default '[]'::jsonb,
  servings integer default 1,
  nutrition jsonb default '{}'::jsonb,
  tags jsonb default '[]'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
```

Example `ingredients`:

```json
[
  {
    "name": "egg",
    "amount": 2,
    "unit": "unit"
  },
  {
    "name": "rice",
    "amount": 200,
    "unit": "g"
  }
]
```

Example `nutrition`:

```json
{
  "total": {
    "calories": 850,
    "protein_g": 42,
    "carbs_g": 105,
    "fat_g": 25
  },
  "ingredients": [
    {
      "name": "egg",
      "matched_usda_food": "Egg, whole, raw, fresh",
      "amount": 2,
      "unit": "unit",
      "calories": 140,
      "protein_g": 12,
      "carbs_g": 1,
      "fat_g": 10
    }
  ],
  "warnings": []
}
```

---

### conversations

Stores chatbot conversations.

```sql
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  recipe_id uuid references recipes(id) on delete set null,
  messages jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
```

Example `messages`:

```json
[
  {
    "role": "user",
    "content": "Make me a high protein lunch from my pantry.",
    "created_at": "2026-05-03T12:00:00"
  },
  {
    "role": "assistant",
    "content": "Created recipe: High Protein Egg Rice Bowl",
    "created_at": "2026-05-03T12:00:05"
  }
]
```

---

## Allowed Units

Recipes and pantry items must use only:

```text
g
ml
unit
```

Do not allow vague cooking units such as:

```text
cup
cups
tbsp
tablespoon
tablespoons
tsp
teaspoon
teaspoons
pinch
handful
some
a little
to taste
```

All generated recipes must use grams, milliliters, or units.

Examples:

Good:

```json
{
  "name": "rice",
  "amount": 200,
  "unit": "g"
}
```

Good:

```json
{
  "name": "milk",
  "amount": 250,
  "unit": "ml"
}
```

Good:

```json
{
  "name": "egg",
  "amount": 2,
  "unit": "unit"
}
```

Bad:

```json
{
  "name": "rice",
  "amount": 1,
  "unit": "cup"
}
```

---

## Recipe Preferences

The user can choose from these preferences:

```text
high calorie
low calorie
high protein
low protein
vegetarian
cheap
quick meal
breakfast
lunch
dinner
```

The frontend should expose these as selectable options.

---

## Pantry Ingredient Mode

The user must be able to choose between:

1. Use only pantry ingredients.
2. Allow the recipe to suggest missing ingredients.

If `use_only_pantry` is true, the generated recipe should only use ingredients from the user's pantry.

If `use_only_pantry` is false, the recipe may suggest missing ingredients, but the response should clearly include which ingredients are missing.

---

## Backend API Endpoints

Implement these endpoints.

---

### Health Check

```text
GET /api/health
```

Response:

```json
{
  "status": "ok"
}
```

---

## Auth Endpoints

### Register

```text
POST /api/register
```

Request:

```json
{
  "username": "yuri",
  "password": "1234"
}
```

Response:

```json
{
  "user_id": "uuid",
  "username": "yuri"
}
```

---

### Login

```text
POST /api/login
```

Request:

```json
{
  "username": "yuri",
  "password": "1234"
}
```

Response:

```json
{
  "user_id": "uuid",
  "username": "yuri"
}
```

For this MVP, the frontend can save `user_id` in `localStorage`.

---

## Pantry Endpoints

### Get User Pantry

```text
GET /api/users/{user_id}/pantry
```

Response:

```json
{
  "items": [
    {
      "name": "egg",
      "amount": 3,
      "unit": "unit"
    }
  ]
}
```

---

### Save User Pantry

```text
PUT /api/users/{user_id}/pantry
```

Request:

```json
{
  "items": [
    {
      "name": "egg",
      "amount": 3,
      "unit": "unit"
    },
    {
      "name": "rice",
      "amount": 300,
      "unit": "g"
    }
  ]
}
```

Response:

```json
{
  "success": true,
  "items": []
}
```

---

## Recipe Endpoints

### Generate Recipe

```text
POST /api/users/{user_id}/recipes/generate
```

Request:

```json
{
  "meal_type": "lunch",
  "preference": "high protein",
  "use_only_pantry": true,
  "message": "I want something easy and filling."
}
```

Response:

```json
{
  "recipe": {
    "id": "uuid",
    "title": "High Protein Egg Rice Bowl",
    "ingredients": [],
    "instructions": [],
    "servings": 1,
    "nutrition": {}
  },
  "conversation_id": "uuid"
}
```

---

### Get All User Recipes

```text
GET /api/users/{user_id}/recipes
```

---

### Get Recipe By ID

```text
GET /api/recipes/{recipe_id}?user_id={user_id}
```

The backend must verify that the recipe belongs to the user.

---

### Delete Recipe

```text
DELETE /api/recipes/{recipe_id}?user_id={user_id}
```

The backend must verify that the recipe belongs to the user.

---

### Edit Recipe With Chatbot

```text
POST /api/recipes/{recipe_id}/edit
```

Request:

```json
{
  "user_id": "uuid",
  "message": "Make this recipe lower calorie but keep it high protein."
}
```

Response:

```json
{
  "recipe": {
    "id": "uuid",
    "title": "Updated Recipe",
    "ingredients": [],
    "instructions": [],
    "servings": 1,
    "nutrition": {}
  },
  "conversation_id": "uuid"
}
```

---

## Conversation Endpoints

### Get Conversation

```text
GET /api/conversations/{conversation_id}?user_id={user_id}
```

---

### Get User Conversations

```text
GET /api/users/{user_id}/conversations
```

---

## Agent Architecture

All agents must live in:

```text
backend/agents/
```

The backend route files should stay simple.

Routes should call agents and services instead of containing all business logic directly.

---

# Required Agents

## 1. PantryAgent

File:

```text
backend/agents/pantry_agent.py
```

Purpose:

Clean and validate pantry input from the frontend.

Responsibilities:

- Accept raw pantry rows from the frontend.
- Remove empty rows.
- Normalize ingredient names.
- Validate amount is numeric.
- Validate amount is greater than zero.
- Validate unit is one of:
  - `g`
  - `ml`
  - `unit`
- Return clean pantry data.

Example:

```python
class PantryAgent:
    def clean_pantry_items(self, items: list[dict]) -> list[dict]:
        pass
```

---

## 2. RecipeGeneratorAgent

File:

```text
backend/agents/recipe_generator_agent.py
```

Purpose:

Use OpenAI to generate a recipe from pantry ingredients and user preferences.

Responsibilities:

- Receive pantry ingredients.
- Receive meal type.
- Receive user preference.
- Receive `use_only_pantry`.
- Receive user message.
- Generate a recipe.
- Force OpenAI to return strict JSON.
- Ensure all quantities are in grams, milliliters, or units.
- Avoid cups, tablespoons, teaspoons, handfuls, pinches, etc.
- Include:
  - title
  - ingredients
  - instructions
  - servings
  - tags
  - missing_ingredients

Example:

```python
class RecipeGeneratorAgent:
    def generate_recipe(
        self,
        pantry_items: list[dict],
        meal_type: str,
        preference: str,
        use_only_pantry: bool,
        user_message: str
    ) -> dict:
        pass
```

OpenAI must return only JSON in this format:

```json
{
  "title": "Recipe title",
  "ingredients": [
    {
      "name": "ingredient name",
      "amount": 100,
      "unit": "g"
    }
  ],
  "instructions": [
    "Step 1",
    "Step 2"
  ],
  "servings": 1,
  "tags": ["high protein", "lunch"],
  "missing_ingredients": []
}
```

---

## 3. IngredientExtractorAgent

File:

```text
backend/agents/ingredient_extractor_agent.py
```

Purpose:

Extract the final ingredient list from a generated or edited recipe.

Responsibilities:

- Receive a recipe dictionary.
- Return a clean list of ingredients.
- Make sure every ingredient has:
  - name
  - amount
  - unit
- Reject or fix vague units.
- Prepare the ingredient list for nutrition lookup.

Example:

```python
class IngredientExtractorAgent:
    def extract_ingredients(self, recipe: dict) -> list[dict]:
        pass
```

---

## 4. NutritionLookupAgent

File:

```text
backend/agents/nutrition_lookup_agent.py
```

Purpose:

Use the USDA FoodData Central API to find nutrition data for each ingredient.

Responsibilities:

- Receive ingredient list.
- Search USDA FoodData Central for the best matching food.
- Prefer generic foods over branded products.
- Extract useful nutrition values.
- Return nutrition values per 100g when possible.
- Handle missing matches without crashing.

Required nutrition values:

```text
calories
protein_g
carbs_g
fat_g
```

Nice-to-have values:

```text
fiber_g
sugar_g
sodium_mg
```

Example:

```python
class NutritionLookupAgent:
    def lookup_ingredients(self, ingredients: list[dict]) -> list[dict]:
        pass
```

If no confident match is found, return a warning for that ingredient instead of crashing.

---

## 5. NutritionCalculatorAgent

File:

```text
backend/agents/nutrition_calculator_agent.py
```

Purpose:

Calculate total nutrition for the whole recipe.

Responsibilities:

- Receive USDA nutrition results.
- Convert nutrition per 100g into nutrition for the actual ingredient amount.
- Handle `g`.
- Handle `ml` with simple assumptions when needed.
- Handle `unit` ingredients like eggs with reasonable assumptions.
- Sum full recipe nutrition.
- Return total nutrition and per-ingredient nutrition.

Example:

```python
class NutritionCalculatorAgent:
    def calculate_total_nutrition(self, nutrition_items: list[dict]) -> dict:
        pass
```

Output format:

```json
{
  "total": {
    "calories": 850,
    "protein_g": 42,
    "carbs_g": 105,
    "fat_g": 25
  },
  "ingredients": [],
  "warnings": []
}
```

Nutrition should be calculated for the **whole recipe**.

Per-serving nutrition is optional for now.

---

## 6. RecipeEditorAgent

File:

```text
backend/agents/recipe_editor_agent.py
```

Purpose:

Use OpenAI to edit an existing recipe based on a user chat message.

Responsibilities:

- Receive current recipe.
- Receive user message.
- Modify the recipe.
- Keep recipe structure valid.
- Return updated recipe JSON.
- Keep units as:
  - `g`
  - `ml`
  - `unit`
- After editing, the normal ingredient extraction and nutrition calculation flow must run again.

Example:

```python
class RecipeEditorAgent:
    def edit_recipe(self, recipe: dict, user_message: str) -> dict:
        pass
```

Editing a recipe must follow this flow:

```text
edit recipe
extract ingredients
lookup nutrition
calculate nutrition
save updated recipe
save conversation message
```

---

## 7. ConversationAgent

File:

```text
backend/agents/conversation_agent.py
```

Purpose:

Manage conversation history for recipe generation and recipe editing.

Responsibilities:

- Create a new conversation.
- Add user messages.
- Add assistant messages.
- Link conversations to users.
- Link conversations to recipes when relevant.
- Save conversation messages in Supabase.

Example:

```python
class ConversationAgent:
    def create_conversation(self, user_id: str, recipe_id: str | None = None) -> str:
        pass

    def add_message(self, conversation_id: str, role: str, content: str) -> None:
        pass
```

---

## 8. ValidationAgent

File:

```text
backend/agents/validation_agent.py
```

Purpose:

Validate generated or edited recipes before saving.

Responsibilities:

- Check recipe has a title.
- Check recipe has ingredients.
- Check recipe has instructions.
- Check servings is valid.
- Check ingredient units are valid.
- Check no vague units were used.
- Return cleaned recipe or raise a clear error.

Example:

```python
class ValidationAgent:
    def validate_recipe(self, recipe: dict) -> dict:
        pass
```

---

# Full Recipe Creation Flow

When a user generates a recipe, follow this exact backend flow:

```text
1. Load user pantry from Supabase.
2. PantryAgent cleans pantry data.
3. ConversationAgent creates a conversation.
4. ConversationAgent saves the user's message.
5. RecipeGeneratorAgent generates recipe JSON using OpenAI.
6. ValidationAgent validates recipe structure.
7. IngredientExtractorAgent extracts clean ingredient list.
8. NutritionLookupAgent calls USDA API for each ingredient.
9. NutritionCalculatorAgent calculates total nutrition.
10. Save recipe to Supabase.
11. Link conversation to recipe.
12. ConversationAgent saves assistant response.
13. Return recipe and conversation ID to frontend.
```

---

# Full Recipe Editing Flow

When a user edits a recipe using the chatbot, follow this exact backend flow:

```text
1. Load existing recipe from Supabase.
2. Verify recipe belongs to the user.
3. Load or create conversation linked to recipe.
4. ConversationAgent saves the user's edit message.
5. RecipeEditorAgent edits recipe using OpenAI.
6. ValidationAgent validates updated recipe.
7. IngredientExtractorAgent extracts updated ingredients.
8. NutritionLookupAgent calls USDA API again.
9. NutritionCalculatorAgent recalculates nutrition.
10. Save updated recipe to Supabase.
11. ConversationAgent saves assistant response.
12. Return updated recipe and conversation ID to frontend.
```

---

## Backend Service Layer

Create service modules in:

```text
backend/services/
```

---

### openai_service.py

Responsible for all OpenAI API calls.

Responsibilities:

- Load OpenAI API key from environment variable.
- Send prompts to OpenAI.
- Request JSON responses.
- Parse JSON safely.
- Return Python dictionaries.
- Raise clear errors if JSON parsing fails.

---

### usda_service.py

Responsible for all USDA FoodData Central API calls.

Responsibilities:

- Load USDA API key from environment variable.
- Search foods by ingredient name.
- Get nutrient data.
- Normalize USDA responses.
- Hide raw USDA API complexity from the agents.

---

### supabase_service.py

Responsible for all Supabase database operations.

Responsibilities:

- Create user.
- Find user.
- Verify login.
- Save pantry.
- Load pantry.
- Save recipe.
- Update recipe.
- Delete recipe.
- Load recipes.
- Save conversation.
- Add conversation messages.

---

## Mock Mode

Support mock mode using environment variables:

```env
USE_MOCK_OPENAI=true
USE_MOCK_USDA=true
```

When mock mode is true:

- Do not call the real OpenAI API.
- Do not call the real USDA API.
- Return predictable fake data.

This is useful for testing the app before API keys are ready.

The full app flow must work in mock mode.

---

## Frontend Requirements

Use plain HTML, CSS, and JavaScript.

---

### register.html

Requirements:

- Username input.
- Password input.
- Register button.
- Call `/api/register`.
- Save returned `user_id` to `localStorage`.
- Redirect to `pantry.html`.

---

### login.html

Requirements:

- Username input.
- Password input.
- Login button.
- Call `/api/login`.
- Save returned `user_id` to `localStorage`.
- Redirect to `pantry.html`.

---

### pantry.html

Requirements:

- Show pantry rows.
- Each row has:
  - ingredient name input
  - amount input
  - unit dropdown
- Unit dropdown options:
  - `g`
  - `ml`
  - `unit`
- User can add a row.
- User can delete a row.
- User can save pantry.
- Pantry is saved through backend API.

---

### recipes.html

Requirements:

- Show recipe generation form.
- Show saved recipes list.

Recipe generation form should include:

- Preference dropdown:
  - high calorie
  - low calorie
  - high protein
  - low protein
  - vegetarian
  - cheap
  - quick meal
  - breakfast
  - lunch
  - dinner
- Option:
  - use only pantry ingredients
  - allow missing suggested ingredients
- Free text message box.
- Generate button.

Saved recipe cards should show:

- title
- servings
- calories
- protein
- carbs
- fat
- open button
- delete button

---

### recipe_detail.html

Requirements:

- Show full recipe.
- Show ingredients.
- Show instructions.
- Show total nutrition.
- Show missing ingredients if any.
- Include chatbot box for editing recipe.

Example chatbot messages:

```text
Make it lower calorie.
Make it vegetarian.
Make it higher protein.
Make it cheaper.
Make it for 2 servings.
```

After editing, the updated recipe should appear on the page.

---

## JavaScript Files

### api.js

Generic helper for API calls.

Should include functions like:

```javascript
async function apiGet(path) {}
async function apiPost(path, data) {}
async function apiPut(path, data) {}
async function apiDelete(path) {}
```

---

### auth.js

Handles:

- register
- login
- logout
- storing `user_id`
- checking if user is logged in

---

### pantry.js

Handles:

- loading pantry
- adding rows
- deleting rows
- saving pantry

---

### recipes.js

Handles:

- loading recipes
- generating recipes
- deleting recipes
- opening recipe detail page

---

### chat.js

Handles:

- sending recipe edit messages
- displaying updated recipe
- displaying conversation messages if needed

---

## OpenAI Prompt Rules

When using OpenAI for recipe generation or editing:

1. Request strict JSON only.
2. Do not allow markdown in the response.
3. Do not allow explanations outside the JSON.
4. Force ingredients to use only:
   - `g`
   - `ml`
   - `unit`
5. Do not allow cups, tablespoons, teaspoons, pinches, or vague units.
6. Make the recipe match the selected preference.
7. Respect `use_only_pantry`.

The generated recipe must have this structure:

```json
{
  "title": "Recipe title",
  "ingredients": [
    {
      "name": "ingredient name",
      "amount": 100,
      "unit": "g"
    }
  ],
  "instructions": [
    "Step 1",
    "Step 2"
  ],
  "servings": 1,
  "tags": ["high protein", "lunch"],
  "missing_ingredients": []
}
```

---

## USDA Nutrition Rules

Use USDA FoodData Central API for nutrition lookup.

Nutrition lookup should:

- Search for each ingredient by name.
- Pick the best generic match.
- Prefer non-branded results when possible.
- Extract calories, protein, carbs, and fat.
- Calculate totals for the actual recipe amount.
- Save the matched USDA food name.
- Add warnings when matching is uncertain.
- Never crash the full recipe generation because one ingredient failed.

Required output:

```json
{
  "total": {
    "calories": 850,
    "protein_g": 42,
    "carbs_g": 105,
    "fat_g": 25
  },
  "ingredients": [
    {
      "name": "rice",
      "matched_usda_food": "Rice, white, cooked",
      "amount": 200,
      "unit": "g",
      "calories": 260,
      "protein_g": 5,
      "carbs_g": 56,
      "fat_g": 1
    }
  ],
  "warnings": []
}
```

---

## Error Handling

Return simple JSON errors.

Example:

```json
{
  "error": "Invalid pantry item amount."
}
```

Handle at least:

- User not logged in.
- User does not exist.
- Empty pantry.
- Invalid pantry amount.
- Invalid pantry unit.
- OpenAI returns invalid JSON.
- USDA API has no result.
- Supabase request fails.
- Recipe does not exist.
- User tries to access another user's recipe.

---

## Implementation Status Note

Current repo status (as of latest implementation pass):
- Phases 1-10 are implemented in code (including recipe edit chatbot flow).
- Keep this AGENTS.md as the product/architecture contract for future iterations.
- For future work, continue from Phase 11 polish and beyond unless instructed otherwise.

## Build Order for Codex

Build the project in this order.

---

### Phase 1: Project Skeleton

Create:

- folder structure
- README
- AGENTS.md
- `.gitignore`
- backend requirements
- `.env.example`
- empty agent files
- empty service files

---

### Phase 2: Supabase Schema

Create:

```text
database/schema.sql
```

With tables:

- users
- pantries
- recipes
- conversations

---

### Phase 3: Backend Foundation

Implement:

- FastAPI app
- CORS
- environment loading
- Supabase service
- health endpoint

---

### Phase 4: Auth

Implement:

- register endpoint
- login endpoint
- simple password hashing
- frontend register page
- frontend login page
- localStorage user handling

---

### Phase 5: Pantry

Implement:

- pantry backend endpoints
- PantryAgent
- pantry frontend page
- add row
- delete row
- save pantry
- load pantry

---

### Phase 6: Recipe Storage With Dummy Data

Implement:

- save recipe
- list recipes
- get recipe
- delete recipe

Use dummy recipes first.

Do not connect OpenAI yet.

---

### Phase 7: Agent Pipeline With Mock Data

Implement full flow with mock agents:

```text
pantry
recipe generation
ingredient extraction
nutrition lookup
nutrition calculation
save recipe
save conversation
```

The full app should work without real OpenAI or USDA keys when mock mode is enabled.

---

### Phase 8: OpenAI Integration

Connect real OpenAI calls for:

- RecipeGeneratorAgent
- RecipeEditorAgent

Keep strict JSON response parsing.

---

### Phase 9: USDA Integration

Connect real USDA FoodData Central calls for:

- NutritionLookupAgent
- NutritionCalculatorAgent

---

### Phase 10: Recipe Editing Chatbot

Implement:

- recipe detail page
- chatbot input
- edit recipe endpoint
- conversation saving
- updated recipe display

---

### Phase 11: Polish

Improve:

- styling
- errors
- loading messages
- README
- demo instructions
- code comments

---

## README Requirements

The README must explain:

1. What the project does.
2. The tech stack.
3. How the project is local-first but host-ready.
4. How to create the Supabase tables.
5. How to configure `.env`.
6. How to install backend dependencies.
7. How to run the backend.
8. How to open the frontend.
9. How to use mock mode.
10. How to use real OpenAI and USDA APIs.
11. How the agents work.
12. Example demo flow.
13. Known limitations.

---

## Demo Flow

The app should support this university demo flow:

1. Open register page.
2. Create a user.
3. Go to pantry page.
4. Add ingredients:
   - egg, 3, unit
   - rice, 300, g
   - milk, 500, ml
5. Save pantry.
6. Go to recipes page.
7. Select high protein.
8. Select use only pantry ingredients.
9. Enter: `I want a filling lunch.`
10. Generate recipe.
11. Show recipe with nutrition.
12. Open saved recipe.
13. Ask chatbot: `Make it lower calorie.`
14. App updates recipe.
15. Nutrition is recalculated.
16. Conversation is saved.

---

## Acceptance Criteria

The project is complete when:

1. User can register.
2. User can login.
3. User can save pantry ingredients.
4. Pantry rows support name, amount, and unit.
5. User can generate recipe from pantry.
6. User can choose recipe preference.
7. User can choose whether to use only pantry ingredients.
8. Recipe is generated through OpenAI.
9. Recipe uses only grams, milliliters, and units.
10. Recipe is saved to Supabase.
11. Nutrition is calculated using USDA API.
12. User can view saved recipes.
13. User can delete recipes.
14. User can open recipe details.
15. User can edit recipe through chatbot.
16. Edited recipe is saved.
17. Nutrition is recalculated after editing.
18. Conversations are saved.
19. Agents are implemented as real backend modules/classes.
20. App runs locally.
21. Code is structured so it can later be hosted.

---

## Known MVP Limitations

Document these in the README:

- Login system is simplified for a university project.
- Nutrition matching may not always choose the perfect USDA item.
- Nutrition values are estimates.
- Unit conversion is intentionally limited.
- The frontend is plain HTML/CSS/JS.
- Supabase is used as the database, but advanced production security is not implemented yet.
- The app is local-first, but prepared for future hosting.