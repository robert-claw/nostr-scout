import { NextRequest, NextResponse } from 'next/server';
import { getDirectoryEntity, saveDirectoryEntity } from '@/lib/directory';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/directory/entities/[id]/enrich - Enrich entity with contact info
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const entity = getDirectoryEntity(id);

    if (!entity) {
      return NextResponse.json(
        { success: false, error: 'Entity not found' },
        { status: 404 }
      );
    }

    if (!PERPLEXITY_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Perplexity API not configured' },
        { status: 500 }
      );
    }

    // Build search prompt based on entity type
    const searchContext = entity.type === 'person'
      ? `${entity.name}${entity.company ? ` at ${entity.company}` : ''}${entity.title ? `, ${entity.title}` : ''}`
      : entity.type === 'organization'
      ? `${entity.name} company${entity.industry ? ` in ${entity.industry}` : ''}`
      : `${entity.name}`;

    const prompt = `Find contact information and social media profiles for: ${searchContext}

Return a JSON object with these fields (only include fields you can verify):
{
  "website": "official website URL",
  "email": "public contact email",
  "twitter": "Twitter/X handle without @",
  "linkedin": "LinkedIn profile URL slug",
  "github": "GitHub username",
  "instagram": "Instagram handle",
  "youtube": "YouTube channel",
  "phone": "public phone number",
  "address": "headquarters or office address",
  "bio": "brief updated bio (1-2 sentences)",
  "founded": "year founded (for organizations)",
  "size": "company size (for organizations)",
  "funding": "funding information if known"
}

Only return verified, current information. Return ONLY the JSON object, no other text.`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are a research assistant finding verified contact information. Return only valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';

    // Parse the enrichment data
    let enrichment: Record<string, string> = {};
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        enrichment = JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.error('Failed to parse enrichment:', content);
    }

    // Update entity with enrichment data
    const updatedEntity = saveDirectoryEntity({
      ...entity,
      website: enrichment.website || entity.website,
      email: enrichment.email || entity.email,
      twitter: enrichment.twitter || entity.twitter,
      linkedin: enrichment.linkedin || entity.linkedin,
      description: enrichment.bio || entity.description,
      founded: enrichment.founded || entity.founded,
      size: enrichment.size || entity.size,
      // Store additional data in tags
      tags: [
        ...new Set([
          ...(entity.tags || []),
          'enriched',
          ...(enrichment.github ? [`github:${enrichment.github}`] : []),
          ...(enrichment.instagram ? [`ig:${enrichment.instagram}`] : []),
          ...(enrichment.youtube ? [`yt:${enrichment.youtube}`] : []),
          ...(enrichment.phone ? [`phone:${enrichment.phone}`] : []),
          ...(enrichment.funding ? [`funding:${enrichment.funding}`] : []),
        ])
      ],
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      data: updatedEntity,
      enrichment,
    });
  } catch (error) {
    console.error('Enrichment error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Enrichment failed' },
      { status: 500 }
    );
  }
}
