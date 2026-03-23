import app from "./app";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./stripe/stripeClient";
import { execSync } from "child_process";
import net from "net";

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn("DATABASE_URL not set, skipping Stripe init");
    return;
  }

  try {
    console.log("Initializing Stripe schema...");
    await runMigrations({ databaseUrl, schema: "stripe" });
    console.log("Stripe schema ready");

    const stripeSync = await getStripeSync();
    console.log("Stripe sync initialized");

    const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
    const webhookResult = await stripeSync.findOrCreateManagedWebhook(
      `${webhookBaseUrl}/api/stripe/webhook`
    );
    console.log("Webhook configured:", webhookResult?.webhook?.url || "setup complete");

    stripeSync.syncBackfill()
      .then(() => console.log("Stripe data synced"))
      .catch((err: any) => console.error("Error syncing Stripe data:", err.message));
  } catch (error: any) {
    console.error("Failed to initialize Stripe:", error.message);
  }
}

function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once("error", (err: NodeJS.ErrnoException) => {
      resolve(err.code === "EADDRINUSE");
    });
    probe.once("listening", () => {
      probe.close(() => resolve(false));
    });
    probe.listen(port, "0.0.0.0");
  });
}

function killPortOccupant(port: number): void {
  const commands = [
    `fuser -k -n tcp ${port}`,
    `ss -tlnp "sport = :${port}" | awk 'NR>1{print $6}' | grep -oP 'pid=\\K[0-9]+' | xargs -r kill -9`,
  ];
  for (const cmd of commands) {
    try {
      execSync(cmd, { stdio: "pipe" });
      console.log(`Freed port ${port} via: ${cmd.split(" ")[0]}`);
      return;
    } catch {
    }
  }
}

async function preparePort(port: number, maxAttempts: number = 5): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const inUse = await isPortInUse(port);
    if (!inUse) return;

    console.warn(`Port ${port} is occupied (check ${attempt}/${maxAttempts}). Attempting to free it...`);
    killPortOccupant(port);

    const delayMs = Math.min(1000 * attempt, 5000);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  const stillInUse = await isPortInUse(port);
  if (stillInUse) {
    console.error(`Unable to free port ${port} after ${maxAttempts} attempts. Exiting so the workflow manager can restart.`);
    process.exit(1);
  }
}

async function startServer(port: number): Promise<void> {
  await preparePort(port);

  const server = app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${port} still in use after pre-bind cleanup (TOCTOU race). Exiting so the workflow manager can restart.`);
      process.exit(1);
    } else {
      console.error("Server error:", err);
    }
  });
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  console.error("PORT environment variable is required but was not provided.");
  process.exit(1);
}

const port = parseInt(rawPort, 10);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`Invalid PORT value: "${rawPort}" — must be an integer between 1 and 65535`);
  process.exit(1);
}

try {
  await initStripe();
} catch (err: any) {
  console.error("Stripe initialization failed, continuing without Stripe:", err?.message || err);
}

await startServer(port);
