import app from "./app";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./stripe/stripeClient";
import { execSync, execFileSync } from "child_process";
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function killPortOccupant(port: number): Promise<void> {
  let pids: string[] = [];

  try {
    const output = execFileSync("lsof", ["-ti", `tcp:${port}`], { stdio: "pipe" })
      .toString()
      .trim();
    pids = output.split("\n").filter(Boolean);
  } catch {
  }

  if (pids.length > 0) {
    for (const pid of pids) {
      try {
        process.kill(parseInt(pid, 10), "SIGTERM");
        console.log(`Sent SIGTERM to PID ${pid} holding port ${port}`);
      } catch {
      }
    }

    await sleep(500);

    for (const pid of pids) {
      try {
        process.kill(parseInt(pid, 10), 0);
        process.kill(parseInt(pid, 10), "SIGKILL");
        console.log(`Sent SIGKILL to PID ${pid} holding port ${port}`);
      } catch {
      }
    }
    return;
  }

  const fallbackCommands = [
    `fuser -k -n tcp ${port}`,
    `ss -tlnp "sport = :${port}" | awk 'NR>1{print $6}' | grep -oP 'pid=\\K[0-9]+' | xargs -r kill -9`,
  ];
  for (const cmd of fallbackCommands) {
    try {
      execSync(cmd, { stdio: "pipe" });
      console.log(`Freed port ${port} via: ${cmd.split(" ")[0]}`);
      return;
    } catch {
    }
  }
}

async function preparePort(port: number, maxAttempts: number = 8): Promise<number> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const inUse = await isPortInUse(port);
    if (!inUse) return port;

    console.warn(`Port ${port} is occupied (attempt ${attempt}/${maxAttempts}). Attempting to free it...`);
    await killPortOccupant(port);

    const delayMs = Math.min(300 * Math.pow(2, attempt - 1), 3000);
    await sleep(delayMs);
  }

  const stillInUse = await isPortInUse(port);
  if (stillInUse) {
    console.warn(`Unable to free port ${port} after ${maxAttempts} attempts. Searching for fallback port...`);

    for (let candidate = port + 1; candidate <= port + 20; candidate++) {
      const candidateInUse = await isPortInUse(candidate);
      if (!candidateInUse) {
        console.warn(`WARNING: Falling back to port ${candidate} instead of ${port}`);
        return candidate;
      }
    }

    console.warn(`WARNING: All nearby ports occupied. Will let the OS assign a free port.`);
    return 0;
  }

  return port;
}

function bindServer(port: number): Promise<{ server: ReturnType<typeof app.listen>; boundPort: number }> {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      const address = server.address();
      const boundPort = typeof address === "object" && address !== null ? address.port : port;
      console.log(`Server listening on port ${boundPort}`);
      resolve({ server, boundPort });
    });

    server.once("error", reject);
  });
}

async function startServer(requestedPort: number): Promise<void> {
  const preferredPort = await preparePort(requestedPort);

  let server: ReturnType<typeof app.listen>;
  let boundPort: number;

  try {
    ({ server, boundPort } = await bindServer(preferredPort));
  } catch (firstErr: unknown) {
    const code = firstErr instanceof Error && "code" in firstErr
      ? (firstErr as NodeJS.ErrnoException).code
      : undefined;

    if (code === "EADDRINUSE") {
      console.warn(
        `Port ${preferredPort} taken at bind time (TOCTOU race). Binding on OS-assigned port...`
      );
      try {
        ({ server, boundPort } = await bindServer(0));
        console.warn(`WARNING: Listening on OS-assigned port ${boundPort} instead of ${requestedPort}`);
      } catch (innerErr: unknown) {
        const msg = innerErr instanceof Error ? innerErr.message : String(innerErr);
        console.error("Failed to bind on any port:", msg);
        process.exit(1);
      }
    } else {
      const msg = firstErr instanceof Error ? firstErr.message : String(firstErr);
      console.error("Server error:", msg);
      process.exit(1);
    }
  }

  server!.on("error", (err: NodeJS.ErrnoException) => {
    console.error("Unexpected server error after bind:", err);
  });

  let shuttingDown = false;

  function shutdown(signal: string): void {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`Received ${signal}. Closing server gracefully...`);
    server!.close(() => {
      console.log("Server closed. Exiting.");
      process.exit(0);
    });

    setTimeout(() => {
      console.warn("Forced shutdown after timeout.");
      process.exit(1);
    }, 10000).unref();
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
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
