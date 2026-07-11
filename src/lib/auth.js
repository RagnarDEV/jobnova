// src/lib/auth.js
// Lightweight admin auth: no extra deps, no external DB needed.
// Set the secret with: wrangler secret put ADMIN_PASSWORD

async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function makeSessionToken(env) {
  // Token = sha256(password + fixed salt). Stateless, no session table needed.
  return sha256((env.ADMIN_PASSWORD || "") + "::jobnova-admin-salt");
}

export async function isAuthed(request, env) {
  if (!env.ADMIN_PASSWORD) return false; // admin disabled until secret is set
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/jn_admin=([a-f0-9]+)/);
  if (!match) return false;
  const expected = await makeSessionToken(env);
  return match[1] === expected;
}

export function loginCookie(token) {
  return `jn_admin=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`;
}

export function logoutCookie() {
  return `jn_admin=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
