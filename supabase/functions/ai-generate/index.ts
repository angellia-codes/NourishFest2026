// Ideas AI suggestions — Gemini call, moved out of Code.gs's aiGenerate_().
//
// This exists as an Edge Function rather than a direct browser call for one
// reason: GEMINI_API_KEY must not ship to the client. Deploy with
//   supabase functions deploy ai-generate
//   supabase secrets set GEMINI_API_KEY=<key>
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Overridable with a GEMINI_MODEL secret so the next deprecation is a
// dashboard change, not a code change and redeploy. gemini-2.5-flash — what
// Code.gs used — is closed to new projects and 404s with "no longer available
// to new users", which is how this surfaced.
const GEMINI_TEXT_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.6-flash';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Ported verbatim from Code.gs buildTextPrompt_().
function buildTextPrompt(kind: string, userPrompt: string): string {
  const context = userPrompt
    ? `Context/keywords from the organizer: "${userPrompt}"`
    : 'No specific keywords given — offer fresh, on-brand options.';
  const base =
    'You are helping plan NourishFest 2026, an internal company festival for Nourish Group Indonesia ' +
    `(an F&B/hospitality company). ${context} ` +
    'Return exactly 5 short, distinct suggestions as a JSON array of strings — no numbering, no markdown, no explanations.';
  switch (kind) {
    case 'theme':
      return base + ' Each item is a catchy EVENT THEME name, 3-6 words, vibrant and festival-appropriate.';
    case 'tagline':
      return base + ' Each item is a short TAGLINE, max 8 words, that could sit under the event theme.';
    case 'idea':
      return base + ' Each item is a one-sentence ACTIVITY OR PROGRAM IDEA for the festival (games, performances, booths, etc.).';
    default:
      return base;
  }
}

function fail(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    // Open to any active Committee member. The caller's JWT is forwarded so
    // current_permission() resolves to the signed-in user rather than to the
    // service role.
    const authorization = req.headers.get('Authorization') ?? '';
    if (!authorization) return fail('Not signed in', 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authorization } } },
    );

    const { data: permission, error: permError } = await supabase.rpc('current_permission');
    if (permError) return fail(permError.message, 400);
    if (permission === 'none') return fail('Not an active committee member', 403);

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) return fail('Gemini API key not set. Run: supabase secrets set GEMINI_API_KEY=<key>', 500);

    const { kind, prompt } = await req.json();

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: buildTextPrompt(kind, prompt) }] }],
          generationConfig: {
            temperature: 0.9,
            responseMimeType: 'application/json',
            responseSchema: { type: 'ARRAY', items: { type: 'STRING' } },
          },
        }),
      },
    );

    const rawText = await res.text();
    if (!res.ok) return fail(`Gemini API HTTP Error ${res.status}: ${rawText}`, 502);

    const json = JSON.parse(rawText);
    if (json.error) return fail(`Gemini error: ${json.error.message}`, 502);
    if (!json.candidates?.length) {
      return fail('Gemini returned no candidates (possibly blocked by safety filters).', 502);
    }

    const text = (json.candidates[0].content.parts ?? [])
      .map((p: { text?: string }) => p.text ?? '')
      .join('');

    // The model is asked for a JSON array, but a malformed response should
    // surface as one suggestion rather than a 500 — same fallback as Code.gs.
    let suggestions: string[];
    try {
      suggestions = JSON.parse(text);
    } catch {
      suggestions = [text];
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err), 500);
  }
});
