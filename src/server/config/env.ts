function readEnv(name: string, fallback?: string) {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function readOptionalInt(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;

  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value)) {
    throw new Error(`Environment variable ${name} must be an integer`);
  }

  return value;
}

export const env = {
  port: readOptionalInt("PORT", 3001),
  appBaseUrl: process.env.APP_BASE_URL ?? "http://localhost:3001",
  betterAuthSecret: process.env.BETTER_AUTH_SECRET ?? "",
  dbHost: readEnv("DB_HOST", "127.0.0.1"),
  dbPort: readOptionalInt("DB_PORT", 3306),
  dbName: readEnv("DB_NAME", "hpc_dashboard"),
  dbUser: readEnv("DB_USER", "hpc_dashboard"),
  dbPassword: readEnv("DB_PASSWORD", "hpc_dashboard"),
  entraClientId: process.env.ENTRA_CLIENT_ID ?? "",
  entraTenantId: process.env.ENTRA_TENANT_ID ?? "",
  entraClientSecret: process.env.ENTRA_CLIENT_SECRET ?? "",
} as const;
