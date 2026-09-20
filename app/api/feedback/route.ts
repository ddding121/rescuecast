import { env } from "cloudflare:workers";

function userId(request: Request) {
  const host = new URL(request.url).hostname;
  return request.headers.get("oai-authenticated-user-id") || (["localhost", "127.0.0.1", "terminal.local"].includes(host) ? "local-preview-user" : null);
}

async function summary(id: string) {
  const counts = await env.DB.prepare("SELECT value, COUNT(*) AS count FROM feedback GROUP BY value").all<{ value: string; count: number }>();
  const mine = await env.DB.prepare("SELECT value FROM feedback WHERE user_id = ? LIMIT 1").bind(id).first<{ value: string }>();
  return {
    helpful: Number(counts.results.find((row) => row.value === "helpful")?.count || 0),
    unhelpful: Number(counts.results.find((row) => row.value === "unhelpful")?.count || 0),
    myVote: mine?.value || null,
  };
}

export async function GET(request: Request) {
  const id = userId(request);
  if (!id) return Response.json({ error: "请先登录后评价" }, { status: 401 });
  return Response.json(await summary(id));
}

export async function POST(request: Request) {
  const id = userId(request);
  if (!id) return Response.json({ error: "请先登录后评价" }, { status: 401 });
  const body = await request.json().catch(() => null) as { value?: string } | null;
  if (!body || !["helpful", "unhelpful"].includes(body.value || "")) return Response.json({ error: "评价参数无效" }, { status: 400 });
  const existing = await env.DB.prepare("SELECT value FROM feedback WHERE user_id = ? LIMIT 1").bind(id).first<{ value: string }>();
  if (existing) return Response.json({ error: "每个账号只能评价一次", ...(await summary(id)) }, { status: 409 });
  await env.DB.prepare("INSERT INTO feedback (user_id, value, created_at) VALUES (?, ?, ?)").bind(id, body.value, Date.now()).run();
  return Response.json(await summary(id));
}
