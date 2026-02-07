import { NextRequest, NextResponse } from 'next/server';
import { getQueryById, updateQuery } from '@/lib/queries';
import { createLead } from '@/lib/leads';
import { crawlQuery, improveQuery, ExtendedCrawlResult } from '@/lib/crawler';
import { SearchTarget, SearchSource } from '@/lib/types';
import { getProjectById } from '@/lib/projects';

type RouteContext = { params: Promise<{ id: string }> };

function hasAnyContact(result: ExtendedCrawlResult): boolean {
  const c = result.contacts;
  return c.emails.length > 0 || c.phones.length > 0 || c.websites.length > 0 ||
         c.whatsapp.length > 0 || c.instagram.length > 0 || c.github.length > 0 ||
         c.twitter.length > 0 || c.linkedin.length > 0 || c.telegram.length > 0 ||
         c.discord.length > 0;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const query = await getQueryById(id);
    
    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Query not found' },
        { status: 404 }
      );
    }
    
    // Get targets and sources from query
    const targets: SearchTarget[] = query.targets || ['emails'];
    const sources: SearchSource[] = query.sources || ['all'];
    
    // Get project context for better results
    const project = await getProjectById(query.projectId);
    const projectContext = project?.context;
    
    // Update status to running
    await updateQuery(id, { status: 'running' });
    
    try {
      // Use improved query if available, otherwise original
      const searchQuery = query.improvedQuery || query.searchTerm;
      
      // Run the crawler with multiple sources
      const results = await crawlQuery(searchQuery, targets, sources, projectContext);
      
      // Create leads from results that have any contact info
      let leadCount = 0;
      for (const result of results) {
        if (hasAnyContact(result)) {
          await createLead({
            queryId: query.id,
            projectId: query.projectId,
            url: result.url,
            title: result.title,
            description: result.description,
            // All contact types
            emails: result.contacts.emails,
            phones: result.contacts.phones,
            websites: result.contacts.websites,
            whatsapp: result.contacts.whatsapp,
            instagram: result.contacts.instagram,
            github: result.contacts.github,
            twitter: result.contacts.twitter,
            linkedin: result.contacts.linkedin,
            telegram: result.contacts.telegram,
            discord: result.contacts.discord,
            source: result.source,
            quality: result.quality,
            tags: result.tags,
            relevanceScore: result.relevanceScore,
          });
          leadCount++;
        }
      }
      
      // Update query with results
      const updatedQuery = await updateQuery(id, {
        status: 'completed',
        lastRun: new Date().toISOString(),
        resultCount: results.length,
      });
      
      return NextResponse.json({
        success: true,
        data: {
          query: updatedQuery,
          totalResults: results.length,
          leadsCreated: leadCount,
          sourcesUsed: sources,
        },
      });
    } catch (crawlError) {
      // Update status to failed
      await updateQuery(id, { status: 'failed' });
      throw crawlError;
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
