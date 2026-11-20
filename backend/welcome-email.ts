// =====================================================================
// NANCYFLIX — Supabase Edge Function: welcome-email
// Sends the welcome email after registration using a provider (Resend shown).
// Deploy:  supabase functions deploy welcome-email
// Secrets (NEVER in index.html):
//   supabase secrets set RESEND_API_KEY=xxxxx FROM_EMAIL="NANCYFLIX <hello@yourdomain>"
// The frontend POSTs { email, name } and shows the REAL status it returns.
// =====================================================================
import { serve } from "https://deno.land/std@0.203.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const { email, name } = await req.json();
    if (!email) return json({ error: "email required" }, 400);

    const KEY = Deno.env.get("RESEND_API_KEY");
    const FROM = Deno.env.get("FROM_EMAIL") ?? "NANCYFLIX <onboarding@resend.dev>";
    // Honest behavior: if the provider is not configured, say so — do not fake success.
    if (!KEY) return json({ sent: false, reason: "email_not_configured" }, 200);

    const first = (name || "there").split(" ")[0];
    const html = `
      <div style="font-family:Inter,Arial,sans-serif;background:#06060a;color:#f5f5fa;padding:32px;border-radius:16px">
        <h1 style="color:#e11d2e;letter-spacing:2px">NANCYFLIX</h1>
        <p style="color:#9a9aae">EVERY STORY DESERVES A SCREEN</p>
        <h2>Welcome, ${escapeHtml(first)} 🎬</h2>
        <p>Thanks for joining NANCYFLIX by Dev Brian Studios. Your account is ready —
           dive in and discover what’s trending this week.</p>
        <p style="color:#9a9aae;font-size:13px">If you didn’t create this account, you can ignore this email.</p>
      </div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: email, subject: "Welcome to NANCYFLIX 🎬", html }),
    });
    if (!res.ok) return json({ sent: false, reason: await res.text() }, 502);
    return json({ sent: true }, 200);
  } catch (e) {
    return json({ sent: false, reason: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
