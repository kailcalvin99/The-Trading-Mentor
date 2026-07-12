import { defineConfig } from "drizzle-kit";
import path from "path";

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    // Static commands such as `drizzle-kit check` do not connect. Runtime
    // migration commands are separately guarded and never use this fallback.
    url: process.env.DATABASE_URL ?? "postgresql://unconfigured:unconfigured@127.0.0.1:1/unconfigured",
  },
});
