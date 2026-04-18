import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const q = searchParams.get('q')

    const where: any = q ? {
      name: {
        contains: q,
        mode: 'insensitive',
      },
    } : {}

    const foods = await prisma.food.findMany({
      where,
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(foods)
  } catch (error) {
    console.error('Error fetching foods:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      servingSizeG,
      caloriesPerServing,
      proteinG,
      carbsG,
      fatG,
      barcode,
    } = body

    if (!name || servingSizeG === undefined || caloriesPerServing === undefined) {
      return NextResponse.json(
        { error: 'name, servingSizeG, and caloriesPerServing are required' },
        { status: 400 }
      )
    }

    const food = await prisma.food.create({
      data: {
        name,
        servingSizeG,
        caloriesPerServing,
        proteinG: proteinG || 0,
        carbsG: carbsG || 0,
        fatG: fatG || 0,
        barcode,
        isCustom: true,
      },
    })

    return NextResponse.json(food, { status: 201 })
  } catch (error) {
    console.error('Error creating food:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
