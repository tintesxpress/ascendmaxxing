export function classifySet(reps: number): 'strength' | 'hypertrophy_heavy' | 'hypertrophy_moderate' | 'endurance' {
  if (reps <= 5) return 'strength'
  if (reps <= 12) return 'hypertrophy_heavy'
  if (reps <= 20) return 'hypertrophy_moderate'
  return 'endurance'
}

export function setTypeLabel(type: string): string {
  switch (type) {
    case 'strength': return 'STR'
    case 'hypertrophy_heavy': return 'HYP'
    case 'hypertrophy_moderate': return 'MOD'
    case 'endurance': return 'END'
    default: return type
  }
}

export function setTypeColor(type: string): string {
  switch (type) {
    case 'strength': return 'bg-red-500'
    case 'hypertrophy_heavy': return 'bg-blue-500'
    case 'hypertrophy_moderate': return 'bg-green-500'
    case 'endurance': return 'bg-yellow-500'
    default: return 'bg-gray-500'
  }
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function todayDate(): string {
  return new Date().toISOString().split('T')[0]
}

export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
