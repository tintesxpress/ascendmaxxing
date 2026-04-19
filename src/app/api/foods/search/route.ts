import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { searchFoods as searchOFF } from '@/lib/openfoodfacts'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const q = searchParams.get('q')

    if (!q || !q.trim()) {
      return NextResponse.json({ local: [], openfoodfacts: [] })
    }

    const [localFoods, offResults] = await Promise.all([
      prisma.food.findMany({
        where: {
          name: { contains: q, mode: 'insensitive' },
        },
        take: 10,
        orderBy: { name: 'asc' },
      }),
      searchOFF(q).catch(() => ({ products: [], count: 0 })),
    ])

    return NextResponse.json({
      local: localFoods.map((f) => ({ ...f, source: 'local' as const })),
      openfoodfacts: offResults.products,
      query: q,
    })
  } catch (error) {
    console.error('Error searching foods:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
