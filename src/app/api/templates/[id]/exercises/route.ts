import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const { exerciseId, targetSets = 3 } = body

    if (!exerciseId) {
      return NextResponse.json({ error: 'exerciseId is required' }, { status: 400 })
    }

    const maxPosition = await prisma.templateExercise.findMany({
      where: { templateId: id },
      orderBy: { position: 'desc' },
      take: 1,
    })

    const nextPosition = maxPosition.length > 0 ? maxPosition[0].position + 1 : 0

    const templateExercise = await prisma.templateExercise.create({
      data: {
        templateId: id,
        exerciseId,
        targetSets,
        position: nextPosition,
      },
      include: { exercise: true },
    })

    return NextResponse.json(templateExercise, { status: 201 })
  } catch (error) {
    console.error('Error adding exercise to template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const { exercises } = body

    if (!Array.isArray(exercises)) {
      return NextResponse.json(
        { error: 'exercises must be an array' },
        { status: 400 }
      )
    }

    await Promise.all(
      exercises.map((ex: any, idx: number) =>
        prisma.templateExercise.update({
          where: { id: ex.id },
          data: { position: idx },
        })
      )
    )

    const updated = await prisma.templateExercise.findMany({
      where: { templateId: id },
      include: { exercise: true },
      orderBy: { position: 'asc' },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error reordering exercises:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
