import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

export function createDatabaseAdapter() {
  const tursoUrl = process.env.TURSO_DATABASE_URL?.trim();

  if (tursoUrl) {
    return new PrismaLibSql({
      url: tursoUrl,
      authToken: process.env.TURSO_AUTH_TOKEN?.trim() || undefined,
    });
  }

  const configuredUrl = process.env.DATABASE_URL?.trim();
  const localUrl = configuredUrl?.startsWith("file:")
    ? configuredUrl
    : `file:${path.resolve(process.cwd(), "dev.db")}`;

  return new PrismaBetterSqlite3({ url: localUrl });
}
