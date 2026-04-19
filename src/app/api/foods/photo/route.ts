import { NextRequest, NextResponse } from 'next/server'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

export async function POST(request: NextRequest) {
  try {
    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
    }

    const body = await request.json()
    const { image } = body // base64 encoded image

    if (!image) {
      return NextResponse.json({ error: 'image (base64) is required' }, { status: 400 })
    }

    // Strip data URL prefix if present
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '')

    const mediaType = image.startsWith('data:image/png') ? 'image/png' : 'image/jpeg'

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64Data,
                },
              },
              {
                type: 'text',
                text: `Analyze this food photo. Identify each food item visible and estimate the nutritional information per serving.

Return ONLY a valid JSON array (no markdown, no explanation) with this exact format:
[
  {
    "name": "Food name",
    "estimatedWeightG": 150,
    "calories": 250,
    "proteinG": 20,
    "carbsG": 30,
    "fatG": 8,
    "confidence": "high"
  }
]

Rules:
- estimatedWeightG is the visible portion weight in grams
- calories, proteinG, carbsG, fatG are for the visible portion
- confidence is "high", "medium", or "low"
- If you can't identify any food, return an empty array []
- Be as accurate as possible with real nutritional data`,
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      console.error('Claude API error:', response.status, errData)
      return NextResponse.json(
        { error: 'Failed to analyze photo' },
        { status: 502 }
      )
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || '[]'

    // Parse the JSON from Claude's response
    let foods
    try {
      // Try to extract JSON from the response (Claude sometimes wraps in markdown)
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      foods = jsonMatch ? JSON.parse(jsonMatch[0]) : []
    } catch {
      console.error('Failed to parse Claude response:', text)
      foods = []
    }

    return NextResponse.json({ foods })
  } catch (error) {
    console.error('Photo analysis error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
