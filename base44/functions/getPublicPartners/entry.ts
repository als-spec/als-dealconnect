import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Use service role to bypass RLS — this is a public read-only endpoint
    const all = await base44.asServiceRole.entities.Partner.list("-created_date");

    // Only return approved or admin-created partners (no application_status or approved)
    const partners = all.filter((p) => {
      if (p.application_status === "pending" || p.application_status === "rejected") return false;
      if (p.is_active === false) return false;
      return true;
    });

    return Response.json({ partners });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});