'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Search,
  ListChecks,
  ShoppingCart,
  ArrowRightLeft,
  ClipboardList,
  KanbanSquare,
  Package,
  Users,
  Tag,
  Settings,
  Upload,
  BarChart3,
  ChevronLeft,
  ShoppingBag,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { UserRole } from '@/types/app'
import { ScrollArea } from '@/components/ui/scroll-area'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  roles: UserRole[]
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['comprador', 'cadastro', 'gerente'],
  },
  {
    label: 'Análise de SKU',
    href: '/sku',
    icon: Search,
    roles: ['comprador', 'gerente'],
  },
  {
    label: 'Análise em Lote',
    href: '/analise-lote',
    icon: ListChecks,
    roles: ['comprador', 'gerente'],
  },
  {
    label: 'Sugestão de Compra',
    href: '/compras',
    icon: ShoppingCart,
    roles: ['comprador', 'gerente'],
  },
  {
    label: 'Transferências CD→Lojas',
    href: '/transferencias',
    icon: ArrowRightLeft,
    roles: ['comprador', 'gerente'],
  },
  {
    label: 'Pedidos',
    href: '/pedidos',
    icon: ClipboardList,
    roles: ['comprador', 'gerente'],
  },
  {
    label: 'Tarefas',
    href: '/tarefas',
    icon: KanbanSquare,
    roles: ['comprador', 'cadastro', 'gerente'],
  },
  {
    label: 'Produtos',
    href: '/cadastros/produtos',
    icon: Package,
    roles: ['cadastro', 'gerente'],
  },
  {
    label: 'Fornecedores',
    href: '/cadastros/fornecedores',
    icon: Users,
    roles: ['cadastro', 'gerente'],
  },
  {
    label: 'Classificações',
    href: '/cadastros/classificacoes',
    icon: Tag,
    roles: ['cadastro', 'gerente'],
  },
  {
    label: 'Parâmetros',
    href: '/cadastros/parametros',
    icon: Settings,
    roles: ['gerente'],
  },
  {
    label: 'Importação',
    href: '/importacao',
    icon: Upload,
    roles: ['cadastro', 'gerente'],
  },
  {
    label: 'Relatórios',
    href: '/relatorios',
    icon: BarChart3,
    roles: ['gerente'],
  },
]

interface SidebarProps {
  role: UserRole
  collapsed?: boolean
  onToggle?: () => void
}

export function Sidebar({ role, collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const visibleItems = navItems.filter((item) => item.roles.includes(role))

  return (
    <aside
      className={cn(
        'flex flex-col border-r bg-white transition-all duration-300 h-screen sticky top-0',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center gap-3 p-4 border-b', collapsed && 'justify-center')}>
        <div className="bg-colibri-600 text-white rounded-lg p-1.5 flex-shrink-0">
          <ShoppingBag className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-sm font-bold text-colibri-900 leading-none">Colibri</p>
            <p className="text-xs text-muted-foreground">Compras</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-0.5">
          {visibleItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-colibri-50 text-colibri-700 font-medium'
                    : 'text-muted-foreground hover:bg-gray-50 hover:text-foreground',
                  collapsed && 'justify-center px-2'
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      {/* Collapse toggle */}
      <div className="p-2 border-t">
        <button
          onClick={onToggle}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-gray-50 hover:text-foreground w-full transition-colors',
            collapsed && 'justify-center'
          )}
        >
          <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
          {!collapsed && <span>Recolher</span>}
        </button>
      </div>
    </aside>
  )
}
