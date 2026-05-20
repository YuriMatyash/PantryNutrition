# Deployment

## Production URLs

- Frontend: https://pantrynutrition.netlify.app/
- Backend (Supabase Edge Functions base): https://mznztlufwzftisrsjnvh.supabase.co/functions/v1
- Supabase project ref: `mznztlufwzftisrsjnvh`

## Required Supabase Edge Function Secrets

Set these in the Supabase Dashboard (Project Settings → Edge Functions/Secrets):

- `APP_SUPABASE_URL`
- `APP_SUPABASE_SERVICE_ROLE_KEY`
- `APP_ENV=production`
- `USE_MOCK_OPENAI=false`
- `OPENAI_API_KEY`
- `OPENAI_MODEL=gpt-4o-mini`
- `USE_MOCK_USDA=false`
- `USDA_API_KEY`

> Never put these secrets in frontend code.

## Deployed API Endpoint Examples

Base URL:
`https://mznztlufwzftisrsjnvh.supabase.co/functions/v1`

- `GET /api/health`
- `POST /api/register`
- `POST /api/login`
- `GET /api/users/{user_id}/pantry`
- `PUT /api/users/{user_id}/pantry`
- `POST /api/users/{user_id}/recipes/generate`
- `GET /api/users/{user_id}/recipes`
- `GET /api/recipes/{recipe_id}?user_id={user_id}`
- `POST /api/recipes/{recipe_id}/edit`
- `DELETE /api/recipes/{recipe_id}?user_id={user_id}`

## Manual Deployment Steps

1. `npx supabase login`
2. `npx supabase link --project-ref mznztlufwzftisrsjnvh`
3. Set required secrets in Supabase Dashboard.
4. `npx supabase functions deploy api --project-ref mznztlufwzftisrsjnvh --no-verify-jwt`

### Netlify settings

- Base directory: `frontend`
- Build command: *(empty)* or `echo "No build step"`
- Publish directory: `.`

## CORS Note

Allowed frontend origins should include:

- `http://127.0.0.1:5500`
- `http://localhost:5500`
- `https://pantrynutrition.netlify.app`

CORS allows the browser frontend on one domain to call the backend API on another domain.

## Professor / Demo Checklist

1. Open https://pantrynutrition.netlify.app/
2. Register or login
3. Add pantry items
4. Save pantry
5. Generate recipe
6. Show nutrition summary
7. Open saved recipe
8. Edit recipe with chatbot
9. Show updated recipe and nutrition
10. Show Supabase tables if needed:
   - `users`
   - `pantries`
   - `recipes`
   - `conversations`

## Known Limitations / Security Notes

- Current auth is custom username/password for demo simplicity.
- Edge Function is deployed with `--no-verify-jwt` because the app does not use Supabase Auth JWTs yet.
- Production improvement path: Supabase Auth + Row Level Security + rate limiting.
- USDA matching is deterministic and may not always choose the perfect food match.
- Nutrition values are estimates, not medical/dietary advice.
- API keys are stored as Supabase secrets, not in frontend code.
