// src/routes/assets.js
import { APP_JS } from '../client/app.js';

export function handleAssets(pathname) {
  if (pathname === '/assets/app.js') {
    return new Response(APP_JS, {
      headers: { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "public, max-age=3600" }
    });
  }
  return null;
}
