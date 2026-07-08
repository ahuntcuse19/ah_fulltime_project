const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

export function formatMoney(amount: number): string {
  return money.format(amount)
}

export function formatAsOfDate(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function pctToGoal(raised: number, goal: number): number {
  if (goal <= 0) return 0
  return Math.min(100, Math.round((raised / goal) * 100))
}
