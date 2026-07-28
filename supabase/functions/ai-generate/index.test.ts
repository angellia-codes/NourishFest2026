// Gate test: any active Committee member may generate; only 'none' is refused.
//   npx --yes deno@2 test --allow-env --allow-net supabase/functions/ai-generate/index.test.ts
//
// GEMINI_API_KEY is deliberately unset, so a caller that gets *past* the gate
// fails at the key check instead. That's what distinguishes "allowed" (500,
// missing key) from "refused" (403) without a live Gemini call.
Deno.env.set('SUPABASE_URL', 'http://stub.local');
Deno.env.set('SUPABASE_ANON_KEY', 'stub-anon-key');
Deno.env.delete('GEMINI_API_KEY');

let permission = 'none';

globalThis.fetch = ((input: string | URL | Request) => {
  const url = input instanceof Request ? input.url : String(input);
  const body = url.endsWith('/rest/v1/rpc/current_permission') ? JSON.stringify(permission) : '{}';
  return Promise.resolve(new Response(body, { headers: { 'Content-Type': 'application/json' } }));
}) as typeof fetch;

// index.ts calls Deno.serve at import time; capture the handler rather than
// binding a port.
let handler!: (req: Request) => Promise<Response>;
(Deno as unknown as { serve: unknown }).serve = (h: typeof handler) => {
  handler = h;
  return { finished: Promise.resolve() };
};

await import('./index.ts');

const call = (auth = 'Bearer stub-jwt') =>
  handler(
    new Request('http://localhost/ai-generate', {
      method: 'POST',
      headers: auth ? { Authorization: auth } : {},
      body: JSON.stringify({ kind: 'idea', prompt: '' }),
    }),
  );

const eq = (actual: unknown, expected: unknown) => {
  if (actual !== expected) throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
};

for (const role of ['Admin', 'Advisor', 'Member']) {
  Deno.test(`${role} passes the gate`, async () => {
    permission = role;
    const res = await call();
    const { error } = await res.json();
    eq(res.status, 500);
    eq(error.startsWith('Gemini API key not set'), true);
  });
}

Deno.test("permission 'none' is refused", async () => {
  permission = 'none';
  const res = await call();
  const { error } = await res.json();
  eq(res.status, 403);
  eq(error, 'Not an active committee member');
});

Deno.test('a request with no Authorization header is refused', async () => {
  permission = 'Admin';
  const res = await call('');
  eq(res.status, 401);
});
