import { timingSafeEqual } from "node:crypto";
import { createMcpHandler } from "mcp-handler";
import { registerTools } from "@/lib/mcp/tools";

// Compound's MCP server, for Claude.ai custom connectors. The secret in the
// URL is the password: anyone with the full URL can log to Compound, so keep
// it private. A wrong secret gets a plain 404, as if nothing were here.
export const maxDuration = 60;

const handler = createMcpHandler((server) => registerTools(server as unknown as Parameters<typeof registerTools>[0]), {
  serverInfo: { name: "compound", version: "1.0.0" },
});

function authorized(secret: string): boolean {
  const expected = process.env.MCP_SECRET;
  if (!expected || expected.length < 24) return false;
  const a = Buffer.from(secret);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function handle(request: Request, { params }: RouteContext<"/api/mcp/[secret]">) {
  const { secret } = await params;
  if (!authorized(secret)) return new Response("Not found", { status: 404 });
  return handler(request);
}

export { handle as GET, handle as POST, handle as DELETE };
