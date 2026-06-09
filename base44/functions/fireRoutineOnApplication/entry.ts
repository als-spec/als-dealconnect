import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const application = payload.data || {};

    const response = await fetch(
      'https://api.anthropic.com/v1/claude_code/routines/trig_01FeJKzKmKwFcxAHWExyE9nK/fire',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': Deno.env.get('ROUTINE_API_KEY'),
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          input: {
            application_id: application.id,
            full_name: application.full_name,
            email: application.email,
            member_type: application.member_type,
            company_name: application.company_name,
            state: application.state,
            status: application.status,
            created_date: application.created_date,
          },
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      return Response.json({ error: `Routine fire failed: ${text}` }, { status: 500 });
    }

    const result = await response.json();
    return Response.json({ success: true, result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});