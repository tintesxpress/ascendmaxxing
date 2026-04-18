import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { classifySet } from '@/lib/utils'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    const sets = await prisma.set.findMany({
      where: { workoutId: id },
      include: { exercise: true },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(sets)
  } catch (error) {
    console.error('Error fetching sets:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const { weight, reps, rir, exerciseId, restSeconds } = body

    if (weight === undefined || !reps || !exerciseId) {
      return NextResponse.json(
        { error: 'weight, reps, and exerciseId are required' },
        { status: 400 }
      )
    }

    const setType = classifySet(reps)

    const existingSets = await prisma.set.findMany({
      where: {
        workoutId: id,
        exerciseId,
      },
      orderBy: { setNumber: 'desc' },
      take: 1,
    })

    const setNumber = existingSets.length > 0 ? existingSets[0].setNumber + 1 : 1

    const newSet = await prisma.set.create({
      data: {
        workoutId: id,
        exerciseId,
        setNumber,
        weight,
        reps,
        rir: rir || null,
        setType,
        restSeconds: restSeconds || null,
      },
      include: { exercise: true },
    })

    return NextResponse.json(newSet, { status: 201 })
  } catch (error) {
    console.error('Error logging set:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
