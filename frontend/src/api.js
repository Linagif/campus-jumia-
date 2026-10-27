const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api'

export async function apiRequest(path, { token, body, ...options } = {}) {
  const headers = new Headers(options.headers || {})
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (body && !(body instanceof FormData)) headers.set('Content-Type', 'application/json')

  let response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      body: body && !(body instanceof FormData) ? JSON.stringify(body) : body,
    })
  } catch {
    throw new Error('The marketplace API is unavailable. Start the Django server and try again.')
  }

  const payload = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) {
    const firstFieldError = payload && Object.values(payload).flat().find((value) => typeof value === 'string')
    throw new Error(payload?.detail || firstFieldError || 'The request could not be completed.')
  }
  return payload
}

export function apiMediaUrl(path) {
  if (!path) return ''
  try { return new URL(path, API_BASE).href } catch { return path }
}

export function apiResults(payload) {
  return Array.isArray(payload) ? payload : payload?.results || []
}

export function mapApiListing(item) {
  const conditions = { new: 'New', like_new: 'Like New', used_good: 'Used - Good', used_fair: 'Used - Fair' }
  return {
    _api: true,
    id: String(item.id),
    title: item.title,
    price: Number(item.price),
    category: item.category_name,
    condition: item.listing_type === 'service' ? item.availability || 'Service' : conditions[item.condition] || item.condition,
    campus: item.campus_name,
    seller: item.seller?.full_name || 'Campus student',
    posted: 'Recently',
    image: apiMediaUrl(item.images?.[0]?.image) || 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=900&q=85',
    description: item.description,
  }
}
