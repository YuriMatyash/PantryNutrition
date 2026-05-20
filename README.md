# Pantry Recipe Agent Web App

A local-first, host-ready university project web app where users can:
- register/login,
- save pantry ingredients,
- generate recipes with OpenAI,
- recalculate nutrition with USDA FoodData Central,
- save recipes,
- edit recipes with a chatbot-style input,
- save recipe conversations.

---

## 1) What this project does

This app demonstrates an **agent-based backend architecture** in FastAPI.
Business logic is split into focused agents for pantry cleaning, generation/editing, validation, ingredient extraction, nutrition lookup/calculation, and conversation handling.

The frontend is plain HTML/CSS/JS and talks only to the Python backend.
Supabase is used for persistence.

---

## 2) Tech stack

- Frontend: HTML, CSS, Vanilla JavaScript
- Backend: Python + FastAPI
- Database: Supabase (PostgreSQL)
- AI: OpenAI API
- Nutrition: USDA FoodData Central API

---

## 3) Project structure

```text
project-root/
  frontend/
    index.html
    login.html
    register.html
    pantry.html
    recipes.html
    recipe_detail.html
    css/styles.css
    js/
      config.js
      api.js
      auth.js
      pantry.js
      recipes.js
      recipe_detail.js
      chat.js

  backend/
    main.py
    requirements.txt
    .env.example
    agents/
    services/
    models/
    utils/

  database/
    schema.sql
```

---

## 4) Required API keys and environment variables

Create `backend/.env` from `backend/.env.example`.

Required variables:

```env
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-4o-mini
USDA_API_KEY=your-usda-api-key-here
SUPABASE_URL=your-supabase-url-here
SUPABASE_KEY=your-supabase-key-here
APP_ENV=local
USE_MOCK_OPENAI=false
USE_MOCK_USDA=true
```

> Never commit `backend/.env`.

---

## 5) Supabase setup

1. Create a Supabase project.
2. Open SQL editor in Supabase dashboard.
3. Run `database/schema.sql`.
4. Copy project URL and service key into `backend/.env`:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`

---

## 6) Run backend locally

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend base URL: `http://127.0.0.1:8000`
Health check: `GET /api/health`

---


## 6b) Windows PowerShell with Mamba

If you are developing on Windows, you can use Mamba/Conda style environments.

```powershell
mamba create -n pantry_nutrition python=3.11 -y
mamba activate pantry_nutrition
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

Run frontend from another PowerShell terminal:

```powershell
cd frontend
python -m http.server 5500
```

If you use a normal Python venv on Windows instead, activation is:

```powershell
.\.venv\Scripts\Activate.ps1
```

---

## 7) Run frontend locally

Use any static server. Example:

```bash
cd frontend
python -m http.server 5500
```

Open in browser:
- `http://127.0.0.1:5500/register.html`
- `http://127.0.0.1:5500/login.html`

---

## 8) Mock mode vs real mode

### Full mock mode (fast demo/dev)
```env
USE_MOCK_OPENAI=true
USE_MOCK_USDA=true
```

### Real OpenAI + Mock USDA (recommended before USDA testing)
```env
USE_MOCK_OPENAI=false
USE_MOCK_USDA=true
```

### Real OpenAI + Real USDA
```env
USE_MOCK_OPENAI=false
USE_MOCK_USDA=false
```

---

## 9) Agent pipeline

### Recipe generation flow
1. Load pantry from Supabase
2. Clean pantry with `PantryAgent`
3. Create conversation + save user message
4. Generate recipe (`RecipeGeneratorAgent`)
5. Validate recipe (`ValidationAgent`)
6. Extract ingredients (`IngredientExtractorAgent`)
7. Lookup nutrition (`NutritionLookupAgent`)
8. Calculate totals (`NutritionCalculatorAgent`)
9. Save recipe to Supabase
10. Save assistant conversation message
11. Return `{ recipe, conversation_id }`

### Recipe editing flow
1. Load recipe and verify owner
2. Load/create recipe conversation
3. Save user edit message
4. Edit recipe (`RecipeEditorAgent`)
5. Validate updated recipe
6. Extract ingredients
7. Lookup nutrition again
8. Recalculate totals
9. Update recipe in Supabase
10. Save assistant message
11. Return updated recipe + conversation_id

---

## 10) Conversations

Conversations are stored in the `conversations` table as JSON messages.
Each message contains role/content/timestamp.
Conversations can be linked to a recipe via `recipe_id`.


## Experimental Supabase Edge Function Backend

An experimental Supabase Edge Function backend is now being developed in parallel under `supabase/functions/api/`.

- This is **Phase 3** of the migration and currently includes health, auth, and pantry routes for local testing.
- The existing FastAPI backend in `backend/` remains the current working backend for app features.
- Recipes, OpenAI, USDA, and chatbot edit flows are not migrated yet.
- For local Edge Function env files, use app-prefixed names for Supabase secrets: `APP_SUPABASE_URL` and `APP_SUPABASE_SERVICE_ROLE_KEY` (avoid `SUPABASE_` prefix in `--env-file`).

Run the Edge Function locally:

> Local routing note: inside the function this resolves to `/api/health`, which should be treated as the canonical health route.


```bash
npx supabase functions serve api --env-file supabase/functions/.env.local --no-verify-jwt
```

Then test:

- `http://127.0.0.1:54321/functions/v1/api/health` (canonical health URL)

Auth test payloads (Phase 2):

```env
# supabase/functions/.env.local
APP_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
APP_SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
APP_ENV=local
USE_MOCK_OPENAI=true
USE_MOCK_USDA=true
```

PowerShell register test:

```powershell
Invoke-RestMethod `
  -Uri "http://127.0.0.1:54321/functions/v1/api/register" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"username":"yuri","password":"1234"}'
```

PowerShell login test:

```powershell
Invoke-RestMethod `
  -Uri "http://127.0.0.1:54321/functions/v1/api/login" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"username":"yuri","password":"1234"}'
```

PowerShell pantry GET test:

```powershell
Invoke-RestMethod `
  -Uri "http://127.0.0.1:54321/functions/v1/api/users/YOUR_USER_ID/pantry" `
  -Method Get
```

PowerShell pantry PUT test:

```powershell
Invoke-RestMethod `
  -Uri "http://127.0.0.1:54321/functions/v1/api/users/YOUR_USER_ID/pantry" `
  -Method Put `
  -ContentType "application/json" `
  -Body '{"items":[{"name":"egg","amount":3,"unit":"unit"},{"name":"rice","amount":300,"unit":"g"}]}'
```

PowerShell pantry GET after save:

```powershell
Invoke-RestMethod `
  -Uri "http://127.0.0.1:54321/functions/v1/api/users/YOUR_USER_ID/pantry" `
  -Method Get
```

---

## 11) Known limitations

- Auth is simplified for MVP (no JWT/session hardening).
- USDA matching can be imperfect (best-effort search).
- Nutrition values are estimates.
- Unit system is intentionally restricted to `g`, `ml`, `unit`.
- Frontend is intentionally simple static HTML/CSS/JS.
- Production security hardening is not yet implemented.

---

## 12) University demo flow (recommended)

1. Register user
2. Login
3. Add pantry items:
   - egg, 3, unit
   - rice, 300, g
   - milk, 500, ml
4. Save pantry
5. Generate recipe (e.g., high protein lunch)
6. Show saved recipe list + detail page
7. Edit recipe message (e.g., "Make it lower calorie")
8. Show updated nutrition
9. Show conversation saved in Supabase

---

## 13) What to commit vs never commit

Commit:
- source code
- `database/schema.sql`
- `backend/.env.example`
- docs (`README.md`, `AGENTS.md`)

Never commit:
- `backend/.env`
- real API keys/tokens/secrets
- local virtualenv folders
