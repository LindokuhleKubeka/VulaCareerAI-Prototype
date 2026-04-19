import { Router } from 'express';
import { embedQuery, vectorSearch, buildAnalysePrompt, buildTailorPrompt } from '../lib/rag.js';

const router = Router();

function sse(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function sseHeaders(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
}

function mockAnalysis(jobs) {
  if (!jobs.length) return 'No matching jobs found. Try adding more detail to your CV.';
  const top = jobs[0];
  return `## Match Assessment

**${top.title} at ${top.company}** (${(top.similarity * 100).toFixed(0)}% match)
Your Kubernetes and cloud background aligns strongly with this role. Your KCNA certification is a direct match for their infrastructure requirements. The main gap is hands-on production incident response experience, which you can address by documenting your k8s-journey project outcomes.

## Skill Gaps

Based on the matched roles, prioritise these skills:
- Terraform (infrastructure-as-code — appears in 80% of matched roles)
- Helm chart authoring (beyond basic usage)
- Observability tooling: Prometheus + Grafana hands-on
- Python scripting for automation (strengthen beyond basics)

## Recommended Next Step

This week: Deploy a simple app to your local Kubernetes cluster using a Helm chart you wrote yourself, then add a Prometheus scrape config. Push it to GitHub. That single project closes three skill gaps at once.

## Salary Expectation

At your current level (KCNA certified, WeThinkCode graduate, real project experience), target **R18,000 - R24,000 per month** for junior cloud/DevOps roles in Johannesburg. You're competitive for the lower-mid range immediately, and the upper range within 6 months of employment.`;
}

function mockTailor(job) {
  return `## Professional Summary

Results-driven software engineer and WeThinkCode graduate with hands-on experience in cloud-native technologies, container orchestration, and backend development. KCNA certified with practical Kubernetes deployment experience through the k8s-journey project. Passionate about building scalable infrastructure solutions for the African tech market, with a proven track record of delivering AI-powered platforms like VulaCareerAI.

## Skills

**Core:** Kubernetes, Docker, Linux, CI/CD pipelines, REST APIs, Node.js, Python
**Cloud:** AWS, Azure (fundamentals), Helm, ArgoCD
**Tools:** Git, GitHub Actions, Prometheus, Grafana
**Practices:** Agile/Scrum, TDD, Infrastructure as Code

## Experience Bullets

**VulaCareerAI (Personal Project)**
- Built and deployed a RAG-powered career guidance platform using Node.js, pgvector, and Gemini AI serving South African job seekers
- Implemented CI/CD pipeline via GitHub Actions with automated deployment to Railway cloud platform
- Designed vector search system embedding 15+ SA job listings for semantic matching

**k8s-journey (Personal Project)**
- Deployed multi-service applications to Kubernetes clusters, managing deployments, services, and ingress controllers
- Documented Kubernetes learning path adopted by peers in the African Developer Training Program

## Gap Honesty Note

This role requires 0-2 years of production Kubernetes experience — my experience is project-based rather than enterprise production. In my cover letter I will highlight my KCNA certification, active learning through the k8s-journey repo, and my readiness to contribute immediately while growing into production operations responsibilities.`;
}

router.post('/analyse', async (req, res) => {
  const { cv } = req.body;
  if (!cv || cv.trim().length < 50)
    return res.status(400).json({ error: 'Provide a CV with at least 50 characters.' });

  sseHeaders(res);
  try {
    sse(res, 'status', { message: 'Finding matching SA jobs...' });
    const queryEmbedding = await embedQuery(cv.slice(0, 3000));
    const matchedJobs = await vectorSearch(req.app.locals.pool, queryEmbedding);

    sse(res, 'matches', {
      jobs: matchedJobs.map(j => ({
        id: j.id, title: j.title, company: j.company,
        location: j.location, salary_range: j.salary_range,
        similarity: parseFloat(j.similarity.toFixed(3)),
      })),
    });

    sse(res, 'status', { message: 'Generating personalised career analysis...' });
    await new Promise(r => setTimeout(r, 800));
    const response = mockAnalysis(matchedJobs);
    sse(res, 'token', { text: response });
    sse(res, 'done', { input_tokens: 0, output_tokens: 0 });
    res.end();
  } catch (err) {
    console.error('Analyse error:', err.message);
    sse(res, 'error', { message: err.message });
    res.end();
  }
});

router.post('/tailor', async (req, res) => {
  const { cv, jobId } = req.body;
  if (!cv || !jobId) return res.status(400).json({ error: 'Provide cv and jobId.' });

  sseHeaders(res);
  try {
    const jobResult = await req.app.locals.pool.query('SELECT * FROM jobs WHERE id = $1', [jobId]);
    if (!jobResult.rows.length) { sse(res, 'error', { message: `Job ${jobId} not found.` }); return res.end(); }

    const targetJob = jobResult.rows[0];
    sse(res, 'status', { message: `Tailoring CV for ${targetJob.title} at ${targetJob.company}...` });
    await new Promise(r => setTimeout(r, 800));
    const response = mockTailor(targetJob);
    sse(res, 'token', { text: response });
    sse(res, 'done', { input_tokens: 0, output_tokens: 0 });
    res.end();
  } catch (err) {
    console.error('Tailor error:', err.message);
    sse(res, 'error', { message: err.message });
    res.end();
  }
});

router.get('/metrics', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const [totals, scoreAvgs, recent] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS total_requests, SUM(input_tokens + output_tokens) AS total_tokens,
        ROUND(AVG(latency_ms)) AS avg_latency_ms,
        SUM((input_tokens * 0.000003) + (output_tokens * 0.000015)) AS estimated_cost_usd FROM eval_logs`),
      pool.query(`SELECT endpoint,
        ROUND(AVG((judge_score->>'relevance')::numeric), 2) AS avg_relevance,
        ROUND(AVG((judge_score->>'tone')::numeric), 2) AS avg_tone,
        ROUND(AVG((judge_score->>'gap_coverage')::numeric), 2) AS avg_gap_coverage,
        ROUND(AVG((judge_score->>'overall')::numeric), 2) AS avg_overall,
        COUNT(*) AS requests
        FROM eval_logs WHERE judge_score IS NOT NULL GROUP BY endpoint`),
      pool.query(`SELECT request_id, endpoint, judge_score, latency_ms,
        input_tokens + output_tokens AS total_tokens, created_at
        FROM eval_logs ORDER BY created_at DESC LIMIT 20`),
    ]);
    res.json({ summary: totals.rows[0], scores_by_endpoint: scoreAvgs.rows, recent_requests: recent.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch metrics.' });
  }
});

export default router;
