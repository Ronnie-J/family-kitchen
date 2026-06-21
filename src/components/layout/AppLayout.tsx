'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Package, CalendarDays, ShoppingCart, Clock, Settings } from 'lucide-react'

const NAV = [
  { href: '/lager', label: 'Lager', icon: Package },
  { href: '/plan', label: 'Planlæg', icon: CalendarDays },
  { href: '/indkob', label: 'Indkøb', icon: ShoppingCart },
  { href: '/historik', label: 'Historik', icon: Clock },
  { href: '/indstillinger', label: 'Indstillinger', icon: Settings },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname()

  return (
    <div className="flex h-screen overflow-hidden bg-stone-50">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-stone-200 shrink-0">
        <div className="p-5 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍳</span>
            <span className="font-bold text-lg text-stone-800">FamilyKitchen</span>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = path.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-orange-50 text-orange-600'
                    : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 safe-bottom z-50">
        <div className="flex">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = path.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-[10px] font-medium transition-colors ${
                  active ? 'text-orange-500' : 'text-stone-400'
                }`}
              >
                <Icon size={20} />
                <span>{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
