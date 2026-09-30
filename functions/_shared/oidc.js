import { fromB64url } from "./crypto.js";

const ISSUER = "https://accounts.google.com";
const dec = new TextDecoder();

export async function verifyGoogleIdToken(idToken, { clientId, nonce }) {
  const parts = String(idToken).split(".");
  if (parts.length !== 3) throw new Error("formato");

  const header = JSON.parse(dec.decode(fromB64url(parts[0])));
  const payload = JSON.parse(dec.decode(fromB64url(parts[1])));
  if (header.alg !== "RS256") throw new Error("alg");

  const disc = await (await fetch(`${ISSUER}/.well-known/openid-configuration`)).json();
  if (disc.issuer !== ISSUER) throw new Error("emissor");

  const jwks = await (await fetch(disc.jwks_uri)).json();
  const jwk = jwks.keys.find((k) => k.kid === header.kid);
  if (!jwk) throw new Error("kid");

  const key = await crypto.subtle.importKey(
    "jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]
  );
  const ok = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5", key, fromB64url(parts[2]),
    new TextEncoder().encode(parts[0] + "." + parts[1])
  );
  if (!ok) throw new Error("assinatura");

  const now = Math.floor(Date.now() / 1000);
  if (payload.iss !== ISSUER) throw new Error("iss");
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(clientId)) throw new Error("aud");
  if (!(payload.exp > now)) throw new Error("exp");
  if (!(payload.iat <= now + 300)) throw new Error("iat");
  if (!nonce || payload.nonce !== nonce) throw new Error("nonce");
  if (!payload.sub) throw new Error("sub");
  return payload;
}
