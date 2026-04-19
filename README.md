# VulaCareerAI — Career Guidance Platform

"Vula" (isiZulu: *to open*) — opening pathways for young South Africans navigating the tech job market.

![Python](https://img.shields.io/badge/Python-3776AB?logo=python&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)
![Kubernetes](https://img.shields.io/badge/Kubernetes-326CE5?logo=kubernetes&logoColor=white)
![Status](https://img.shields.io/badge/Status-Live-brightgreen)

> This project started as a prototype with rule-based keyword matching. It has since been rebuilt as a production RAG pipeline with vector search, streaming AI responses, and an LLM-as-judge eval layer.

---

## Live Demo

- **Frontend:** https://vulacareerai-frontend-19lxrg517-lindokuhlekubekas-projects.vercel.app
- **Backend API:** https://vulacareerai-prototype-production.up.railway.app/health

---

## The Problem

Young South African developers — especially those from non-traditional backgrounds — often lack access to career guidance that reflects the local tech ecosystem. Generic career tools don't account for the SA job market, local companies, or African-language speakers.

## What It Does

- Accepts a CV as input and semantically matches it against a database of real SA job listings
- Uses vector embeddings (Voyage AI) + pgvector cosine similarity for accurate job matching
- Generates personalised career analysis: match assessment, skill gaps, next steps, salary expectation
- Tailors CV sections for a specific job on demand
- Scores every AI response with an LLM-as-judge eval layer (relevance, tone, gap coverage)
- Designed with future African-language support in mind (Zulu, Xhosa, Sotho)

---

## Architecture
User CV → React Frontend (Vercel)
↓ POST /api/analyse
Express API (Railway)
↓
Voyage AI embedQuery()
↓
pgvector cosine search → Top 5 SA jobs
↓
Prompt builder → AI API → SSE streaming response
↓ async
LLM-as-judge eval → eval_logs (Postgres)
---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite → Vercel |
| Backend | Node.js + Express → Railway |
| Database | PostgreSQL + pgvector |
| Embeddings | Voyage AI (voyage-3-lite) |
| AI | Gemini / Claude API (swappable) |
| CI/CD | GitHub Actions + Railway + Vercel auto-deploy |
| Eval | LLM-as-judge scoring → eval_logs table |

---

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| POST | /api/analyse | Analyse CV against SA job DB (SSE stream) |
| POST | /api/tailor | Rewrite CV for a specific job (SSE stream) |
| GET | /api/metrics | Eval scores, token costs, latency stats |

```bash
curl -X POST https://vulacareerai-prototype-production.up.railway.app/api/analyse \
  -H "Content-Type: application/json" \
  -d '{"cv": "WeThinkCode graduate. Python, Docker, Kubernetes KCNA certified."}' \
  --no-buffer
```

---

## Project Structure
VulaCareerAI-Prototype/
├── server.js                  # Express entry point
├── Dockerfile                 # Railway deployment
├── railway.toml               # Railway config
├── data/
│   └── jobs-seed.json         # 15 real SA job listings
└── src/
├── lib/
│   ├── schema.sql          # Postgres schema (jobs + eval_logs)
│   ├── rag.js              # embedQuery, vectorSearch, buildPrompt
│   └── eval.js             # LLM-as-judge + saveEval
├── routes/
│   └── career.js           # API route handlers
└── scripts/
└── ingest-jobs.js      # Job embedding + ingestion CLI
---

## Local Setup

```bash
git clone https://github.com/LindokuhleKubeka/VulaCareerAI-Prototype.git
cd VulaCareerAI-Prototype
npm install
cp .env.example .env
# Fill in ANTHROPIC_API_KEY or GEMINI_API_KEY, VOYAGE_API_KEY, DATABASE_URL
npm run db:setup
npm run ingest
npm run dev
```

---

## Roadmap

- [x] Rule-based career matching prototype (Python/Streamlit)
- [x] Production RAG pipeline with pgvector semantic search
- [x] Streaming AI responses via SSE
- [x] LLM-as-judge eval layer with Postgres logging
- [x] React frontend deployed on Vercel
- [x] CI/CD via GitHub Actions
- [ ] Real-time SA job scraping (Careers24, LinkedIn)
- [ ] isiZulu and isiXhosa language support via Lelapa AI Vulavula
- [ ] /api/metrics dashboard in frontend
- [ ] Fine-tuned model on South African language data

---

## Motivation

Built as part of my broader interest in African-language AI and the South African tech ecosystem. The name references [Lelapa AI's Vulavula](https://lelapa.ai/) — an African NLP platform I'd like to integrate in a future version.

The African tech market gap — where global solutions don't address local needs — is the core entrepreneurial lens behind this project.

---

## Frontend Repo

https://github.com/LindokuhleKubeka/vulacareerai-frontend

---

*Built by Lindokuhle Kubeka — WeThinkCode_ graduate, KCNA certified, AI & Backend Engineer*
*GitHub: https://github.com/LindokuhleKubeka*
*LinkedIn: https://linkedin.com/in/lindokuhle-kubeka-355922220*
