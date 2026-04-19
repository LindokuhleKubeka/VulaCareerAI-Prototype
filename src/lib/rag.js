const VOYAGE_MODEL = 'voyage-3-lite';
const TOP_K = 5;

export async function embedQuery(text) {
  console.log('embedQuery called, key present:', !!process.env.VOYAGE_API_KEY);
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: VOYAGE_MODEL, input: [text], input_type: 'query' }),
  });
  const resText = await res.text();
  console.log('Voyage status:', res.status, resText.slice(0, 100));
  if (!res.ok) throw new Error(`Voyage embed error ${res.status}: ${resText}`);
  const data = JSON.parse(resText);

  return data.data[0].embedding;
}

export async function vectorSearch(pool, queryEmbedding, k = TOP_K) {
  const result = await pool.query(
    `SELECT id, title, company, location, type, description, requirements,
            nice_to_have, education, experience, salary_range,
            1 - (embedding <=> $1::vector) AS similarity
     FROM jobs ORDER BY embedding <=> $1::vector LIMIT $2`,
    [JSON.stringify(queryEmbedding), k]
  );
  return result.rows;
}

export function buildAnalysePrompt(cvText, matchedJobs) {
  const jobContext = matchedJobs.map((j, i) => `
JOB ${i + 1}: ${j.title} at ${j.company} (${j.location})
Type: ${j.type} | Salary: ${j.salary_range} | Experience: ${j.experience}
Requirements: ${j.requirements.join(', ')}
${j.nice_to_have?.length ? `Nice to have: ${j.nice_to_have.join(', ')}` : ''}
Description: ${j.description.slice(0, 300)}...
Similarity: ${(j.similarity * 100).toFixed(1)}%`).join('\n\n');

  return `You are VulaCareerAI, a career guidance assistant for South African job seekers.

## Candidate CV
${cvText}

## Top Matching SA Jobs (retrieved by semantic search)
${jobContext}

## Your Task
1. Match Assessment: For the top 3 jobs, explain fit honestly — which skills match and which are missing.
2. Skill Gaps: List the top 3-5 skills to prioritise.
3. Recommended Next Step: One concrete action this week (course, project, certification).
4. Salary Expectation: Honest range based on their current level.

Be warm but honest. Short paragraphs, not bullet walls. Plain English.`;
}

export function buildTailorPrompt(cvText, targetJob) {
  return `You are VulaCareerAI, a career guidance assistant for South African job seekers.

Tailor this CV for the job below. Do not fabricate experience.

## Target Job
Title: ${targetJob.title} at ${targetJob.company} (${targetJob.location})
Requirements: ${targetJob.requirements.join(', ')}
${targetJob.nice_to_have?.length ? `Nice to have: ${targetJob.nice_to_have.join(', ')}` : ''}
Description: ${targetJob.description}

## Candidate CV
${cvText}

## Produce
1. Professional Summary (3-4 sentences, keywords from job description)
2. Skills Section (reordered for this role)
3. Experience Bullets (2-3 per role, action verbs, quantified where possible)
4. Gap Honesty Note (2-3 sentences on unmet requirements and how to address in cover letter)`;
}
