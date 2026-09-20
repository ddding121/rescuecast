import { getDatabase, getUserSession, responseHeaders } from "@/lib/server-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function summary(id: string) {
  const database = getDatabase();
  const counts = database.prepare("SELECT value, COUNT(*) AS count FROM feedback GROUP BY value").all() as unknown as Array<{ value: string; count: number }>;
  const mine = database.prepare("SELECT value FROM feedback WHERE user_id = ? LIMIT 1").get(id) as { value: string } | undefined;
  return {
    helpful: Number(counts.find((row) => row.value === "helpful")?.count || 0),
    unhelpful: Number(counts.find((row) => row.value === "unhelpful")?.count || 0),
    myVote: mine?.value || null,
  };
}

export async function GET(request: Request) {
  const session = getUserSession(request);
  return Response.json(await summary(session.id), { headers: responseHeaders(session.setCookie) });
}

export async function POST(request: Request) {
  const session = getUserSession(request);
  const body = await request.json().catch(() => null) as { value?: string } | null;
  const value = body?.value;
  if (value !== "helpful" && value !== "unhelpful") return Response.json({ error: "评价参数无效" }, { status: 400 });
  const database = getDatabase();
  const existing = database.prepare("SELECT value FROM feedback WHERE user_id = ? LIMIT 1").get(session.id);
  if (existing) return Response.json({ error: "每位用户只能评价一次", ...(await summary(session.id)) }, { status: 409, headers: responseHeaders(session.setCookie) });
  database.prepare("INSERT INTO feedback (user_id, value, created_at) VALUES (?, ?, ?)").run(session.id, value, Date.now());
  return Response.json(await summary(session.id), { headers: responseHeaders(session.setCookie) });
}
