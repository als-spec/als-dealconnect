import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const deal = body.deal || {};
    const tcProfile = body.tcProfile || {};
    const message = body.message || '';

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are an expert at matching Transaction Coordinators (TCs) to real estate deals in the creative finance space. Evaluate this TC's fit for the deal and return a match score (0-100) and a 1-2 sentence rationale.

DEAL: Title: ${deal.title}, Type: ${deal.deal_type}, Property: ${deal.property_type}, Stage: ${deal.deal_stage}, State: ${deal.state}, Description: ${deal.description}

TC PROFILE: Specialties: ${(tcProfile.specialties || []).join(', ')}, Years Experience: ${tcProfile.years_experience}, Deals Closed: ${tcProfile.deals_closed}, Geographic Coverage: ${tcProfile.geographic_coverage}, Rating: ${tcProfile.average_rating}, Bio: ${tcProfile.bio}

TC MESSAGE: "${message}"

Evaluate specialty alignment, experience, geography, and message quality. Return JSON with score (integer 0-100) and rationale (1-2 sentences).`,
      response_json_schema: {
        type: "object",
        properties: {
          score: { type: "number" },
          rationale: { type: "string" }
        }
      }
    });

    return Response.json({ score: Math.round(result.score), rationale: result.rationale });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});