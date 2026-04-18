import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    const template = await prisma.template.findUnique({
      where: { id },
      include: {
        exercises: {
          include: { exercise: true },
          orderBy: { position: 'asc' },
        },
      },
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error('Error fetching template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const { name } = body

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const template = await prisma.template.update({
      where: { id },
      data: { name },
      include: {
        exercises: {
          include: { exercise: true },
          orderBy: { position: 'asc' },
        },
      },
    })

    return NextResponse.json(template)
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }
    console.error('Error updating template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    await prisma.template.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }
    console.error('Error deleting template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
