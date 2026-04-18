import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const daysStr = searchParams.get('days') || '30'
    const days = parseInt(daysStr)

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    const logs = await prisma.bodyWeightLog.findMany({
      where: {
        date: {
          gte: startDate,
        },
      },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json(logs)
  } catch (error) {
    console.error('Error fetching body weight logs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, weight } = body

    if (!date || weight === undefined) {
      return NextResponse.json(
        { error: 'date and weight are required' },
        { status: 400 }
      )
    }

    const logDate = new Date(date + 'T00:00:00')

    const log = await prisma.bodyWeightLog.create({
      data: {
        date: logDate,
        weight,
      },
    })

    return NextResponse.json(log, { status: 201 })
  } catch (error) {
    console.error('Error logging body weight:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
