// src/providers/greenhouse.js
// Provider: Greenhouse job boards — public per-company API, no auth key.
// The "api_key" field for this provider actually holds the company's board
// token (the slug in boards.greenhouse.io/<token>), e.g. "airbnb".
export const id = 'greenhouse';
export const needsKey = true;
export const keyFormatHint = 'board token (e.g. airbnb)';
export const ignoresQuery = true;

export async function fetchJobs({ apiKey: boardToken, timeoutMs = 15000 } = {}) {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs?content=true`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return (data.jobs || []).map(j => map(j, boardToken)).filter(j => j.url);
  } finally {
    clearTimeout(timer);
  }
}

function map(job, boardToken) {
  const locName = (job.location && job.location.name) || '';
  return {
    title: job.title || 'Unknown',
    company: boardToken,
    location: locName,
    url: job.absolute_url || '',
    description: (job.content || '').replace(/<[^>]+>/g, ' ').slice(0, 5000),
    salary: '',
    remote_type: /remote/i.test(locName) ? 'fully_remote' : '',
    skills: [],
    seniority: '',
    employment_type: '',
    job_handle: String(job.id || ''),
    source: 'greenhouse',
  };
}
