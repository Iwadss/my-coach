// supabase.functions.invoke() sends a custom Authorization header, which
// makes it a non-simple request — the browser preflights with an OPTIONS
// request first. Every function that's called from the frontend (not
// stripe-webhook, which Stripe calls directly with no browser involved)
// needs to answer that preflight and echo these headers on the real
// response, or the browser call fails even though curl works fine.

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}
