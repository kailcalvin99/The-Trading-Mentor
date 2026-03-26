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
    const probe = net.createConnection({ port, host: "127.0.0.1" });
    probe.once("connect", () => {
      probe.destroy();
      resolve(true);
    });
    probe.once("error", (err: NodeJS.ErrnoException) => {
      probe.destroy();
      resolve(err.code !== "ECONNREFUSED");
    });
  });
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function waitForPortFree(port: number, timeoutMs: number, intervalMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  
  while (Date.now() < deadline) {
    const inUse = await isPortInUse(port);
    if (!inUse) {
      return true; // The port is free!
    }
    await sleep(intervalMs); // Wait a bit before checking again
  }
  
  return false; // Time ran out
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

async function preparePort(port: number, maxKillAttempts: number = 5): Promise<void> {
  for (let attempt = 1; attempt <= maxKillAttempts; attempt++) {
    const inUse = await isPortInUse(port);
    if (!inUse) {
      return;   // Port is free, proceed
    }
    
    console.log(`Port ${port} occupied, attempting kill... (Attempt ${attempt}/${maxKillAttempts})`);
    await killPortOccupant(port);
    
    // POLL for the port to be free (up to 8 seconds, checking every 200ms)
    const freed = await waitForPortFree(port, 8000, 200);
    if (freed) {
      return;   // Kill worked, port is free
    }
    
    console.log(`Port ${port} still occupied after kill attempt ${attempt}/${maxKillAttempts}`);
    // Give the OS a bit more time between attempts
    await sleep(500);
  }
  
  // All kill attempts exhausted — log a warning but attempt to bind anyway.
  // The OS may free the socket after TIME_WAIT even if lsof no longer sees a process.
  console.warn(
    `Could not confirm port ${port} is free after ${maxKillAttempts} attempts. ` +
    `Attempting to bind anyway — the OS may accept it.`
  );
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
  // Best-effort port cleanup before binding. preparePort warns but no longer
  // exits fatally — it falls through so we attempt to bind regardless.
  // We never fall back to a different port because Replit's proxy routes
  // traffic only to the exact PORT value assigned by the platform.
  await preparePort(requestedPort);

  let server: ReturnType<typeof app.listen>;
  let boundPort: number;

  const MAX_BIND_ATTEMPTS = 4;
  let lastBindErr: unknown;

  for (let attempt = 1; attempt <= MAX_BIND_ATTEMPTS; attempt++) {
    try {
      ({ server, boundPort } = await bindServer(requestedPort));
      lastBindErr = undefined;
      break;
    } catch (err: unknown) {
      lastBindErr = err;
      const code = err instanceof Error && "code" in err
        ? (err as NodeJS.ErrnoException).code
        : undefined;

      if (code !== "EADDRINUSE") {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("Server error:", msg);
        process.exit(1);
      }

      if (attempt < MAX_BIND_ATTEMPTS) {
        const delay = attempt * 300;
        console.warn(
          `Port ${requestedPort} taken at bind time (attempt ${attempt}/${MAX_BIND_ATTEMPTS}). ` +
          `Retrying in ${delay}ms...`
        );
        await killPortOccupant(requestedPort);
        await sleep(delay);
      }
    }
  }

  if (lastBindErr !== undefined) {
    const msg = lastBindErr instanceof Error ? lastBindErr.message : String(lastBindErr);
    console.error(`FATAL: Could not bind to assigned port ${requestedPort} after ${MAX_BIND_ATTEMPTS} attempts: ${msg}`);
    process.exit(1);
  }

  server!.on("error", (err: NodeJS.ErrnoException) => {
    console.error("Unexpected server error after bind:", err);
  });

  const openSockets = new Set<import("net").Socket>();
  server!.on("connection", (socket: import("net").Socket) => {
    openSockets.add(socket);
    socket.once("close", () => openSockets.delete(socket));
  });

  let shuttingDown = false;

  function shutdown(signal: string): void {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`Received ${signal}. Closing server gracefully...`);
    openSockets.forEach((s) => s.destroy());
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
