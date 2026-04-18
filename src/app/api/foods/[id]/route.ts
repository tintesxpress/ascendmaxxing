import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const {
      name,
      servingSizeG,
      caloriesPerServing,
      proteinG,
      carbsG,
      fatG,
      barcode,
    } = body

    const food = await prisma.food.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(servingSizeG !== undefined && { servingSizeG }),
        ...(caloriesPerServing !== undefined && { caloriesPerServing }),
        ...(proteinG !== undefined && { proteinG }),
        ...(carbsG !== undefined && { carbsG }),
        ...(fatG !== undefined && { fatG }),
        ...(barcode !== undefined && { barcode }),
      },
    })

    return NextResponse.json(food)
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Food not found' }, { status: 404 })
    }
    console.error('Error updating food:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    await prisma.food.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Food not found' }, { status: 404 })
    }
    console.error('Error deleting food:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
