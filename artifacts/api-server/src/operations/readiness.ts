export interface Queryable { query(text: string): Promise<unknown> }

export async function checkDatabaseReadiness(client: Queryable, timeoutMs = 1500): Promise<boolean> {
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      client.query("SELECT 1"),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("readiness timeout")), timeoutMs); }),
    ]);
    return true;
  } catch (error) {
    console.error(JSON.stringify({ event: "database_readiness_failed", reason: error instanceof Error && error.message === "readiness timeout" ? "timeout" : "query_failed" }));
    return false;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
