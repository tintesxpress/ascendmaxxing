const OFF_API = 'https://world.openfoodfacts.org'

export interface OFFProduct {
  code: string
  product_name: string
  brands?: string
  serving_size?: string
  nutriments: {
    'energy-kcal_100g'?: number
    'energy-kcal_serving'?: number
    proteins_100g?: number
    proteins_serving?: number
    carbohydrates_100g?: number
    carbohydrates_serving?: number
    fat_100g?: number
    fat_serving?: number
    fiber_100g?: number
    fiber_serving?: number
    sugars_100g?: number
    sodium_100g?: number
  }
  serving_quantity?: number
  image_front_small_url?: string
  image_front_url?: string
}

export interface NormalizedFood {
  name: string
  brand: string | null
  barcode: string | null
  servingSizeG: number
  caloriesPerServing: number
  proteinG: number
  carbsG: number
  fatG: number
  fiberG: number
  sugarG: number
  sodiumMg: number
  imageUrl: string | null
  source: 'openfoodfacts' | 'local'
}

function normalizeProduct(product: OFFProduct): NormalizedFood {
  const n = product.nutriments
  const servingG = product.serving_quantity || 100

  // Prefer per-serving data, fall back to per-100g scaled
  const useServing = n['energy-kcal_serving'] !== undefined
  const scale = useServing ? 1 : servingG / 100

  return {
    name: product.product_name || 'Unknown Product',
    brand: product.brands || null,
    barcode: product.code || null,
    servingSizeG: servingG,
    caloriesPerServing: Math.round(
      useServing ? (n['energy-kcal_serving'] || 0) : (n['energy-kcal_100g'] || 0) * scale
    ),
    proteinG: Math.round(
      (useServing ? (n.proteins_serving || 0) : (n.proteins_100g || 0) * scale) * 10
    ) / 10,
    carbsG: Math.round(
      (useServing ? (n.carbohydrates_serving || 0) : (n.carbohydrates_100g || 0) * scale) * 10
    ) / 10,
    fatG: Math.round(
      (useServing ? (n.fat_serving || 0) : (n.fat_100g || 0) * scale) * 10
    ) / 10,
    fiberG: Math.round((n.fiber_100g || 0) * scale * 10) / 10,
    sugarG: Math.round((n.sugars_100g || 0) * scale * 10) / 10,
    sodiumMg: Math.round((n.sodium_100g || 0) * scale * 1000),
    imageUrl: product.image_front_small_url || product.image_front_url || null,
    source: 'openfoodfacts',
  }
}

export async function searchFoods(query: string, page = 1): Promise<{
  products: NormalizedFood[]
  count: number
}> {
  try {
    const url = `${OFF_API}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=20&page=${page}&fields=code,product_name,brands,nutriments,serving_size,serving_quantity,image_front_small_url`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ASCENDING-FitnessTracker/1.0' },
    })

    if (!res.ok) return { products: [], count: 0 }

    const data = await res.json()
    const products = (data.products || [])
      .filter((p: OFFProduct) => p.product_name && p.nutriments)
      .map(normalizeProduct)

    return { products, count: data.count || 0 }
  } catch (error) {
    console.error('OpenFoodFacts search error:', error)
    return { products: [], count: 0 }
  }
}

export async function lookupBarcode(barcode: string): Promise<NormalizedFood | null> {
  try {
    const res = await fetch(`${OFF_API}/api/v2/product/${barcode}?fields=code,product_name,brands,nutriments,serving_size,serving_quantity,image_front_small_url`, {
      headers: { 'User-Agent': 'ASCENDING-FitnessTracker/1.0' },
    })

    if (!res.ok) return null

    const data = await res.json()
    if (data.status !== 1 || !data.product) return null

    return normalizeProduct(data.product)
  } catch (error) {
    console.error('OpenFoodFacts barcode error:', error)
    return null
  }
    }
