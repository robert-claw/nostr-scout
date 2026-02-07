import { ContactInfo, SearchTarget } from './types';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

interface PerplexityResponse {
  id: string;
  model: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
}

interface StructuredLead {
  url: string;
  title: string;
  description: string;
  contacts: {
    emails: string[];
    phones: string[];
    websites: string[];
    whatsapp: string[];
    instagram: string[];
    github: string[];
    twitter: string[];
    linkedin: string[];
    telegram: string[];
    discord: string[];
  };
  relevanceScore: number;
  tags: string[];
}

export async function searchPerplexity(
  query: string,
  targets: SearchTarget[],
  projectContext?: string
): Promise<StructuredLead[]> {
  if (!PERPLEXITY_API_KEY) {
    console.warn('PERPLEXITY_API_KEY not configured');
    return [];
  }

  const targetDescription = targets.map(t => {
    switch (t) {
      case 'emails': return 'email addresses';
      case 'phones': return 'phone numbers';
      case 'websites': return 'website URLs';
      case 'whatsapp': return 'WhatsApp numbers';
      case 'instagram': return 'Instagram handles';
      case 'github': return 'GitHub profiles';
      case 'twitter': return 'Twitter/X handles';
      case 'linkedin': return 'LinkedIn profiles';
      case 'telegram': return 'Telegram handles';
      case 'discord': return 'Discord servers';
      default: return t;
    }
  }).join(', ');

  const contextInstructions = projectContext 
    ? `\n\nContext for filtering results: ${projectContext}` 
    : '';

  const systemPrompt = `You are a lead generation research assistant. Search for relevant companies/people and return structured data.
Return ONLY valid JSON, no markdown or explanations. 
${contextInstructions}

Return an array of leads in this exact format:
[
  {
    "url": "https://example.com",
    "title": "Company/Person Name",
    "description": "Brief description of what they do",
    "contacts": {
      "emails": ["email@example.com"],
      "phones": ["+1234567890"],
      "websites": ["https://example.com"],
      "whatsapp": [],
      "instagram": ["handle"],
      "github": ["username"],
      "twitter": ["handle"],
      "linkedin": ["profile-slug"],
      "telegram": [],
      "discord": []
    },
    "relevanceScore": 85,
    "tags": ["startup", "ai", "b2b"]
  }
]`;

  const userPrompt = `Search for: "${query}"

Find companies/people matching this query and extract their contact information.
Focus on finding: ${targetDescription}

Return up to 10 relevant leads as a JSON array. Include relevance scores (0-100) based on how well they match the search intent.`;

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      return [];
    }

    const data: PerplexityResponse = await response.json();
    const content = data.choices[0]?.message?.content || '[]';

    // Parse JSON from response (handle potential markdown wrapping)
    let jsonContent = content;
    if (content.includes('```json')) {
      jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (content.includes('```')) {
      jsonContent = content.replace(/```\n?/g, '');
    }

    try {
      const leads: StructuredLead[] = JSON.parse(jsonContent.trim());
      return leads.filter(lead => lead.url && lead.title);
    } catch (parseError) {
      console.error('Failed to parse Perplexity response:', parseError);
      console.error('Content was:', content.substring(0, 500));
      return [];
    }
  } catch (error) {
    console.error('Perplexity search error:', error);
    return [];
  }
}

export async function improveQuery(
  query: string,
  projectContext?: string,
  targets?: SearchTarget[]
): Promise<string> {
  if (!PERPLEXITY_API_KEY) {
    return query;
  }

  const targetInfo = targets?.length 
    ? `Looking for: ${targets.join(', ')}` 
    : '';

  const contextInfo = projectContext
    ? `Business context: ${projectContext}`
    : '';

  try {
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
            content: 'You are a search query optimizer. Improve the given search query to find better lead generation results. Return ONLY the improved query, nothing else.',
          },
          {
            role: 'user',
            content: `Original query: "${query}"
${contextInfo}
${targetInfo}

Improve this query to be more effective for finding business leads with contact information. Keep it concise but comprehensive.`,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      return query;
    }

    const data: PerplexityResponse = await response.json();
    const improved = data.choices[0]?.message?.content?.trim();
    return improved || query;
  } catch {
    return query;
  }
}

export async function enrichLead(
  lead: { url: string; title: string; description?: string },
  projectContext?: string
): Promise<{
  companyInfo?: string;
  industry?: string;
  size?: string;
  funding?: string;
  techStack?: string[];
  keyPeople?: { name: string; role: string; contact?: string }[];
  additionalContacts?: {
    emails: string[];
    phones: string[];
    linkedin: string[];
    twitter: string[];
  };
}> {
  if (!PERPLEXITY_API_KEY) {
    return {};
  }

  const contextInfo = projectContext
    ? `\nRelevance context: ${projectContext}`
    : '';

  try {
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
            content: `You are a business intelligence researcher. Research the given company/entity and return detailed information.
Return ONLY valid JSON, no markdown or explanations.${contextInfo}`,
          },
          {
            role: 'user',
            content: `Research this company/entity:
Name: ${lead.title}
URL: ${lead.url}
${lead.description ? `Description: ${lead.description}` : ''}

Return JSON with this structure:
{
  "companyInfo": "Brief company description",
  "industry": "Primary industry",
  "size": "Employee count range (e.g., 10-50)",
  "funding": "Funding status if known",
  "techStack": ["technology1", "technology2"],
  "keyPeople": [{"name": "John Doe", "role": "CEO", "contact": "email or linkedin"}],
  "additionalContacts": {
    "emails": [],
    "phones": [],
    "linkedin": [],
    "twitter": []
  }
}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      return {};
    }

    const data: PerplexityResponse = await response.json();
    let content = data.choices[0]?.message?.content || '{}';

    // Parse JSON
    if (content.includes('```json')) {
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (content.includes('```')) {
      content = content.replace(/```\n?/g, '');
    }

    return JSON.parse(content.trim());
  } catch (error) {
    console.error('Lead enrichment error:', error);
    return {};
  }
}
