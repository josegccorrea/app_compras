import { cn } from '@/lib/utils/cn'
import { Card } from '@/components/ui/card'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon: LucideIcon
  variant?: 'default' | 'danger' | 'warning' | 'success' | 'info'
  href?: string
}

const variantStyles = {
  default: 'bg-white border',
  danger: 'bg-red-50 border-red-100',
  warning: 'bg-yellow-50 border-yellow-100',
  success: 'bg-green-50 border-green-100',
  info: 'bg-blue-50 border-blue-100',
}

const iconStyles = {
  default: 'bg-gray-100 text-gray-600',
  danger: 'bg-red-100 text-red-600',
  warning: 'bg-yellow-100 text-yellow-700',
  success: 'bg-green-100 text-green-700',
  info: 'bg-blue-100 text-blue-700',
}

export function StatCard({ title, value, description, icon: Icon, variant = 'default' }: StatCardProps) {
  return (
    <Card className={cn('p-5', variantStyles[variant])}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        </div>
        <div className={cn('p-2 rounded-lg', iconStyles[variant])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  )
}
