import crypto from 'crypto';

const CLAUDE_MODEL = 'claude-sonnet-4-20250514';
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

export async function runEval({ endpoint, cvSnippet, jobIdsMatched, llmResponse }) {
  const judgePrompt = `You are an evaluator assessing AI career guidance quality for a South African job seeker.

Score the response below. Respond ONLY with valid JSON — no preamble.

## Response to Evaluate
${llmResponse}

JSON format:
{
  "relevance": <int 1-10>,
  "tone": <int 1-10>,
  "gap_coverage": <int 1-10>,
  "overall": <int 1-10>,
  "reasoning": "<one sentence>"
}`;

  const startTime = Date.now();
  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 256, messages: [{ role: 'user', content: judgePrompt }] }),
  });

  const latencyMs = Date.now() - startTime;
  if (!res.ok) { console.error('Eval failed:', await res.text()); return null; }

  const data = await res.json();
  const rawText = data.content?.[0]?.text ?? '';
  let judgeScore = null;
  try { judgeScore = JSON.parse(rawText.replace(/```json|```/g, '').trim()); }
  catch { console.error('Eval parse error:', rawText); }

  return {
    requestId: crypto.randomUUID(),
    endpoint,
    cvSnippet: cvSnippet?.slice(0, 300),
    jobIdsMatched,
    llmResponse: llmResponse?.slice(0, 2000),
    judgeScore,
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
    latencyMs,
    model: CLAUDE_MODEL,
  };
}

export async function saveEval(pool, evalResult) {
  if (!evalResult) return;
  try {
    await pool.query(
      `INSERT INTO eval_logs (request_id, endpoint, cv_snippet, job_ids_matched,
        llm_response, judge_score, input_tokens, output_tokens, latency_ms, model)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [evalResult.requestId, evalResult.endpoint, evalResult.cvSnippet,
       evalResult.jobIdsMatched, evalResult.llmResponse,
       JSON.stringify(evalResult.judgeScore), evalResult.inputTokens,
       evalResult.outputTokens, evalResult.latencyMs, evalResult.model]
    );
  } catch (err) { console.error('Failed to save eval:', err.message); }
}
