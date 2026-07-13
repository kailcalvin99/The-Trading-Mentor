export function normalizeIdentityEmail(value: string): string { return value.trim().toLowerCase(); }

export function roleForRegistration(email: string, env: NodeJS.ProcessEnv = process.env): "admin" | "user" {
  const configured = normalizeIdentityEmail(env.ADMIN_EMAIL || "");
  return configured !== "" && normalizeIdentityEmail(email) === configured ? "admin" : "user";
}
