'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Upload,
  PackageSearch,
  TrendingUp,
  BarChart2,
  Search,
  PieChart,
  Globe,
  GitCompareArrows,
  History,
  ChevronDown,
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/upload', label: 'Upload', icon: Upload },
  { href: '/reposicao', label: 'Reposição', icon: PackageSearch },
  {
    label: 'Análise de Vendas',
    icon: TrendingUp,
    children: [
      { href: '/vendas/por-loja', label: 'Por Loja', icon: BarChart2 },
      { href: '/vendas/comparativo', label: 'Comparativo', icon: GitCompareArrows },
      { href: '/vendas/sku', label: 'Por SKU', icon: Search },
      { href: '/vendas/mix', label: 'Mix', icon: PieChart },
      { href: '/vendas/consolidado', label: 'Consolidado', icon: Globe },
      { href: '/vendas/yoy', label: 'Ano a Ano', icon: TrendingUp },
    ],
  },
  { href: '/historico', label: 'Histórico', icon: History },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [vendasOpen, setVendasOpen] = useState(
    pathname.startsWith('/vendas')
  )

  return (
    <aside className="w-56 shrink-0 bg-[var(--c-primary-dark)] text-white flex flex-col min-h-screen">
      <div className="px-4 py-5 border-b border-white/10">
        <span className="text-xs font-semibold uppercase tracking-widest text-white/50">
          Colibri
        </span>
        <p className="text-sm font-semibold mt-0.5">Reposição PicPic</p>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          if ('children' in item) {
            return (
              <div key={item.label}>
                <button
                  onClick={() => setVendasOpen(!vendasOpen)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <item.icon size={16} />
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform ${vendasOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {vendasOpen && (
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l border-white/10 pl-2">
                    {item.children!.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          pathname === child.href
                            ? 'bg-white/20 text-white font-medium'
                            : 'text-white/60 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <child.icon size={14} />
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                pathname === item.href
                  ? 'bg-white/20 text-white font-medium'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
