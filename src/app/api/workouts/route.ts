import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dateStr = searchParams.get('date')
    const limitStr = searchParams.get('limit')

    const where: any = {}
    if (dateStr) {
      const date = new Date(dateStr + 'T00:00:00')
      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)

      where.date = {
        gte: date,
        lt: nextDate,
      }
    }

    // Only include workouts that have been finished (have durationSeconds)
    // or filter all if no limit
    const workouts = await prisma.workout.findMany({
      where,
      include: {
        template: true,
        sets: {
          include: { exercise: true },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { startTime: 'desc' },
      ...(limitStr ? { take: parseInt(limitStr) } : {}),
    })

    return NextResponse.json(workouts)
  } catch (error) {
    console.error('Error fetching workouts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { templateId } = body

    const now = new Date()

    const workout = await prisma.workout.create({
      data: {
        templateId: templateId || undefined,
        date: now,
        startTime: now,
      },
      include: {
        template: true,
        sets: true,
      },
    })

    return NextResponse.json(workout, { status: 201 })
  } catch (error) {
    console.error('Error creating workout:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
