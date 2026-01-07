import { useMemo } from 'react';
import { Calendar, DollarSign, TrendingUp, Package, Gift, Wallet } from 'lucide-react';
import { MetricCard } from './MetricCard';
import { Driver, Load, Bonus, SystemState } from '@/types';
import { format, parseISO, startOfMonth, endOfMonth, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface TeamDashboardProps {
  drivers: Driver[];
  loads: Load[];
  bonuses: Bonus[];
  systemState: SystemState;
  onDateChange: (date: Date) => void;
  onMonthChange: (month: string) => void;
}

const calculateSalary = (
  loads: Load[],
  bonuses: Bonus[],
  startDate: Date,
  endDate: Date
) => {
  const filteredLoads = loads.filter(load => {
    const deliveryDate = parseISO(load.delivery_date);
    return isWithinInterval(deliveryDate, { start: startDate, end: endDate });
  });

  const fullLoads = filteredLoads.filter(l => l.load_type === 'FULL');
  const partialLoads = filteredLoads.filter(l => l.load_type === 'PARTIAL');

  const fullGross = fullLoads.reduce((sum, l) => sum + Number(l.rate), 0);
  const partialGross = partialLoads.reduce((sum, l) => sum + Number(l.rate), 0);
  const totalGross = fullGross + partialGross;

  const fullLoadCommission = fullGross * 0.01;
  const partialLoadCommission = partialGross * 0.02;

  const filteredBonuses = bonuses.filter(bonus => {
    const bonusDate = parseISO(bonus.date);
    return isWithinInterval(bonusDate, { start: startDate, end: endDate });
  });

  const totalBonuses = filteredBonuses.reduce((sum, b) => sum + Number(b.amount), 0);
  const totalSalary = fullLoadCommission + partialLoadCommission + totalBonuses;

  return {
    fullLoadCommission,
    partialLoadCommission,
    totalBonuses,
    totalSalary,
    fullGross,
    partialGross,
    totalGross,
  };
};

export const TeamDashboard = ({ 
  drivers, 
  loads, 
  bonuses, 
  systemState, 
  onDateChange, 
  onMonthChange 
}: TeamDashboardProps) => {
  const selectedDate = parseISO(systemState.selectedDay);
  const selectedMonth = systemState.selectedMonth;

  const monthMetrics = useMemo(() => {
    const monthStart = startOfMonth(parseISO(`${selectedMonth}-01`));
    const monthEnd = endOfMonth(monthStart);
    return calculateSalary(loads, bonuses, monthStart, monthEnd);
  }, [loads, bonuses, selectedMonth]);

  const dayMetrics = useMemo(() => {
    const dayStart = startOfDay(selectedDate);
    const dayEnd = endOfDay(selectedDate);
    return calculateSalary(loads, bonuses, dayStart, dayEnd);
  }, [loads, bonuses, selectedDate]);

  // Chart data for weekly gross per driver
  const chartData = useMemo(() => {
    const monthStart = startOfMonth(parseISO(`${selectedMonth}-01`));
    const monthEnd = endOfMonth(monthStart);
    
    return drivers.map(driver => {
      const driverLoads = loads.filter(load => {
        const deliveryDate = parseISO(load.delivery_date);
        return load.driver_id === driver.id && isWithinInterval(deliveryDate, { start: monthStart, end: monthEnd });
      });
      
      const fullGross = driverLoads.filter(l => l.load_type === 'FULL').reduce((sum, l) => sum + Number(l.rate), 0);
      const partialGross = driverLoads.filter(l => l.load_type === 'PARTIAL').reduce((sum, l) => sum + Number(l.rate), 0);
      
      return {
        name: driver.driver_name.split(' ')[0],
        fullName: driver.driver_name,
        type: driver.driver_type === 'owner_operator' ? 'OO' : 'CD',
        fullGross,
        partialGross,
        total: fullGross + partialGross,
      };
    }).sort((a, b) => b.total - a.total);
  }, [drivers, loads, selectedMonth]);

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

      {/* Driver Performance Chart */}
      {chartData.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Driver Performance - {format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy')}
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number, name: string) => [`$${value.toLocaleString()}`, name === 'fullGross' ? 'Full Loads' : 'Partial Loads']}
                  labelFormatter={(label, payload) => {
                    const item = payload?.[0]?.payload;
                    return item ? `${item.fullName} (${item.type})` : label;
                  }}
                />
                <Legend />
                <Bar dataKey="fullGross" name="Full Loads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="partialGross" name="Partial Loads" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

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
