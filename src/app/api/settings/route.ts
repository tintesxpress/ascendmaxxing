import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    let settings = await prisma.settings.findUnique({
      where: { id: 'default' },
    })

    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          id: 'default',
          dailyCalorieTarget: 2800,
          dailyProteinTarget: 180,
          dailyCarbTarget: 350,
          dailyFatTarget: 70,
          sleepGoalHours: 8,
        },
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      dailyCalorieTarget,
      dailyProteinTarget,
      dailyCarbTarget,
      dailyFatTarget,
      bodyweightLbs,
      heightCm,
      sleepGoalHours,
    } = body

    const settings = await prisma.settings.update({
      where: { id: 'default' },
      data: {
        ...(dailyCalorieTarget !== undefined && { dailyCalorieTarget }),
        ...(dailyProteinTarget !== undefined && { dailyProteinTarget }),
        ...(dailyCarbTarget !== undefined && { dailyCarbTarget }),
        ...(dailyFatTarget !== undefined && { dailyFatTarget }),
        ...(bodyweightLbs !== undefined && { bodyweightLbs }),
        ...(heightCm !== undefined && { heightCm }),
        ...(sleepGoalHours !== undefined && { sleepGoalHours }),
      },
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
