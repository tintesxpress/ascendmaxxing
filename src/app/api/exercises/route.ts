import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const q = searchParams.get('q')
    const muscle = searchParams.get('muscle')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}
    if (q) {
      where.name = {
        contains: q,
        mode: 'insensitive',
      }
    }
    if (muscle) {
      where.OR = [
        { primaryMuscle: { contains: muscle, mode: 'insensitive' } },
        { secondaryMuscles: { hasSome: [muscle] } },
      ]
    }

    const [exercises, total] = await Promise.all([
      prisma.exercise.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { name: 'asc' },
      }),
      prisma.exercise.count({ where }),
    ])

    return NextResponse.json({
      exercises,
      pagination: {
        total,
        limit,
        offset,
      },
    })
  } catch (error) {
    console.error('Error fetching exercises:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      primaryMuscle,
      secondaryMuscles = [],
      equipment,
      category,
      instructions,
      gifUrl,
    } = body

    if (!name || !primaryMuscle) {
      return NextResponse.json(
        { error: 'name and primaryMuscle are required' },
        { status: 400 }
      )
    }

    const exercise = await prisma.exercise.create({
      data: {
        name,
        primaryMuscle,
        secondaryMuscles,
        equipment,
        category,
        instructions,
        gifUrl,
        isCustom: true,
      },
    })

    return NextResponse.json(exercise, { status: 201 })
  } catch (error) {
    console.error('Error creating exercise:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
