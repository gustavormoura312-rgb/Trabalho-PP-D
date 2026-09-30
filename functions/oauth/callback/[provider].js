import { randomB64url, sha256b64url } from "../../_shared/crypto.js";
import { getCookie, clearTxCookie, sessionCookie } from "../../_shared/cookies.js";
import { getProvider } from "../../_shared/providers.js";
import { verifyGoogleIdToken } from "../../_shared/oidc.js";

const GH_HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2026-03-10",
  "User-Agent": "oauth-pages-lab",
};

export async function onRequestGet({ request, env, params }) {
  const p = getProvider(params.provider, env);
  if (!p) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

  const fail = (status = 400) =>
    new Response("Falha na autenticação", {
      status,
      headers: { "Cache-Control": "no-store", "Set-Cookie": clearTxCookie() },
    });

  try {
    const url = new URL(request.url);
    if (url.searchParams.get("error")) return fail();
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state) return fail();

    const txRaw = getCookie(request, "__Host-oauth-tx");
    if (!txRaw) return fail();

    const idHash = await sha256b64url(txRaw);
    const now = Math.floor(Date.now() / 1000);
    const tx = await env.DB
      .prepare("SELECT * FROM oauth_transactions WHERE id_hash = ? AND expires_at > ?")
      .bind(idHash, now)
      .first();
    if (!tx || tx.provider !== p.name) return fail();

    // apaga a transação antes de continuar (uso único)
    await env.DB.prepare("DELETE FROM oauth_transactions WHERE id_hash = ?").bind(idHash).run();

    if ((await sha256b64url(state)) !== tx.state_hash) return fail();

    // troca do código por tokens
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${env.PUBLIC_BASE_URL}/oauth/callback/${p.name}`,
      client_id: p.clientId,
      client_secret: p.clientSecret,
      code_verifier: tx.code_verifier,
    });
    const tokenRes = await fetch(p.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body,
    });
    if (!tokenRes.ok) return fail();
    const tok = await tokenRes.json();
    if (tok.error) return fail();

    let identity;

    if (p.name === "google") {
      if (!tok.id_token) return fail();
      const payload = await verifyGoogleIdToken(tok.id_token, {
        clientId: p.clientId,
        nonce: tx.nonce,
      });
      identity = {
        issuer: "https://accounts.google.com",
        subject: String(payload.sub),
        email: payload.email ?? null,
        displayName: payload.name ?? null,
      };
    } else {
      if (!tok.access_token || String(tok.token_type).toLowerCase() !== "bearer") return fail();

      const userRes = await fetch("https://api.github.com/user", {
        headers: { ...GH_HEADERS, Authorization: `Bearer ${tok.access_token}` },
      });
      if (userRes.status !== 200) return fail();
      const user = await userRes.json();
      if (!Number.isInteger(user.id)) return fail();

      // revoga a autorização; só segue se vier 204
      const revoke = await fetch(`https://api.github.com/applications/${p.clientId}/grant`, {
        method: "DELETE",
        headers: {
          ...GH_HEADERS,
          Authorization: `Basic ${btoa(`${p.clientId}:${p.clientSecret}`)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ access_token: tok.access_token }),
      });
      if (revoke.status !== 204) return fail();

      identity = {
        issuer: "https://github.com",
        subject: String(user.id),
        email: user.email ?? null,
        displayName: user.name || user.login || null,
      };
    }

    // cria a sessão local
    const sessRaw = randomB64url();
    await env.DB
      .prepare("INSERT INTO sessions (id_hash, issuer, subject, email, display_name, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(await sha256b64url(sessRaw), identity.issuer, identity.subject,
            identity.email, identity.displayName, now + 28800, now)
      .run();

    const headers = new Headers({
      Location: `${env.PUBLIC_BASE_URL}/`,
      "Cache-Control": "no-store",
    });
    headers.append("Set-Cookie", sessionCookie(sessRaw));
    headers.append("Set-Cookie", clearTxCookie());
    return new Response(null, { status: 302, headers });
  } catch (e) {
    return fail();
  }
}
