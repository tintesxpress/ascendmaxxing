import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dateStr = searchParams.get('date')

    if (!dateStr) {
      return NextResponse.json({ error: 'date query param is required' }, { status: 400 })
    }

    let date: Date
    if (dateStr === 'today') {
      date = new Date()
      date.setHours(0, 0, 0, 0)
    } else {
      date = new Date(dateStr + 'T00:00:00')
    }

    const nextDay = new Date(date)
    nextDay.setDate(nextDay.getDate() + 1)

    const meals = await prisma.meal.findMany({
      where: {
        date: {
          gte: date,
          lt: nextDay,
        },
      },
      include: { food: true },
      orderBy: { createdAt: 'asc' },
    })

    const settings = await prisma.settings.findUnique({
      where: { id: 'default' },
    })

    const totals = {
      calories: meals.reduce((sum, m) => sum + m.totalCalories, 0),
      protein: meals.reduce((sum, m) => sum + m.totalProtein, 0),
      carbs: meals.reduce((sum, m) => sum + m.totalCarbs, 0),
      fat: meals.reduce((sum, m) => sum + m.totalFat, 0),
    }

    return NextResponse.json({
      meals,
      targets: {
        calories: settings?.dailyCalorieTarget ?? 2800,
        protein: settings?.dailyProteinTarget ?? 180,
        carbs: settings?.dailyCarbTarget ?? 350,
        fat: settings?.dailyFatTarget ?? 70,
      },
      totals,
    })
  } catch (error) {
    console.error('Error fetching meals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, mealType, foodId, servings = 1 } = body

    if (!mealType || !foodId) {
      return NextResponse.json(
        { error: 'mealType and foodId are required' },
        { status: 400 }
      )
    }

    const food = await prisma.food.findUnique({ where: { id: foodId } })
    if (!food) {
      return NextResponse.json({ error: 'Food not found' }, { status: 404 })
    }

    let mealDate: Date
    if (!date || date === 'today') {
      mealDate = new Date()
      mealDate.setHours(0, 0, 0, 0)
    } else {
      mealDate = new Date(date + 'T00:00:00')
    }
    const totalCalories = food.caloriesPerServing * servings
    const totalProtein = food.proteinG * servings
    const totalCarbs = food.carbsG * servings
    const totalFat = food.fatG * servings

    const meal = await prisma.meal.create({
      data: {
        date: mealDate,
        mealType,
        foodId,
        servings,
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
      },
      include: { food: true },
    })

    return NextResponse.json(meal, { status: 201 })
  } catch (error) {
    console.error('Error creating meal:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
