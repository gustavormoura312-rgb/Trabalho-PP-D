const t = (v) => (v ?? "").trim();

export function getProvider(name, env) {
  if (name === "google") {
    return {
      name: "google",
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      clientId: t(env.GOOGLE_CLIENT_ID),
      clientSecret: t(env.GOOGLE_CLIENT_SECRET),
    };
  }
  if (name === "github") {
    return {
      name: "github",
      authUrl: "https://github.com/login/oauth/authorize",
      tokenUrl: "https://github.com/login/oauth/access_token",
      clientId: t(env.GITHUB_CLIENT_ID),
      clientSecret: t(env.GITHUB_CLIENT_SECRET),
    };
  }
  return null;
}
