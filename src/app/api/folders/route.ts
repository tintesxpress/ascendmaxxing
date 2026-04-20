import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const folders = await prisma.folder.findMany({
      orderBy: { position: 'asc' },
      include: {
        templates: {
          orderBy: { position: 'asc' },
          include: {
            exercises: {
              include: { exercise: true },
              orderBy: { position: 'asc' },
            },
            workouts: {
              orderBy: { date: 'desc' },
              take: 1,
              select: { date: true },
            },
          },
        },
      },
    })

    return NextResponse.json(folders)
  } catch (error) {
    console.error('Error fetching folders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name } = body

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const folder = await prisma.folder.create({
      data: { name },
      include: { templates: true },
    })

    return NextResponse.json(folder, { status: 201 })
  } catch (error) {
    console.error('Error creating folder:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
