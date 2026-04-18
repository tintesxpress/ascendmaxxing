import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dateStr = searchParams.get('date')

    if (!dateStr) {
      return NextResponse.json({ error: 'date query param is required' }, { status: 400 })
    }

    const date = new Date(dateStr + 'T00:00:00')

    const meals = await prisma.meal.findMany({
      where: { date },
      include: { food: true },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(meals)
  } catch (error) {
    console.error('Error fetching meals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, mealType, foodId, servings = 1 } = body

    if (!date || !mealType || !foodId) {
      return NextResponse.json(
        { error: 'date, mealType, and foodId are required' },
        { status: 400 }
      )
    }

    const food = await prisma.food.findUnique({ where: { id: foodId } })
    if (!food) {
      return NextResponse.json({ error: 'Food not found' }, { status: 404 })
    }

    const mealDate = new Date(date + 'T00:00:00')
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
