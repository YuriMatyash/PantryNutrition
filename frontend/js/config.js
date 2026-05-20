// Backend base URL used by frontend API helper.
//
// FastAPI local URL (legacy/local fallback):
//   http://127.0.0.1:8000
//
// Supabase Edge Function local URL (current local target):
//   http://127.0.0.1:54321/functions/v1
//   (frontend paths already include /api/..., so base should end at /functions/v1)
//
// Future deployed Edge Function URL placeholder:
//   https://YOUR_PROJECT_REF.supabase.co/functions/v1
const API_BASE_URL = "https://mznztlufwzftisrsjnvh.supabase.co/functions/v1";
