import { NextRequest, NextResponse } from 'next/server'
import { lookupBarcode } from '@/lib/openfoodfacts'

export async function GET(request: NextRequest) {
  try {
    const barcode = request.nextUrl.searchParams.get('code')
    if (!barcode) {
      return NextResponse.json({ error: 'code query param is required' }, { status: 400 })
    }

    const product = await lookupBarcode(barcode)
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('Barcode scan error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
