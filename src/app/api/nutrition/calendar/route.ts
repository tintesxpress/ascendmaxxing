import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))

    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 1)

    const meals = await prisma.meal.findMany({
      where: {
        date: { gte: startDate, lt: endDate },
      },
      select: {
        date: true,
        totalCalories: true,
        totalProtein: true,
        totalCarbs: true,
        totalFat: true,
      },
    })

    const settings = await prisma.settings.findUnique({
      where: { id: 'default' },
    })

    const targets = {
      calories: settings?.dailyCalorieTarget ?? 2800,
      protein: settings?.dailyProteinTarget ?? 180,
      carbs: settings?.dailyCarbTarget ?? 350,
      fat: settings?.dailyFatTarget ?? 70,
    }

    // Group by day
    const dayMap: Record<string, { calories: number; protein: number; carbs: number; fat: number }> = {}

    for (const meal of meals) {
      const dayKey = meal.date.toISOString().split('T')[0]
      if (!dayMap[dayKey]) {
        dayMap[dayKey] = { calories: 0, protein: 0, carbs: 0, fat: 0 }
      }
      dayMap[dayKey].calories += meal.totalCalories
      dayMap[dayKey].protein += meal.totalProtein
      dayMap[dayKey].carbs += meal.totalCarbs
      dayMap[dayKey].fat += meal.totalFat
    }

    // Calculate compliance for each day
    const days = Object.entries(dayMap).map(([date, totals]) => {
      const calPct = totals.calories / targets.calories
      const protPct = totals.protein / targets.protein
      // Green: within 90-110% of calorie target AND protein >= 80%
      // Yellow: logged food but off target
      // Red: way over or protein severely lacking
      let status: 'green' | 'yellow' | 'red'
      if (calPct >= 0.85 && calPct <= 1.15 && protPct >= 0.8) {
        status = 'green'
      } else if (calPct > 1.3 || protPct < 0.5) {
        status = 'red'
      } else {
        status = 'yellow'
      }

      return { date, ...totals, status }
    })

    // Streak calculation
    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    for (let i = 0; i < 365; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      const day = dayMap[key]
      if (day && day.calories > 0) {
        streak++
      } else {
        break
      }
    }

    return NextResponse.json({ days, targets, streak, month, year })
  } catch (error) {
    console.error('Error fetching calendar data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
