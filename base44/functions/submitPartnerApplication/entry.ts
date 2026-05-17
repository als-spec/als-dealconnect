import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { company_name, category, description, website_url, contact_name, contact_email, contact_phone } = body;

    if (!company_name || !contact_name || !contact_email) {
      return Response.json({ error: "Company name, contact name, and email are required." }, { status: 400 });
    }

    // Use service role so unauthenticated visitors can submit applications
    await base44.asServiceRole.entities.Partner.create({
      company_name,
      category: category || "Other",
      description: description || "",
      website_url: website_url || "",
      contact_name,
      contact_email,
      contact_phone: contact_phone || "",
      is_active: false,
      application_status: "pending",
      tier: "preferred",
      logo_color: "#1432c8",
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});