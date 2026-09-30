export function getCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i === -1) continue;
    if (part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

export const txCookie = (v) =>
  `__Host-oauth-tx=${v}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`;
export const clearTxCookie = () =>
  `__Host-oauth-tx=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
export const sessionCookie = (v) =>
  `__Host-session=${v}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`;
export const clearSessionCookie = () =>
  `__Host-session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
