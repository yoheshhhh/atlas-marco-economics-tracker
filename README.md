# Atlas Macro Economics Tracker

Atlas is an explainable macro-intelligence platform that turns global events into actionable decision support. It combines live signal monitoring, deterministic scenario simulation, source-backed narrative generation, and context memory in one workflow.

## Live Demo
- Deployment: https://atlas-marco-economics-tracker.vercel.app/
- Video Pitch (max 5 mins): https://youtu.be/jxmZfiHDLHk

## ABOUT (Hackathon Requirement)
- **Project Title:** Atlas Macro Economics Tracker
- **Team Name:** MNB
- **Project Description:**  
  Atlas addresses analysis latency in macro-financial decision-making. Teams often receive fragmented news, delayed market interpretation, and non-repeatable reasoning when reacting to global events. Atlas solves this by unifying real-time macro developments, structured evidence trails, deterministic scenario stress testing, and memory continuity in a single platform. The World Pulse module surfaces high-signal developments with transparent data proof. News Navigator explains local and global impact from either selected headlines or user prompts. Scenario Lab simulates shocks through deterministic transmission pathways to support risk planning. Memory Vault stores prior analyses so users can continue from context instead of restarting. The result is faster, traceable, and more consistent macro intelligence for fintech, strategy, and investment workflows.

## Core Modules
- **World Pulse:** live macro developments with source and methodology proof.
- **News Navigator:** prompt-driven or headline-driven impact narratives.
- **Scenario Lab:** deterministic shock simulation with streaming logs.
- **Risk Radar:** near-real-time risk snapshots across macro themes.
- **Evidence Explorer:** article-level source trail powering briefings and themes.
- **Memory Vault:** historical continuity for previous macro analyses.
- **Auth Layer:** Supabase-backed signup/login and session-aware access control.

## Tech Stack
- **Frontend:** React, Vite, TailwindCSS, React Router, TanStack Query, Framer Motion, Recharts, Radix UI
- **Backend:** FastAPI, Pydantic, NetworkX, NumPy, pandas, scikit-learn
- **Data/Infra:** Supabase, Docker, MediaStack, Twelve Data, AlphaVantage, FRED, Yahoo Finance, Stooq

## Quick Start (Local)

### 1) Frontend
```bash
npm install
npm run dev
```
Frontend runs at `http://127.0.0.1:5173`.

### 2) Backend
```bash
cd backend
python -m venv .venv
# Windows PowerShell
.venv\Scripts\activate
pip install -r requirements-dev.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
Backend runs at `http://127.0.0.1:8000`.

### 3) Required Environment Variables (`backend/.env`)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AUTH_REQUIRED` (`true` for full auth flow, `false` for local no-auth mode)
- `OPENAI_API_KEY` (optional; richer narrative generation)

## Key API Endpoints
- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/login`
- `GET /api/v1/world-pulse/live`
- `POST /api/v1/scenario/run`
- `POST /api/v1/scenario/run/stream`
- `POST /api/v1/briefing/news-navigator`
- `GET /api/v1/memory/history`

## Why Atlas Is Convincing
- **Speed:** reduces time from signal detection to decision narrative.
- **Trust:** source-linked evidence and deterministic methodology.
- **Reusability:** persistent memory across sessions and themes.
- **Practicality:** built for real workflow usage, not one-off demos.









