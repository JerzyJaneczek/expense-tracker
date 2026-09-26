/** Tag colours, one per entity. Validated categorical palette (light surface). */
export const TAG_COLORS = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#008300", // green
  "#4a3aa7", // violet
  "#e34948", // red
  "#64748b", // slate
]

export function nextColor(used: string[]) {
  return TAG_COLORS.find((c) => !used.includes(c)) ?? TAG_COLORS[used.length % TAG_COLORS.length]
}

export const DEFAULT_CATEGORIES: { name: string; color: string }[] = [
  { name: "Salary", color: "#008300" },
  { name: "Rent", color: "#2a78d6" },
  { name: "Bills", color: "#eb6834" },
  { name: "Investments", color: "#4a3aa7" },
  { name: "Groceries", color: "#1baf7a" },
  { name: "Transport", color: "#eda100" },
  { name: "Fun", color: "#e87ba4" },
  { name: "Other", color: "#64748b" },
]
