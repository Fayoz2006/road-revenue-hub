import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  prefix?: string;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning';
}

export const MetricCard = ({
  label,
  value,
  prefix = '$',
  icon,
  trend,
  trendValue,
  variant = 'default',
}: MetricCardProps) => {
  const variantStyles = {
    default: 'from-card to-background',
    primary: 'from-primary/10 to-background border-primary/20',
    success: 'from-success/10 to-background border-success/20',
    warning: 'from-warning/10 to-background border-warning/20',
  };

  const valueStyles = {
    default: 'text-foreground',
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div className={`metric-card bg-gradient-to-b ${variantStyles[variant]} animate-fade-in`}>
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <span className="stat-label">{label}</span>
          {icon && <span className="text-muted-foreground">{icon}</span>}
        </div>
        
        <div className={`stat-value ${valueStyles[variant]}`}>
          {prefix}
          {typeof value === 'number' ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value}
        </div>

        {trend && trendValue && (
          <div className="mt-3 flex items-center gap-1.5">
            <TrendIcon className={`h-3.5 w-3.5 ${
              trend === 'up' ? 'text-success' :
              trend === 'down' ? 'text-destructive' :
              'text-muted-foreground'
            }`} />
            <span className="text-xs text-muted-foreground">{trendValue}</span>
          </div>
        )}
      </div>
    </div>
  );
};
