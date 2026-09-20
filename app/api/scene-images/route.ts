import { env } from "cloudflare:workers";

function userId(request: Request) {
  const host = new URL(request.url).hostname;
  return request.headers.get("oai-authenticated-user-id") || (["localhost", "127.0.0.1", "terminal.local"].includes(host) ? "local-preview-user" : null);
}

export async function GET(request: Request) {
  const id = userId(request);
  if (!id) return Response.json({ error: "请先登录" }, { status: 401 });
  const imageId = new URL(request.url).searchParams.get("id");
  if (imageId) {
    const record = await env.DB.prepare("SELECT object_key, content_type FROM scene_images WHERE id = ? AND user_id = ? LIMIT 1").bind(imageId, id).first<{ object_key: string; content_type: string }>();
    if (!record) return new Response("Not found", { status: 404 });
    const object = await env.BUCKET.get(record.object_key);
    if (!object) return new Response("Not found", { status: 404 });
    return new Response(object.body, { headers: { "content-type": record.content_type, "cache-control": "private, max-age=3600" } });
  }
  const records = await env.DB.prepare("SELECT id, file_name, created_at FROM scene_images WHERE user_id = ? ORDER BY created_at DESC LIMIT 4").bind(id).all<{ id: string; file_name: string; created_at: number }>();
  return Response.json({ images: records.results.map((item) => ({ id: item.id, name: item.file_name, url: `/api/scene-images?id=${encodeURIComponent(item.id)}` })) });
}

export async function POST(request: Request) {
  const id = userId(request);
  if (!id) return Response.json({ error: "请先登录" }, { status: 401 });
  const contentType = request.headers.get("content-type")?.split(";")[0] || "";
  if (!contentType.startsWith("image/")) return Response.json({ error: "请选择图片文件" }, { status: 400 });
  const bytes = await request.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > 8 * 1024 * 1024) return Response.json({ error: "仅支持不超过 8MB 的图片" }, { status: 400 });
  const rawName = request.headers.get("x-file-name") || "scene.jpg";
  let fileName = "scene.jpg";
  try { fileName = decodeURIComponent(rawName); } catch { fileName = rawName; }
  const imageId = crypto.randomUUID();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "scene.jpg";
  const key = `scene/${id}/${imageId}-${safeName}`;
  try {
    await env.BUCKET.put(key, bytes, { httpMetadata: { contentType } });
    await env.DB.prepare("INSERT INTO scene_images (id, user_id, object_key, file_name, content_type, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(imageId, id, key, fileName, contentType, Date.now()).run();
  } catch {
    return Response.json({ error: "图片存储服务暂未就绪，请稍后重试" }, { status: 503 });
  }
  return Response.json({ image: { id: imageId, name: fileName, url: `/api/scene-images?id=${encodeURIComponent(imageId)}` } });
}
