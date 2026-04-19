import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { Pool } = pg;

const VOYAGE_MODEL = 'voyage-3-lite';
const BATCH_SIZE = 8;

if (!process.env.DATABASE_URL || !process.env.VOYAGE_API_KEY) {
  console.error('Missing DATABASE_URL or VOYAGE_API_KEY');
  process.exit(1);
}

function jobToText(job) {
  return [
    `Job title: ${job.title}`,
    `Company: ${job.company}`,
    `Location: ${job.location}`,
    `Employment type: ${job.type}`,
    `Description: ${job.description}`,
    `Required skills: ${job.requirements.join(', ')}`,
    job.nice_to_have?.length ? `Nice to have: ${job.nice_to_have.join(', ')}` : '',
    `Education: ${job.education}`,
    `Experience: ${job.experience}`,
    `Salary: ${job.salary_range}`,
  ].filter(Boolean).join('\n');
}

async function embedBatch(texts) {
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: VOYAGE_MODEL, input: texts, input_type: 'document' }),
  });
  if (!res.ok) throw new Error(`Voyage error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.data.sort((a, b) => a.index - b.index).map(d => d.embedding);
}

async function upsertJob(pool, job, embedding) {
  await pool.query(
    `INSERT INTO jobs (id,title,company,location,type,description,requirements,
      nice_to_have,education,experience,salary_range,source,embedding)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     ON CONFLICT (id) DO UPDATE SET
       title=EXCLUDED.title, company=EXCLUDED.company, description=EXCLUDED.description,
       requirements=EXCLUDED.requirements, embedding=EXCLUDED.embedding`,
    [job.id,job.title,job.company,job.location,job.type,job.description,
     job.requirements,job.nice_to_have??[],job.education,job.experience,
     job.salary_range,job.source,JSON.stringify(embedding)]
  );
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const jobs = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../data/jobs-seed.json'), 'utf8'));
  console.log(`Ingesting ${jobs.length} jobs...\n`);
  let done = 0;
  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    const batch = jobs.slice(i, i + BATCH_SIZE);
    process.stdout.write(`  Batch ${Math.floor(i/BATCH_SIZE)+1}...`);
    const embeddings = await embedBatch(batch.map(jobToText));
    for (let j = 0; j < batch.length; j++) await upsertJob(pool, batch[j], embeddings[j]);
    done += batch.length;
    console.log(` done (${done}/${jobs.length})`);
    if (i + BATCH_SIZE < jobs.length) await new Promise(r => setTimeout(r, 300));
  }
  const check = await pool.query(`SELECT title, array_length(embedding::real[], 1) AS dims FROM jobs LIMIT 1`);
  console.log(`\nSanity check: "${check.rows[0].title}" — dims: ${check.rows[0].dims}`);
  await pool.end();
}

main().catch(err => { console.error(err.message); process.exit(1); });
