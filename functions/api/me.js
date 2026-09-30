import { getCookie } from "../_shared/cookies.js";
import { sha256b64url } from "../_shared/crypto.js";

export async function onRequestGet({ request, env }) {
  const h = { "Cache-Control": "no-store" };
  const raw = getCookie(request, "__Host-session");
  if (!raw) return Response.json({ error: "unauthorized" }, { status: 401, headers: h });

  const now = Math.floor(Date.now() / 1000);
  const s = await env.DB
    .prepare("SELECT email, display_name FROM sessions WHERE id_hash = ? AND expires_at > ?")
    .bind(await sha256b64url(raw), now)
    .first();
  if (!s) return Response.json({ error: "unauthorized" }, { status: 401, headers: h });

  return Response.json({ email: s.email, displayName: s.display_name }, { headers: h });
}
