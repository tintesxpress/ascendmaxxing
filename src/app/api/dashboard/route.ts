import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type Status = 'green' | 'yellow' | 'red'

interface DayStatus {
  sleep: Status
  nutrition: Status
  training: Status
  recovery: Status
}

function getSleepStatus(hours: number | null, goal: number): Status {
  if (hours === null) return 'red'
  if (hours >= goal - 0.5) return 'green'
  if (hours >= 6) return 'yellow'
  return 'red'
}

function getNutritionStatus(
  calories: number | null,
  protein: number | null,
  calorieTarget: number,
  proteinTarget: number
): Status {
  if (calories === null || protein === null) return 'red'

  const calInRange = Math.abs(calories - calorieTarget) <= 100
  const proteinGood = protein >= proteinTarget * 0.9

  if (calInRange && proteinGood) return 'green'
  if (calInRange || proteinGood) return 'yellow'
  return 'red'
}

function getTrainingStatus(
  workoutLogged: boolean,
  workoutStarted: boolean,
  isRestDay: boolean
): Status {
  if (isRestDay) return 'green'
  if (workoutLogged) return 'green'
  if (workoutStarted) return 'yellow'
  return 'red'
}

async function getDayNutrition(date: Date, settings: any) {
  const dayStart = new Date(date)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(date)
  dayEnd.setHours(23, 59, 59, 999)

  const meals = await prisma.meal.findMany({
    where: {
      date: {
        gte: dayStart,
        lte: dayEnd,
      },
    },
  })

  const totalCalories = meals.reduce((sum, m) => sum + m.totalCalories, 0)
  const totalProtein = meals.reduce((sum, m) => sum + m.totalProtein, 0)

  return {
    calories: totalCalories,
    protein: totalProtein,
  }
}

async function getDaySleep(date: Date, goal: number) {
  const dayStart = new Date(date)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(date)
  dayEnd.setHours(23, 59, 59, 999)

  const sleep = await prisma.sleepLog.findFirst({
    where: {
      date: {
        gte: dayStart,
        lte: dayEnd,
      },
    },
  })

  return {
    hours: sleep?.durationHours || null,
    status: getSleepStatus(sleep?.durationHours || null, goal),
  }
}

async function getDayWorkout(date: Date, templateId?: string) {
  const dayStart = new Date(date)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(date)
  dayEnd.setHours(23, 59, 59, 999)

  const workout = await prisma.workout.findFirst({
    where: {
      date: {
        gte: dayStart,
        lte: dayEnd,
      },
    },
  })

  const isComplete = workout !== null && workout.endTime !== null
  const isStarted = workout !== null

  return {
    completed: isComplete,
    started: isStarted,
  }
}

async function getMissedDaysCount(): Promise<number> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let consecutiveMissed = 0
  let currentDate = new Date(today)

  while (consecutiveMissed < 7) {
    const dayStart = new Date(currentDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(currentDate)
    dayEnd.setHours(23, 59, 59, 999)

    const workout = await prisma.workout.findFirst({
      where: {
        date: {
          gte: dayStart,
          lte: dayEnd,
        },
        endTime: { not: null },
      },
    })

    if (workout) {
      break
    }

    consecutiveMissed++
    currentDate.setDate(currentDate.getDate() - 1)
  }

  return consecutiveMissed
}

export async function GET(request: NextRequest) {
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: 'default' },
    })

    if (!settings) {
      const newSettings = await prisma.settings.create({
        data: { id: 'default' },
      })
      return NextResponse.json({
        sleepStatus: 'red',
        nutritionStatus: 'red',
        trainingStatus: 'red',
        recoveryStatus: 'red',
        history: [],
        streak: 0,
        latestWeight: null,
        weightTrend: null,
        settings: newSettings,
      })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const lastSevenDays = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      lastSevenDays.push(date)
    }

    const history: (DayStatus & { date: string })[] = []

    for (const date of lastSevenDays) {
      const nutrition = await getDayNutrition(date, settings)
      const sleep = await getDaySleep(date, settings.sleepGoalHours)
      const workout = await getDayWorkout(date)

      const nutritionStatus = getNutritionStatus(
        nutrition.calories,
        nutrition.protein,
        settings.dailyCalorieTarget,
        settings.dailyProteinTarget
      )

      const trainingStatus = getTrainingStatus(
        workout.completed,
        workout.started,
        false
      )

      history.push({
        date: date.toISOString().split('T')[0],
        sleep: sleep.status,
        nutrition: nutritionStatus,
        training: trainingStatus,
        recovery: 'green',
      })
    }

    const todayStatus = history[history.length - 1]

    let streak = 0
    for (let i = history.length - 1; i >= 0; i--) {
      const day = history[i]
      if (day.sleep === 'green' && day.nutrition === 'green' && day.training === 'green' && day.recovery === 'green') {
        streak++
      } else {
        break
      }
    }

    const greenDaysInLast3 = history
      .slice(-3)
      .filter((d) => d.sleep === 'green').length
    const recoveryStatus =
      greenDaysInLast3 >= 3
        ? 'green'
        : greenDaysInLast3 >= 1
          ? 'yellow'
          : 'red'

    const latestWeight = await prisma.bodyWeightLog.findFirst({
      orderBy: { date: 'desc' },
      take: 1,
    })

    let weightTrend: 'up' | 'down' | 'stable' | null = null
    if (latestWeight) {
      const sevenDaysAgo = new Date(today)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      sevenDaysAgo.setHours(0, 0, 0, 0)

      const oldWeight = await prisma.bodyWeightLog.findFirst({
        where: {
          date: {
            gte: sevenDaysAgo,
          },
        },
        orderBy: { date: 'asc' },
      })

      if (oldWeight) {
        const diff = latestWeight.weight - oldWeight.weight
        if (Math.abs(diff) < 2) {
          weightTrend = 'stable'
        } else if (diff > 0) {
          weightTrend = 'up'
        } else {
          weightTrend = 'down'
        }
      }
    }

    return NextResponse.json({
      sleepStatus: todayStatus.sleep,
      nutritionStatus: todayStatus.nutrition,
      trainingStatus: todayStatus.training,
      recoveryStatus,
      history,
      streak,
      latestWeight: latestWeight
        ? {
            weight: latestWeight.weight,
            date: latestWeight.date.toISOString().split('T')[0],
          }
        : null,
      weightTrend,
      settings,
    })
  } catch (error) {
    console.error('Error fetching dashboard:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
