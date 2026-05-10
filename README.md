# Pantry Recipe Agent Web App

A local-first, host-ready university project web app that helps users save pantry ingredients, generate recipes with AI, edit recipes through a chatbot, and calculate nutrition using USDA FoodData Central.

## Tech Stack

- Frontend: HTML, CSS, vanilla JavaScript
- Backend: Python + FastAPI
- Database: Supabase
- AI API: OpenAI API
- Nutrition API: USDA FoodData Central API

## Local-First, Host-Ready

This project runs locally today and is structured so it can later be deployed with minimal changes:

- Frontend can be hosted as static files.
- Backend can be hosted on a Python-compatible platform.
- Supabase remains the shared database.
- Environment variables can be moved from local `.env` to hosting platform settings.

## Current Implementation Status (Phases 1-3)

Implemented:

1. Project skeleton and folder structure
2. Supabase SQL schema file
3. FastAPI backend foundation with:
   - CORS setup
   - `.env` loading via `python-dotenv`
   - Supabase client initialization service
   - Health endpoint: `GET /api/health`

Not yet implemented:

- Auth endpoints
- Pantry endpoints
- Recipe generation and editing pipeline
- OpenAI and USDA integrations
- Full frontend behavior

## Setup

### 1. Create Supabase Tables

Run SQL from `database/schema.sql` in your Supabase SQL editor.

### 2. Configure Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill your values.

### 3. Install Backend Dependencies

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 4. Run Backend

```bash
cd backend
uvicorn main:app --reload
```

Backend base URL: `http://127.0.0.1:8000`
Health check: `http://127.0.0.1:8000/api/health`

## Planned Agent Pipeline

Agents are organized in `backend/agents/` and will handle pantry cleaning, recipe generation/editing, ingredient extraction, nutrition lookup/calculation, validation, and conversation persistence.

## Known MVP Limitations (to be documented in detail later)

- Simplified login approach for project demo
- Nutrition matching is approximate
- Nutrition values are estimates
- Limited unit conversion support
- Plain HTML/CSS/JS frontend
- Local-first architecture with future hosting readiness
