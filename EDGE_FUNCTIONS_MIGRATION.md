# EDGE_FUNCTIONS_MIGRATION.md

## Purpose

This document describes the planned migration of the PantryAI backend from a local Python FastAPI server to Supabase Edge Functions.

The goal is to host the app so real users can access it online with this target architecture:

```text
Netlify frontend
    ↓
Supabase Edge Functions backend
    ↓
Supabase database
    ↓
OpenAI API + USDA FoodData Central API
```

The current FastAPI backend is working and should remain untouched until the Edge Functions version is fully tested.

---

## Current Architecture

The current local-first architecture is:

```text
frontend/
  Plain HTML/CSS/JavaScript
  Runs locally using python -m http.server 5500

backend/
  Python FastAPI backend
  Runs locally using uvicorn

database/
  Supabase PostgreSQL database
  Tables:
    users
    pantries
    recipes
    conversations
```

Current runtime flow:

```text
Browser frontend
    ↓
FastAPI backend
    ↓
Supabase database
    ↓
OpenAI API
    ↓
USDA FoodData Central API
```

The backend currently handles:

- user register/login
- password hashing
- pantry save/load
- recipe generation
- recipe listing/detail/delete
- OpenAI recipe generation
- USDA nutrition lookup
- USDA food matching
- nutrition calculation
- recipe editing chatbot
- conversation saving

---

## Target Architecture

The final hosted architecture should be:

```text
Netlify
  hosts frontend static files

Supabase Edge Functions
  host the backend API

Supabase PostgreSQL
  stores users, pantries, recipes, and conversations

OpenAI API
  generates and edits recipes

USDA FoodData Central API
  provides nutrition data
```

Final production flow:

```text
User browser
    ↓
Netlify frontend
    ↓
Supabase Edge Function API
    ↓
Supabase database / OpenAI / USDA
```

The frontend should eventually use:

```javascript
const API_BASE_URL = "https://YOUR_PROJECT_REF.supabase.co/functions/v1/api";
```

and continue calling paths such as:

```text
/api/register
/api/login
/api/users/{user_id}/pantry
/api/users/{user_id}/recipes/generate
```

Therefore, the Edge Function router should preserve the current FastAPI route paths as much as possible.

---

## Important Migration Rules

1. Do not delete the existing `backend/` FastAPI implementation until the Edge Function backend is complete and tested.
2. Build the Edge Function backend in parallel.
3. Migrate one feature area at a time.
4. Preserve the existing frontend API behavior as much as possible.
5. Preserve current database schema unless there is a strong reason to change it.
6. Never commit secrets.
7. Never put OpenAI, USDA, or Supabase service keys in frontend JavaScript.
8. Keep secrets only in:
   - local Edge Function env files for local testing
   - Supabase Function Secrets for deployment
9. Keep the FastAPI backend available as a fallback until the final switch.
10. Every phase must be tested before moving to the next phase.

---

## Technology Notes

Supabase Edge Functions run server-side TypeScript on the Deno runtime.

That means the backend migration is not a direct copy/paste from Python. The Python FastAPI backend logic must be rewritten into TypeScript modules.

Use TypeScript/Deno-compatible tools:

- native `fetch` for OpenAI and USDA HTTP calls
- Supabase JS client for database access
- Web Crypto API for password hashing if keeping custom auth
- Deno environment variables via `Deno.env.get(...)`

---

## Secrets Handling

### Local Edge Function Secrets

For local testing, create:

```text
supabase/functions/.env.local
```

Example:

```env
OPENAI_API_KEY=your-openai-key
OPENAI_MODEL=gpt-4o-mini
USDA_API_KEY=your-usda-key
USE_MOCK_OPENAI=true
USE_MOCK_USDA=true
APP_ENV=local

APP_SUPABASE_URL=https://your-project-ref.supabase.co
APP_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Do not commit this file.

`.gitignore` must include:

```gitignore
supabase/functions/.env
supabase/functions/.env.local
```

### Hosted Edge Function Secrets

For deployed Supabase Edge Functions, set secrets in Supabase using the dashboard or CLI.

Required secrets:

```env
OPENAI_API_KEY
OPENAI_MODEL
USDA_API_KEY
USE_MOCK_OPENAI
USE_MOCK_USDA
APP_ENV
APP_SUPABASE_URL
APP_SUPABASE_SERVICE_ROLE_KEY
```

The service role key is allowed only inside trusted server-side code such as Edge Functions. It must never be used in browser/frontend code.

Note about Supabase env vars:
- In local `--env-file` usage, avoid names starting with `SUPABASE_` because Supabase CLI skips them.
- Use app-specific names like `APP_SUPABASE_URL` and `APP_SUPABASE_SERVICE_ROLE_KEY` in local env files.
- In deployed Edge Functions, Supabase provides default Supabase environment variables; custom app-prefixed names are still fine.

---

## Proposed Folder Structure

Create the Edge Function backend in parallel:

```text
supabase/
  functions/
    api/
      index.ts
      deno.json

      routes/
        health.ts
        auth.ts
        pantry.ts
        recipes.ts
        debug.ts

      services/
        supabaseService.ts
        openaiService.ts
        usdaService.ts

      agents/
        pantryAgent.ts
        recipeGeneratorAgent.ts
        recipeEditorAgent.ts
        ingredientExtractorAgent.ts
        validationAgent.ts
        recipeSanityAgent.ts
        usdaFoodMatchAgent.ts
        nutritionLookupAgent.ts
        nutritionCalculatorAgent.ts
        conversationAgent.ts

      utils/
        cors.ts
        response.ts
        routing.ts
        crypto.ts
        time.ts
        units.ts
```

The structure intentionally mirrors the existing Python backend so the migration is easier to review and debug.

---

## API Compatibility Goal

The Edge Function API should match the existing FastAPI route behavior.

Current frontend expects paths like:

```text
/api/health
/api/register
/api/login
/api/users/{user_id}/pantry
/api/users/{user_id}/recipes
/api/users/{user_id}/recipes/generate
/api/recipes/{recipe_id}?user_id={user_id}
/api/recipes/{recipe_id}/edit
/api/conversations/{conversation_id}?user_id={user_id}
```

If the Edge Function is deployed as:

```text
https://YOUR_PROJECT_REF.supabase.co/functions/v1/api
```

then the full URL should be:

```text
https://YOUR_PROJECT_REF.supabase.co/functions/v1/api/api/register
```

unless the frontend paths are adjusted.

Recommended approach:

- Keep the frontend helper as-is during migration.
- Make the Edge Function router accept the same `/api/...` paths.
- Later, if desired, simplify the frontend route paths.

---

## Migration Phases

### Phase 0 — Supabase CLI Setup

Goal: prepare local tooling.

Manual steps:

```powershell
cd C:\Users\YuriM\Desktop\Projects\PantryNutrition
npx supabase init
```

If `supabase` is not installed globally, use `npx supabase`.

Create or verify:

```text
supabase/config.toml
```

Do not modify backend logic in this phase.

---

### Phase 1 — Edge Function Skeleton

Goal: create the new Edge Function backend skeleton.

Implement:

```text
supabase/functions/api/index.ts
supabase/functions/api/deno.json
supabase/functions/api/utils/cors.ts
supabase/functions/api/utils/response.ts
```

Add only:

```text
GET /api/health
```

Expected response:

```json
{
  "status": "ok",
  "runtime": "supabase-edge-function"
}
```

Test locally:

```powershell
npx supabase functions serve api --env-file supabase/functions/.env.local --no-verify-jwt
```

Test endpoint:

```powershell
Invoke-RestMethod "http://127.0.0.1:54321/functions/v1/api/health"
```

Success criteria:

- Edge Function starts locally.
- CORS preflight works.
- `/api/health` returns JSON (canonical route).
- FastAPI backend is untouched.

Important local routing note:
- External URL `http://127.0.0.1:54321/functions/v1/api/health` is seen inside the function as pathname `/api/health`.
- Treat `/api/health` as the canonical health route in the Edge Function router.


---

### Phase 2 — Auth Migration

Goal: migrate register/login.

Routes:

```text
POST /api/register
POST /api/login
```

Use existing `users` table:

```text
id
username
password_hash
created_at
```

Response shape must match FastAPI:

```json
{
  "user_id": "uuid",
  "username": "username"
}
```

Error behavior:

```text
duplicate username → 409
invalid login → 401
missing fields → 400
configuration/server error → safe 500
```

Notes:

- Keep current custom auth for migration compatibility.
- Use Web Crypto or Deno-compatible crypto.
- Do not expose password hashes.
- Do not migrate to Supabase Auth in this phase.

Success criteria:

- New user can register through Edge Function.
- Existing user can login through Edge Function.
- Users table remains compatible with FastAPI version.
- No secrets are exposed.

---

### Phase 3 — Pantry Migration

Goal: migrate pantry save/load.

Routes:

```text
GET /api/users/{user_id}/pantry
PUT /api/users/{user_id}/pantry
```

Port logic from:

```text
backend/agents/pantry_agent.py
backend/services/supabase_service.py
```

Rules:

- remove empty rows
- normalize ingredient names
- amount must be numeric and greater than zero
- allowed units:
  - g
  - ml
  - unit
- verify user exists
- upsert pantry by user_id

Success criteria:

- Frontend pantry page can save/load pantry using Edge Function.
- Supabase `pantries` table updates correctly.
- FastAPI backend still works independently.

---

### Phase 4 — Recipe Storage Migration

Goal: migrate saved recipe CRUD.

Routes:

```text
GET /api/users/{user_id}/recipes
GET /api/recipes/{recipe_id}?user_id={user_id}
DELETE /api/recipes/{recipe_id}?user_id={user_id}
```

Rules:

- verify recipe belongs to user
- never return another user's recipe
- return full recipe details for recipe detail page
- delete only if user_id and recipe_id match

Success criteria:

- Saved recipe list works.
- View Recipe works.
- Delete Recipe works.
- Ownership checks still work.

---

### Phase 5 — Mock Generation Pipeline

Goal: migrate the recipe generation pipeline in mock mode first.

Route:

```text
POST /api/users/{user_id}/recipes/generate
```

Use:

```env
USE_MOCK_OPENAI=true
USE_MOCK_USDA=true
```

Implement TypeScript versions of:

```text
PantryAgent
RecipeGeneratorAgent
IngredientExtractorAgent
ValidationAgent
RecipeSanityAgent
NutritionLookupAgent
NutritionCalculatorAgent
ConversationAgent
```

Expected flow:

```text
load pantry
clean pantry
create conversation
save user message
generate mock recipe
validate recipe
sanity-check recipe
extract ingredients
mock nutrition lookup
calculate total + per-serving nutrition
save recipe
link conversation
save assistant message
return recipe + conversation_id
```

Success criteria:

- Generate works without real OpenAI or USDA.
- Recipe is saved to Supabase.
- Conversation is saved.
- Frontend Generate page works against Edge Function.

---

### Phase 6 — Real OpenAI Generation

Goal: migrate OpenAI recipe generation and recipe editing calls.

Use native `fetch` to call OpenAI API.

Required behavior:

- load `OPENAI_API_KEY` from secrets
- load `OPENAI_MODEL`, default `gpt-4o-mini`
- request strict JSON output
- parse JSON safely
- never expose API key
- keep mock mode

Generation prompt must enforce:

- exact requested servings
- total recipe quantities for N servings
- realistic per-serving quantities
- pantry limits when `use_only_pantry=true`
- allowed units only:
  - g
  - ml
  - unit
- no vague units:
  - cups
  - tbsp
  - tsp
  - pinch
  - handful
  - to taste

Success criteria:

- Real OpenAI generation works.
- Mock generation still works.
- Bad JSON produces a clear safe error.
- Recipe quantities remain realistic.

---

### Phase 7 — Real USDA Nutrition

Goal: migrate USDA lookup, matching, and nutrition calculation.

Use official FoodData Central endpoint:

```text
https://api.nal.usda.gov/fdc/v1/foods/search
```

Use POST-first behavior if that works better in this environment, with GET fallback if needed.

Implement TypeScript versions of:

```text
USDAService
USDAFoodMatchAgent
NutritionLookupAgent
NutritionCalculatorAgent
```

Rules:

- never expose USDA_API_KEY
- handle non-JSON/HTML responses safely
- do not include full request URL with api_key in errors
- prefer generic foods over branded
- handle kcal vs kJ correctly
- convert kJ to kcal with:
  - kcal = kJ / 4.184
- never use mock nutrition fallback in real USDA mode
- unmatched foods contribute 0 nutrition with warning
- calculate:
  - total nutrition
  - per-serving nutrition

Success criteria:

- USDA debug endpoint works.
- Real USDA matches appear in recipe detail.
- Nutrition values are realistic.
- Warnings appear for low-confidence or fallback matches.

---

### Phase 8 — Recipe Editing Chatbot

Goal: migrate recipe editing.

Route:

```text
POST /api/recipes/{recipe_id}/edit
```

Request:

```json
{
  "user_id": "uuid",
  "message": "Make it lower calorie."
}
```

Flow:

```text
load recipe
verify ownership
get or create recipe conversation
save user message
edit recipe with RecipeEditorAgent
validate recipe
sanity-check quantities
extract ingredients
USDA lookup
nutrition calculation
update recipe
save assistant message
return updated recipe + conversation_id
```

Success criteria:

- Edit works through recipe detail page.
- Nutrition recalculates.
- Conversation messages are saved.
- Servings and pantry limits remain sensible.

---

### Phase 9 — Frontend Switch

Goal: switch Netlify frontend to the Edge Function backend.

Update:

```text
frontend/js/config.js
```

From local FastAPI:

```javascript
const API_BASE_URL = "http://127.0.0.1:8000";
```

To local Edge Function during testing:

```javascript
const API_BASE_URL = "http://127.0.0.1:54321/functions/v1/api";
```

To deployed Supabase Edge Function:

```javascript
const API_BASE_URL = "https://YOUR_PROJECT_REF.supabase.co/functions/v1/api";
```

Full test flow:

```text
register
login
save pantry
generate recipe
view recipe
edit recipe
list saved recipes
delete recipe
logout
```

Success criteria:

- Frontend works without FastAPI.
- FastAPI server can be stopped and the app still works.
- Supabase Edge Function handles all backend requests.

---

### Phase 10 — Deployment

Goal: deploy Edge Functions and frontend.

Manual deploy steps:

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy api
```

Set Supabase Function Secrets before real use:

```powershell
npx supabase secrets set OPENAI_API_KEY=...
npx supabase secrets set OPENAI_MODEL=gpt-4o-mini
npx supabase secrets set USDA_API_KEY=...
npx supabase secrets set USE_MOCK_OPENAI=false
npx supabase secrets set USE_MOCK_USDA=false
npx supabase secrets set APP_ENV=production
```

Set frontend Netlify deployment to use:

```javascript
const API_BASE_URL = "https://YOUR_PROJECT_REF.supabase.co/functions/v1/api";
```

Success criteria:

- Netlify frontend loads.
- Netlify frontend calls Supabase Edge Functions.
- Edge Functions call Supabase database, OpenAI, and USDA.
- Users can use the app without any local backend.

---

## Route Map

The Edge Function should support these routes.

### Health

```text
GET /api/health
```

### Auth

```text
POST /api/register
POST /api/login
```

### Pantry

```text
GET /api/users/{user_id}/pantry
PUT /api/users/{user_id}/pantry
```

### Recipes

```text
GET /api/users/{user_id}/recipes
GET /api/recipes/{recipe_id}?user_id={user_id}
DELETE /api/recipes/{recipe_id}?user_id={user_id}
POST /api/users/{user_id}/recipes/generate
POST /api/recipes/{recipe_id}/edit
```

### Conversations

```text
GET /api/conversations/{conversation_id}?user_id={user_id}
GET /api/users/{user_id}/conversations
```

### Debug

Debug routes are local-only.

```text
GET /api/debug/usda-search?query=pasta
```

Only enable debug routes when:

```env
APP_ENV=local
```

Do not expose debug routes in production.

---

## Database Compatibility

Use the existing Supabase schema:

```text
users
pantries
recipes
conversations
```

No schema change should be required for the migration.

Existing JSONB fields are enough for:

```text
pantry items
recipe ingredients
recipe instructions
recipe nutrition
conversation messages
warnings
USDA matches
```

---

## Frontend Compatibility

During migration, do not rewrite the frontend unless needed.

The current frontend expects:

```text
API_BASE_URL + "/api/..."
```

Therefore, the Edge Function router should support `/api/...` paths.

Only after all backend routes work should `frontend/js/config.js` be changed.

---

## CORS Requirements

Local frontend origins:

```text
http://127.0.0.1:5500
http://localhost:5500
```

Production frontend origin:

```text
https://YOUR_NETLIFY_SITE.netlify.app
```

CORS should allow:

```text
GET
POST
PUT
DELETE
OPTIONS
```

Headers should include:

```text
Content-Type
Authorization
apikey
```

OPTIONS requests must return immediately with CORS headers.

---

## Testing Strategy

Each phase must have:

1. direct API tests using PowerShell or curl
2. frontend test if relevant
3. Supabase table verification
4. no secret leakage check
5. no regression in FastAPI backend

Recommended PowerShell testing style:

```powershell
Invoke-RestMethod `
  -Uri "http://127.0.0.1:54321/functions/v1/api/health" `
  -Method Get
```

---

## Codex Working Rules

When asking Codex to work on this migration:

1. Always tell Codex to read `AGENTS.md` and `EDGE_FUNCTIONS_MIGRATION.md`.
2. Give Codex only one phase at a time.
3. Do not ask Codex to migrate everything at once.
4. Do not let Codex delete `backend/`.
5. Do not let Codex modify `backend/.env`.
6. Do not let Codex commit secrets.
7. Ask Codex to summarize changed files after every phase.
8. Test before continuing to the next phase.

---

## Definition of Done

The migration is complete when:

1. Supabase Edge Function handles all backend routes.
2. Netlify frontend calls the Edge Function backend.
3. FastAPI backend is no longer needed for normal app usage.
4. Register/login works.
5. Pantry save/load works.
6. Recipe generation works.
7. OpenAI real mode works.
8. USDA real mode works.
9. Recipe detail works.
10. Recipe editing chatbot works.
11. Conversations are saved.
12. Secrets are stored only in Supabase Function Secrets.
13. No API keys are committed.
14. No API keys are visible in frontend code or browser responses.
15. All README instructions are updated.
16. FastAPI backend is archived or clearly marked as legacy/local-only.


## Phase 2 local auth testing example

Use `supabase/functions/.env.local` with app-prefixed Supabase names:

```env
APP_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
APP_SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
APP_ENV=local
USE_MOCK_OPENAI=true
USE_MOCK_USDA=true
```

Run locally:

```powershell
npx supabase functions serve api --env-file supabase/functions/.env.local --no-verify-jwt
```

Test register:

```powershell
Invoke-RestMethod `
  -Uri "http://127.0.0.1:54321/functions/v1/api/register" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"username":"yuri","password":"1234"}'
```

Test login:

```powershell
Invoke-RestMethod `
  -Uri "http://127.0.0.1:54321/functions/v1/api/login" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"username":"yuri","password":"1234"}'
```
