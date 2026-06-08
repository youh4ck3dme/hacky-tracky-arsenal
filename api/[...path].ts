/**
 * Vercel serverless proxy: forwards /api/* to BACKEND_URL (lab backend via tunnel).
 * Set BACKEND_URL + ARSENAL_API_TOKEN in Vercel project env.
 */
export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request): Promise<Response> {
  const backend = process.env.BACKEND_URL?.replace(/\/$/, '');
  if (!backend) {
    return Response.json(
      {
        error: 'BACKEND_URL not configured',
        hint: 'Set BACKEND_URL in Vercel env to your lab backend (e.g. ngrok tunnel to :3847)',
      },
      { status: 503 },
    );
  }

  const incoming = new URL(request.url);
  const target = `${backend}${incoming.pathname}${incoming.search}`;
  const headers = new Headers(request.headers);
  headers.delete('host');

  const init: RequestInit = {
    method: request.method,
    headers,
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
  }

  try {
    const upstream = await fetch(target, init);
    const outHeaders = new Headers(upstream.headers);
    outHeaders.delete('content-encoding');
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: outHeaders,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upstream fetch failed';
    return Response.json({ error: message }, { status: 502 });
  }
}
