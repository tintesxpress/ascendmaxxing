import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const { bedtime, wakeTime, quality } = body

    let durationHours: number | undefined

    if (bedtime || wakeTime) {
      const existing = await prisma.sleepLog.findUnique({ where: { id } })
      if (!existing) {
        return NextResponse.json({ error: 'Sleep log not found' }, { status: 404 })
      }

      const bedtimeDate = bedtime ? new Date(bedtime) : existing.bedtime
      const wakeTimeDate = wakeTime ? new Date(wakeTime) : existing.wakeTime
      const durationMs = wakeTimeDate.getTime() - bedtimeDate.getTime()
      durationHours = durationMs / (1000 * 60 * 60)
    }

    const sleepLog = await prisma.sleepLog.update({
      where: { id },
      data: {
        ...(bedtime !== undefined && { bedtime: new Date(bedtime) }),
        ...(wakeTime !== undefined && { wakeTime: new Date(wakeTime) }),
        ...(quality !== undefined && { quality }),
        ...(durationHours !== undefined && { durationHours }),
      },
    })

    return NextResponse.json(sleepLog)
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Sleep log not found' }, { status: 404 })
    }
    console.error('Error updating sleep log:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    await prisma.sleepLog.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Sleep log not found' }, { status: 404 })
    }
    console.error('Error deleting sleep log:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
