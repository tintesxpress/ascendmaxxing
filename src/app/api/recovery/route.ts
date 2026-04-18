import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const todaySleep = await prisma.sleepLog.findFirst({
      where: {
        date: { gte: today, lt: tomorrow },
      },
    })

    const recentSleep = await prisma.sleepLog.findMany({
      where: {
        date: { gte: sevenDaysAgo, lt: tomorrow },
      },
      orderBy: { date: 'desc' },
      take: 7,
    })

    const todayWeight = await prisma.bodyWeightLog.findFirst({
      where: {
        date: { gte: today, lt: tomorrow },
      },
    })

    const recentWeight = await prisma.bodyWeightLog.findMany({
      orderBy: { date: 'desc' },
      take: 14,
    })

    return NextResponse.json({
      sleep: {
        today: todaySleep
          ? {
              id: todaySleep.id,
              date: todaySleep.date.toISOString().split('T')[0],
              durationHours: todaySleep.durationHours,
              quality: todaySleep.quality,
            }
          : null,
        logs: recentSleep.map((s) => ({
          id: s.id,
          date: s.date.toISOString().split('T')[0],
          durationHours: s.durationHours,
          quality: s.quality,
        })),
      },
      bodyweight: {
        today: todayWeight
          ? {
              id: todayWeight.id,
              date: todayWeight.date.toISOString().split('T')[0],
              weight: todayWeight.weight,
            }
          : null,
        logs: recentWeight.map((w) => ({
          id: w.id,
          date: w.date.toISOString().split('T')[0],
          weight: w.weight,
        })),
      },
    })
  } catch (error) {
    console.error('Error fetching recovery data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
