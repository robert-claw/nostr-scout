import { NextRequest, NextResponse } from 'next/server';
import { getQueryById, updateQuery } from '@/lib/queries';
import { createLead } from '@/lib/leads';
import { crawlQuery } from '@/lib/crawler';

type RouteContext = { params: Promise<{ id: string }> };

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
    
    // Update status to running
    await updateQuery(id, { status: 'running' });
    
    try {
      // Run the crawler
      const results = await crawlQuery(query.searchTerm);
      
      // Create leads from results
      let leadCount = 0;
      for (const result of results) {
        if (result.emails.length > 0) {
          await createLead({
            queryId: query.id,
            projectId: query.projectId,
            url: result.url,
            title: result.title,
            description: result.description,
            emails: result.emails,
            source: 'brave',
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
