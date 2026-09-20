import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getDatabase, getUserSession, responseHeaders, uploadDirectory } from "@/lib/server-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = getUserSession(request);
  const imageId = new URL(request.url).searchParams.get("id");
  if (imageId) {
    const record = getDatabase().prepare("SELECT object_key, content_type FROM scene_images WHERE id = ? AND user_id = ? LIMIT 1").get(imageId, session.id) as { object_key: string; content_type: string } | undefined;
    if (!record) return new Response("Not found", { status: 404 });
    try {
      const bytes = await readFile(path.join(uploadDirectory, path.basename(record.object_key)));
      return new Response(new Uint8Array(bytes), { headers: responseHeaders(session.setCookie, { "content-type": record.content_type, "cache-control": "private, max-age=3600" }) });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  }
  const records = getDatabase().prepare("SELECT id, file_name, created_at FROM scene_images WHERE user_id = ? ORDER BY created_at DESC LIMIT 4").all(session.id) as unknown as Array<{ id: string; file_name: string; created_at: number }>;
  return Response.json({ images: records.map((item) => ({ id: item.id, name: item.file_name, url: `/api/scene-images?id=${encodeURIComponent(item.id)}` })) }, { headers: responseHeaders(session.setCookie) });
}

export async function POST(request: Request) {
  const session = getUserSession(request);
  const contentType = request.headers.get("content-type")?.split(";")[0] || "";
  if (!contentType.startsWith("image/")) return Response.json({ error: "请选择图片文件" }, { status: 400 });
  const bytes = await request.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > 8 * 1024 * 1024) return Response.json({ error: "仅支持不超过 8MB 的图片" }, { status: 400 });
  const rawName = request.headers.get("x-file-name") || "scene.jpg";
  let fileName = "scene.jpg";
  try { fileName = decodeURIComponent(rawName); } catch { fileName = rawName; }
  const imageId = crypto.randomUUID();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "scene.jpg";
  const key = `${imageId}-${safeName}`;
  try {
    await writeFile(path.join(uploadDirectory, key), new Uint8Array(bytes));
    getDatabase().prepare("INSERT INTO scene_images (id, user_id, object_key, file_name, content_type, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(imageId, session.id, key, fileName, contentType, Date.now());
  } catch {
    return Response.json({ error: "图片存储服务暂未就绪，请稍后重试" }, { status: 503 });
  }
  return Response.json({ image: { id: imageId, name: fileName, url: `/api/scene-images?id=${encodeURIComponent(imageId)}` } }, { headers: responseHeaders(session.setCookie) });
}
