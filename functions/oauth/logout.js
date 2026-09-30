import { getCookie, clearSessionCookie } from "../_shared/cookies.js";
import { sha256b64url } from "../_shared/crypto.js";

export async function onRequestPost({ request, env }) {
  const h = { "Cache-Control": "no-store" };
  if (request.headers.get("Origin") !== env.PUBLIC_BASE_URL) {
    return new Response("Forbidden", { status: 403, headers: h });
  }

  const raw = getCookie(request, "__Host-session");
  if (raw) {
    await env.DB.prepare("DELETE FROM sessions WHERE id_hash = ?")
      .bind(await sha256b64url(raw))
      .run();
  }

  const headers = new Headers({ ...h, Location: `${env.PUBLIC_BASE_URL}/` });
  headers.append("Set-Cookie", clearSessionCookie());
  return new Response(null, { status: 303, headers });
}

export function onRequest() {
  return new Response("Method Not Allowed", {
    status: 405,
    headers: { Allow: "POST", "Cache-Control": "no-store" },
  });
}
