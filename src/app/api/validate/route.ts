import { NextRequest, NextResponse } from 'next/server';
import { validateSocialUrl, deepValidateLeadData } from '@/lib/validator';

// POST /api/validate - Validate a URL or batch of data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Single URL validation
    if (body.url) {
      const result = await validateSocialUrl(body.url);
      return NextResponse.json({
        success: true,
        data: result,
      });
    }
    
    // Batch validation of lead data
    if (body.data) {
      const result = await deepValidateLeadData(body.data);
      return NextResponse.json({
        success: true,
        data: result,
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Provide url or data to validate' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { success: false, error: 'Validation failed' },
      { status: 500 }
    );
  }
}
