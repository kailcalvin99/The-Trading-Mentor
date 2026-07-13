export function getPublicAppUrl(env: NodeJS.ProcessEnv = process.env): URL {
  const raw = env.PUBLIC_APP_URL?.trim();
  if (!raw) throw new Error("PUBLIC_APP_URL is required");
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error("PUBLIC_APP_URL must be a valid absolute URL"); }
  const localHttp = url.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (url.protocol !== "https:" && !(env.NODE_ENV !== "production" && localHttp)) {
    throw new Error("PUBLIC_APP_URL must use HTTPS");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("PUBLIC_APP_URL must not contain credentials, query parameters, or fragments");
  }
  if (url.pathname !== "/") throw new Error("PUBLIC_APP_URL must be an origin without a path");
  return url;
}

export function buildCheckoutUrls(env: NodeJS.ProcessEnv = process.env) {
  const base = getPublicAppUrl(env);
  const root = base.href.endsWith("/") ? base.href : `${base.href}/`;
  return {
    successUrl: new URL("web/pricing?success=1", root).toString(),
    cancelUrl: new URL("web/pricing?canceled=1", root).toString(),
  };
}
