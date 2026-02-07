import { NextRequest, NextResponse } from 'next/server';
import { getLeadById, updateLead } from '@/lib/leads';
import { getProjectById } from '@/lib/projects';
import { enrichLead as enrichLeadWithPerplexity } from '@/lib/perplexity';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const lead = await getLeadById(id);
    
    if (!lead) {
      return NextResponse.json(
        { success: false, error: 'Lead not found' },
        { status: 404 }
      );
    }
    
    // Get project context
    const project = await getProjectById(lead.projectId);
    const projectContext = project?.context;
    
    // Enrich the lead using Perplexity
    const enrichmentData = await enrichLeadWithPerplexity(
      { url: lead.url, title: lead.title, description: lead.description },
      projectContext
    );
    
    // Enrich ADDS more information - doesn't validate existing
    // Merge new contacts found during enrichment
    const updatedLead = await updateLead(id, {
      enrichedAt: new Date().toISOString(),
      enrichmentData,
      // Add any new contacts found
      emails: [...new Set([...lead.emails, ...(enrichmentData.additionalContacts?.emails || [])])],
      phones: [...new Set([...lead.phones, ...(enrichmentData.additionalContacts?.phones || [])])],
      linkedin: [...new Set([...lead.linkedin, ...(enrichmentData.additionalContacts?.linkedin || [])])],
      twitter: [...new Set([...lead.twitter, ...(enrichmentData.additionalContacts?.twitter || [])])],
      // Update tags and source
      tags: [...new Set([...lead.tags, 'enriched'])],
      sources: [...new Set([...lead.sources, 'enriched'])] as ('brave' | 'perplexity' | 'enriched' | 'manual')[],
      quality: 'high',  // Enriched leads are high quality
    });
    
    return NextResponse.json({
      success: true,
      data: updatedLead,
    });
  } catch (error) {
    console.error('Lead enrichment error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
