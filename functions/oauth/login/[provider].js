import { randomB64url, sha256b64url } from "../../_shared/crypto.js";
import { txCookie } from "../../_shared/cookies.js";
import { getProvider } from "../../_shared/providers.js";

export async function onRequestGet({ env, params }) {
  const p = getProvider(params.provider, env);
  if (!p) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

  const txRaw = randomB64url();
  const state = randomB64url();
  const verifier = randomB64url();
  const nonce = p.name === "google" ? randomB64url() : null;
  const challenge = await sha256b64url(verifier);
  const now = Math.floor(Date.now() / 1000);

  await env.DB.prepare("DELETE FROM oauth_transactions WHERE expires_at < ?").bind(now).run();
  await env.DB
    .prepare("INSERT INTO oauth_transactions (id_hash, provider, state_hash, nonce, code_verifier, expires_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(await sha256b64url(txRaw), p.name, await sha256b64url(state), nonce, verifier, now + 600)
    .run();

  const url = new URL(p.authUrl);
  url.searchParams.set("client_id", p.clientId);
  url.searchParams.set("redirect_uri", `${env.PUBLIC_BASE_URL}/oauth/callback/${p.name}`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  if (p.name === "google") {
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("nonce", nonce);
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString(),
      "Set-Cookie": txCookie(txRaw),
      "Cache-Control": "no-store",
    },
  });
}
