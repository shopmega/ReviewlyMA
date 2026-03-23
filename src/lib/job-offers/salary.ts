export function sanitizeSalaryValue(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return value;
}

export function normalizeSalaryRange(
  salaryMin: number | null | undefined,
  salaryMax: number | null | undefined
) {
  return {
    salaryMin: sanitizeSalaryValue(salaryMin),
    salaryMax: sanitizeSalaryValue(salaryMax),
  };
}

export function hasUsableSalary(
  salaryMin: number | null | undefined,
  salaryMax: number | null | undefined
) {
  const normalized = normalizeSalaryRange(salaryMin, salaryMax);
  return normalized.salaryMin != null || normalized.salaryMax != null;
}
