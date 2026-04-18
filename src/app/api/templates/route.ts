import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { folderId, name, exercises = [] } = body

    if (!folderId || !name) {
      return NextResponse.json(
        { error: 'folderId and name are required' },
        { status: 400 }
      )
    }

    const template = await prisma.template.create({
      data: {
        folderId,
        name,
        exercises: {
          create: exercises.map((ex: any, idx: number) => ({
            exerciseId: ex.exerciseId,
            targetSets: ex.targetSets || 3,
            position: idx,
          })),
        },
      },
      include: {
        exercises: {
          include: { exercise: true },
          orderBy: { position: 'asc' },
        },
      },
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error('Error creating template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
