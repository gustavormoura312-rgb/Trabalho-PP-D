export function toB64url(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromB64url(str) {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/")
    .padEnd(Math.ceil(str.length / 4) * 4, "=");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function randomB64url() {
  const a = new Uint8Array(32);
  crypto.getRandomValues(a);
  return toB64url(a);
}

export async function sha256b64url(text) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return toB64url(d);
}
