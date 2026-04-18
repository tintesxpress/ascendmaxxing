import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const daysStr = searchParams.get('days') || '7'
    const days = parseInt(daysStr)

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    const sleepLogs = await prisma.sleepLog.findMany({
      where: {
        date: {
          gte: startDate,
        },
      },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json(sleepLogs)
  } catch (error) {
    console.error('Error fetching sleep logs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, bedtime, wakeTime, quality } = body

    if (!date || !bedtime || !wakeTime || quality === undefined) {
      return NextResponse.json(
        { error: 'date, bedtime, wakeTime, and quality are required' },
        { status: 400 }
      )
    }

    const bedtimeDate = new Date(bedtime)
    const wakeTimeDate = new Date(wakeTime)
    const durationMs = wakeTimeDate.getTime() - bedtimeDate.getTime()
    const durationHours = durationMs / (1000 * 60 * 60)

    const sleepDate = new Date(date + 'T00:00:00')

    const sleepLog = await prisma.sleepLog.create({
      data: {
        date: sleepDate,
        bedtime: bedtimeDate,
        wakeTime: wakeTimeDate,
        durationHours,
        quality,
      },
    })

    return NextResponse.json(sleepLog, { status: 201 })
  } catch (error) {
    console.error('Error creating sleep log:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
