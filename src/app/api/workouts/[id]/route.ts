import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    const workout = await prisma.workout.findUnique({
      where: { id },
      include: {
        template: {
          include: {
            exercises: {
              include: { exercise: true },
              orderBy: { position: 'asc' },
            },
          },
        },
        sets: {
          include: { exercise: true },
          orderBy: [{ exerciseId: 'asc' }, { setNumber: 'asc' }],
        },
      },
    })

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    // Group sets by exercise and structure for the frontend
    const exerciseMap = new Map<string, { exercise: any; sets: any[] }>()

    // First, populate from template exercises (to keep order)
    if (workout.template?.exercises) {
      for (const te of workout.template.exercises) {
        exerciseMap.set(te.exercise.id, {
          exercise: te.exercise,
          sets: [],
        })
      }
    }

    // Then add sets to their exercises (and handle exercises not in template)
    for (const set of workout.sets) {
      if (!exerciseMap.has(set.exerciseId)) {
        exerciseMap.set(set.exerciseId, {
          exercise: set.exercise,
          sets: [],
        })
      }
      exerciseMap.get(set.exerciseId)!.sets.push(set)
    }

    const exercises = Array.from(exerciseMap.values()).map((e, i) => ({
      id: `${workout.id}-${e.exercise.id}`,
      exercise: e.exercise,
      sets: e.sets,
    }))

    return NextResponse.json({
      ...workout,
      exercises,
    })
  } catch (error) {
    console.error('Error fetching workout:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    const workout = await prisma.workout.findUnique({
      where: { id },
    })

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    const endTime = new Date()
    const durationSeconds = Math.floor(
      (endTime.getTime() - workout.startTime.getTime()) / 1000
    )

    const updated = await prisma.workout.update({
      where: { id },
      data: {
        endTime,
        durationSeconds,
      },
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }
    console.error('Error updating workout:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    await prisma.workout.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }
    console.error('Error deleting workout:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
