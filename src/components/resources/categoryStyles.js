import { Calculator, Headset, Mail, Rocket, Share2, Wrench, Folder } from 'lucide-react'

/** Category icon + color lookups (Tailwind needs literal class names). */
export const categoryIcons = {
  rocket: Rocket,
  mail: Mail,
  headset: Headset,
  share: Share2,
  calculator: Calculator,
  wrench: Wrench,
}

export const categoryColors = {
  navy: { soft: 'bg-navy-50 text-navy-700', gradient: 'from-navy-800 to-navy-600' },
  mint: { soft: 'bg-mint-50 text-mint-700', gradient: 'from-mint-600 to-mint-400' },
  sky: { soft: 'bg-sky-50 text-sky-700', gradient: 'from-sky-700 to-sky-500' },
  rose: { soft: 'bg-rose-50 text-rose-600', gradient: 'from-rose-600 to-rose-400' },
  amber: { soft: 'bg-amber-50 text-amber-700', gradient: 'from-amber-600 to-amber-400' },
  violet: { soft: 'bg-violet-50 text-violet-700', gradient: 'from-violet-700 to-violet-500' },
}

export function getCategoryStyle(category) {
  return {
    Icon: categoryIcons[category?.icon] ?? Folder,
    ...(categoryColors[category?.color] ?? categoryColors.navy),
  }
}
