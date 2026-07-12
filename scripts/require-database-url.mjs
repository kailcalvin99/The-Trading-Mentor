if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL must be set before running database migrations.");
  process.exit(1);
}
