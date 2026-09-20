import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

type StoreGlobal = typeof globalThis & {
  rescueCastDatabase?: DatabaseSync;
};

const storeGlobal = globalThis as StoreGlobal;

export const dataDirectory =
  process.env.DATA_DIR || path.join(process.cwd(), ".rescuecast-data");
export const uploadDirectory = path.join(dataDirectory, "uploads");

function createDatabase() {
  mkdirSync(uploadDirectory, { recursive: true });
  const database = new DatabaseSync(path.join(dataDirectory, "rescuecast.sqlite"));
  database.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS feedback (
      user_id TEXT PRIMARY KEY,
      value TEXT NOT NULL CHECK(value IN ('helpful', 'unhelpful')),
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS scene_images (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      object_key TEXT NOT NULL UNIQUE,
      file_name TEXT NOT NULL,
      content_type TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
  return database;
}

export function getDatabase() {
  storeGlobal.rescueCastDatabase ??= createDatabase();
  return storeGlobal.rescueCastDatabase;
}

export function getUserSession(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/(?:^|;\s*)rescuecast_user=([^;]+)/);
  if (match?.[1]) return { id: decodeURIComponent(match[1]), setCookie: null };

  const id = crypto.randomUUID();
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return {
    id,
    setCookie: `rescuecast_user=${encodeURIComponent(id)}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${secure}`,
  };
}

export function responseHeaders(setCookie: string | null, extra?: HeadersInit) {
  const headers = new Headers(extra);
  if (setCookie) headers.set("set-cookie", setCookie);
  return headers;
}
