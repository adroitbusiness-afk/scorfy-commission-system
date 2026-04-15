export function calculateCommission(semesters: number) {
  let total = 0

  if (semesters >= 1) total += 1500
  if (semesters >= 2) total += 500
  if (semesters >= 3) total += 500
  if (semesters >= 4) total += 500

  return total
}