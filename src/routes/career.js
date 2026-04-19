import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { embedQuery, vectorSearch, buildAnalysePrompt, buildTailorPrompt } from '../lib/rag.js';
import { runEval, saveEval } from '../lib/eval.js';

const router = Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function sse(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function sseHeaders(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
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
    const prompt = buildAnalysePrompt(cv, matchedJobs);
    let fullResponse = '';

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContentStream(prompt);

    for await (const chunk of result.stream) {
      const token = chunk.text();
      fullResponse += token;
      sse(res, 'token', { text: token });
    }

    sse(res, 'done', { input_tokens: 0, output_tokens: 0 });
    res.end();

    setImmediate(async () => {
      const evalResult = await runEval({ endpoint: '/api/analyse', cvSnippet: cv, jobIdsMatched: matchedJobs.map(j => j.id), llmResponse: fullResponse });
      await saveEval(req.app.locals.pool, evalResult);
    });
  } catch (err) {
    console.error('Analyse error:', err.message);
    sse(res, 'error', { message: 'Something went wrong. Please try again.' });
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

    let fullResponse = '';
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContentStream(buildTailorPrompt(cv, targetJob));

    for await (const chunk of result.stream) {
      const token = chunk.text();
      fullResponse += token;
      sse(res, 'token', { text: token });
    }

    sse(res, 'done', { input_tokens: 0, output_tokens: 0 });
    res.end();

    setImmediate(async () => {
      const evalResult = await runEval({ endpoint: '/api/tailor', cvSnippet: cv, jobIdsMatched: [jobId], llmResponse: fullResponse });
      await saveEval(req.app.locals.pool, evalResult);
    });
  } catch (err) {
    console.error('Tailor error:', err.message);
    sse(res, 'error', { message: 'Something went wrong.' });
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
