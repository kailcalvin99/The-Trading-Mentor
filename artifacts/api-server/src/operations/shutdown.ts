import type { Server } from "node:http";

export interface ClosablePool { end(): Promise<void> }

export async function closeServerAndPool(server: Server, pool: ClosablePool): Promise<void> {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await pool.end();
}
