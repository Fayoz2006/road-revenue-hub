import { useMemo } from 'react';
import { Calendar, DollarSign, TrendingUp, Package, Gift, Wallet } from 'lucide-react';
import { MetricCard } from './MetricCard';
import { AppData } from '@/types';
import { calculateSalary } from '@/lib/storage';
import { format, parseISO, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

interface TeamDashboardProps {
  data: AppData;
  onDateChange: (date: Date) => void;
  onMonthChange: (month: string) => void;
}

export const TeamDashboard = ({ data, onDateChange, onMonthChange }: TeamDashboardProps) => {
  const selectedDate = parseISO(data.systemState.selectedDay);
  const selectedMonth = data.systemState.selectedMonth;

  const monthMetrics = useMemo(() => {
    const monthStart = startOfMonth(parseISO(`${selectedMonth}-01`));
    const monthEnd = endOfMonth(monthStart);
    return calculateSalary(data.loads, data.bonuses, monthStart, monthEnd);
  }, [data.loads, data.bonuses, selectedMonth]);

  const dayMetrics = useMemo(() => {
    const dayStart = startOfDay(selectedDate);
    const dayEnd = endOfDay(selectedDate);
    return calculateSalary(data.loads, data.bonuses, dayStart, dayEnd);
  }, [data.loads, data.bonuses, selectedDate]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header with Date Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Financial Dashboard</h2>
          <p className="text-muted-foreground">Real-time payroll and revenue overview</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Day Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 bg-card border-border">
                <Calendar className="h-4 w-4" />
                {format(selectedDate, 'MMM d, yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-card border-border" align="end">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && onDateChange(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Month Picker */}
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            className="h-10 rounded-lg border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* Monthly Overview */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Monthly Overview - {format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy')}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Full Loads Gross"
            value={monthMetrics.fullGross}
            icon={<Package className="h-5 w-5" />}
            variant="primary"
          />
          <MetricCard
            label="Partial Loads Gross"
            value={monthMetrics.partialGross}
            icon={<Package className="h-5 w-5" />}
            variant="warning"
          />
          <MetricCard
            label="Total Gross Revenue"
            value={monthMetrics.totalGross}
            icon={<DollarSign className="h-5 w-5" />}
            variant="success"
          />
          <MetricCard
            label="Monthly Bonuses"
            value={monthMetrics.totalBonuses}
            icon={<Gift className="h-5 w-5" />}
          />
        </div>
      </div>

      {/* Salary Breakdown */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          Salary Calculation
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-border/50">
            <div>
              <p className="font-medium">Full Load Commission (1%)</p>
              <p className="text-sm text-muted-foreground">Based on ${monthMetrics.fullGross.toLocaleString()} gross</p>
            </div>
            <span className="font-mono text-lg">${monthMetrics.fullLoadCommission.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border/50">
            <div>
              <p className="font-medium">Partial Load Commission (2%)</p>
              <p className="text-sm text-muted-foreground">Based on ${monthMetrics.partialGross.toLocaleString()} gross</p>
            </div>
            <span className="font-mono text-lg">${monthMetrics.partialLoadCommission.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border/50">
            <div>
              <p className="font-medium">Total Bonuses</p>
              <p className="text-sm text-muted-foreground">Automatic + Manual bonuses</p>
            </div>
            <span className="font-mono text-lg">${monthMetrics.totalBonuses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="flex items-center justify-between py-4 bg-primary/10 rounded-lg px-4 -mx-4">
            <div>
              <p className="font-bold text-lg">Total Salary</p>
              <p className="text-sm text-muted-foreground">Commission + Bonuses</p>
            </div>
            <span className="font-mono text-2xl font-bold text-primary">
              ${monthMetrics.totalSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Daily Stats */}
      <div>
        <h3 className="text-lg font-semibold mb-4">
          Daily Stats - {format(selectedDate, 'MMMM d, yyyy')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            label="Day's Revenue"
            value={dayMetrics.totalGross}
            icon={<DollarSign className="h-5 w-5" />}
          />
          <MetricCard
            label="Day's Commission"
            value={dayMetrics.fullLoadCommission + dayMetrics.partialLoadCommission}
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <MetricCard
            label="Day's Bonuses"
            value={dayMetrics.totalBonuses}
            icon={<Gift className="h-5 w-5" />}
          />
        </div>
      </div>
    </div>
  );
};
