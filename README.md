
# VulaCareer AI — Career Guidance Prototype

A prototype AI-powered career guidance tool built for the South African context. "Vula" (isiZulu: *to open*) — the concept is to open pathways for young South Africans navigating the tech job market by providing career direction based on their skills and interests.

![Python](https://img.shields.io/badge/Python-3776AB?logo=python&logoColor=white)
![AI](https://img.shields.io/badge/AI%2FML-Prototype-orange)
![Status](https://img.shields.io/badge/Status-Prototype-yellow)

> ⚠️ This is an early-stage prototype. The core logic is functional; production features are on the roadmap below.

---

## The Problem

Young South African developers — especially those from non-traditional backgrounds — often lack access to career guidance that reflects the local tech ecosystem. Generic career tools don't account for the South African job market, local companies, or African-language speakers.

## What It Does

- Takes a user's current skills, interests, and experience level as input
- Maps input against a knowledge base of South African tech career pathways
- Suggests relevant roles, learning resources, and local companies to target
- Designed with future African-language support in mind (Zulu, Xhosa, Sotho)

## How It Works

```
User Input (skills + interests)
          │
          ▼
  ┌───────────────┐
  │ Input Parser  │  ← Normalises and categorises user data
  └───────┬───────┘
          │
          ▼
  ┌───────────────┐
  │ Career Engine │  ← Rule-based matching against pathway knowledge base
  └───────┬───────┘
          │
          ▼
  ┌───────────────┐
  │  Recommender  │  ← Returns ranked career paths + next steps
  └───────────────┘
```

## Running the Prototype

```bash
git clone https://github.com/LindokuhleKubeka/VulaCareerAI-Prototype.git
cd VulaCareerAI-Prototype
pip install -r requirements.txt
python main.py
```

## Roadmap

- [ ] Integrate an LLM API (e.g. Anthropic Claude or Lelapa AI's Vulavula) for natural language input
- [ ] Add isiZulu and isiXhosa language support via African NLP APIs
- [ ] Build a simple web frontend (Flask or FastAPI)
- [ ] Expand the knowledge base with South African-specific companies and roles
- [ ] Add a salary range layer using local market data

## Motivation

Built as part of my broader interest in African-language AI and the South African tech ecosystem. The name references [Lelapa AI's Vulavula](https://lelapa.ai/) — an African NLP platform that I'd like to integrate into a future version of this project.

---

*Feedback and contributions welcome — especially from anyone with knowledge of African language NLP or SA career pathways.*
