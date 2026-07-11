// src/routes/jobs-api.js

export async function handleJobsApi(url, env) {
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = 20, offset = (page - 1) * limit;
  const category = url.searchParams.get("category") || "";
  const search = url.searchParams.get("search") || "";
  const remoteType = url.searchParams.get("remote_type") || "";
  const employType = url.searchParams.get("employment_type") || "";
  const seniority = url.searchParams.get("seniority") || "";
  const salaryMin = url.searchParams.get("salary_min") || "";
  const days = url.searchParams.get("days") || "";

  const conditions = [], params = [];
  if (category) { conditions.push("LOWER(title) LIKE ?"); params.push(`%${category}%`); }
  if (search) { conditions.push("(LOWER(title) LIKE ? OR LOWER(company) LIKE ?)"); params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`); }
  if (remoteType) { conditions.push("remote_type = ?"); params.push(remoteType); }
  if (employType) { conditions.push("employment_type = ?"); params.push(employType); }
  if (seniority) { conditions.push("LOWER(seniority) LIKE ?"); params.push(`%${seniority.toLowerCase()}%`); }
  if (salaryMin) { conditions.push("CAST(REPLACE(REPLACE(salary,'$',''),'k','') AS INTEGER) >= ?"); params.push(parseInt(salaryMin)); }
  if (days) { conditions.push("created_at >= datetime('now', '-' || ? || ' days')"); params.push(parseInt(days)); }
  const where = conditions.length ? " WHERE " + conditions.join(" AND ") : "";

  const { results } = await env.DB.prepare(`SELECT * FROM jobs${where} ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`).bind(...params).all();
  const { results: cr } = await env.DB.prepare(`SELECT COUNT(*) as total FROM jobs${where}`).bind(...params).all();

  return new Response(JSON.stringify({ jobs: results, total: cr[0]?.total || 0, page }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}

export async function handleSubscribe(request, env) {
  try {
    const { email, keywords } = await request.json();
    if (!email || !keywords?.length) {
      return new Response(JSON.stringify({ success: false, error: "Required" }), { headers: { "Content-Type": "application/json" } });
    }
    await env.DB.prepare("INSERT OR REPLACE INTO subscribers (email,keywords) VALUES (?,?)").bind(email, JSON.stringify(keywords)).run();
    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

export async function handleDebug(env) {
  const { results } = await env.DB.prepare("SELECT COUNT(*) as count FROM jobs").all();
  return new Response(JSON.stringify({ jobs_in_db: results[0]?.count || 0, api_key_set: !!env.API_KEY }), {
    headers: { "Content-Type": "application/json" }
  });
}
