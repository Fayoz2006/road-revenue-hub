import { useState, useMemo } from 'react';
import { Calendar, DollarSign, TrendingUp, Package, Gift, Wallet } from 'lucide-react';
import { MetricCard } from './MetricCard';
import { Driver, Load, Bonus, SystemState } from '@/types';
import { format, parseISO, startOfMonth, endOfMonth, startOfDay, endOfDay, isWithinInterval, startOfWeek, endOfWeek, addWeeks, isBefore, isAfter } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { DateRange } from 'react-day-picker';

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

// Get weeks (Monday-Sunday) for a given month
const getWeeksInMonth = (monthStr: string) => {
  const monthStart = startOfMonth(parseISO(`${monthStr}-01`));
  const monthEnd = endOfMonth(monthStart);
  
  const weeks: { start: Date; end: Date; label: string }[] = [];
  let currentWeekStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  
  while (isBefore(currentWeekStart, monthEnd) || format(currentWeekStart, 'yyyy-MM') === monthStr) {
    const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    
    // Only include weeks that overlap with the month
    if (isAfter(weekEnd, monthStart) || format(weekEnd, 'yyyy-MM') === monthStr) {
      weeks.push({
        start: currentWeekStart,
        end: weekEnd,
        label: `${format(currentWeekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`,
      });
    }
    
    currentWeekStart = addWeeks(currentWeekStart, 1);
    
    // Stop if we've passed the month
    if (isAfter(currentWeekStart, monthEnd)) break;
  }
  
  return weeks;
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
  
  // Date range for period selection
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Get weeks for current month
  const weeksInMonth = useMemo(() => getWeeksInMonth(selectedMonth), [selectedMonth]);

  // Calculate metrics based on selected range or full month
  const periodMetrics = useMemo(() => {
    let startDate: Date;
    let endDate: Date;
    
    if (dateRange?.from && dateRange?.to) {
      startDate = startOfDay(dateRange.from);
      endDate = endOfDay(dateRange.to);
    } else {
      startDate = startOfMonth(parseISO(`${selectedMonth}-01`));
      endDate = endOfMonth(startDate);
    }
    
    return {
      ...calculateSalary(loads, bonuses, startDate, endDate),
      startDate,
      endDate,
    };
  }, [loads, bonuses, selectedMonth, dateRange]);

  // Chart data for gross per driver (single bar)
  const chartData = useMemo(() => {
    let startDate: Date;
    let endDate: Date;
    
    if (dateRange?.from && dateRange?.to) {
      startDate = startOfDay(dateRange.from);
      endDate = endOfDay(dateRange.to);
    } else {
      startDate = startOfMonth(parseISO(`${selectedMonth}-01`));
      endDate = endOfMonth(startDate);
    }
    
    return drivers.map(driver => {
      const driverLoads = loads.filter(load => {
        const deliveryDate = parseISO(load.delivery_date);
        return load.driver_id === driver.id && isWithinInterval(deliveryDate, { start: startDate, end: endDate });
      });
      
      const totalGross = driverLoads.reduce((sum, l) => sum + Number(l.rate), 0);
      
      return {
        name: driver.driver_name.split(' ')[0],
        fullName: driver.driver_name,
        type: driver.driver_type === 'owner_operator' ? 'OO' : 'CD',
        gross: totalGross,
      };
    }).sort((a, b) => b.gross - a.gross);
  }, [drivers, loads, selectedMonth, dateRange]);

  const periodLabel = dateRange?.from && dateRange?.to
    ? `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d, yyyy')}`
    : format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy');

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header with Date Picker */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Financial Dashboard</h2>
          <p className="text-sm text-muted-foreground">Real-time payroll and revenue overview</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Month Picker */}
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => {
              onMonthChange(e.target.value);
              setDateRange(undefined);
            }}
            className="h-10 rounded-lg border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          
          {/* Period Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 bg-card border-border">
                <Calendar className="h-4 w-4" />
                {dateRange?.from ? periodLabel : 'Select Period'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-card border-border" align="end">
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Quick Select (Week)</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {weeksInMonth.slice(0, 6).map((week, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => setDateRange({ from: week.start, to: week.end })}
                      >
                        {week.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="border-t border-border pt-4">
                  <h4 className="text-sm font-medium mb-2">Custom Range</h4>
                  <CalendarComponent
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={1}
                    weekStartsOn={1}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDateRange(undefined)}
                    className="flex-1"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Period Overview */}
      <div>
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          <span className="hidden sm:inline">{dateRange?.from ? 'Period Overview' : 'Monthly Overview'} - </span>
          {periodLabel}
        </h3>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <MetricCard
            label="Full Loads Gross"
            value={periodMetrics.fullGross}
            icon={<Package className="h-5 w-5" />}
            variant="primary"
          />
          <MetricCard
            label="Partial Loads Gross"
            value={periodMetrics.partialGross}
            icon={<Package className="h-5 w-5" />}
            variant="warning"
          />
          <MetricCard
            label="Total Gross Revenue"
            value={periodMetrics.totalGross}
            icon={<DollarSign className="h-5 w-5" />}
            variant="success"
          />
          <MetricCard
            label="Period Bonuses"
            value={periodMetrics.totalBonuses}
            icon={<Gift className="h-5 w-5" />}
          />
        </div>
      </div>

      {/* Driver Performance Chart - Single bar per driver */}
      {chartData.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Driver Performance - {periodLabel}
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
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Total Gross']}
                  labelFormatter={(label, payload) => {
                    const item = payload?.[0]?.payload;
                    return item ? `${item.fullName} (${item.type})` : label;
                  }}
                />
                <Bar dataKey="gross" name="Total Gross" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
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
              <p className="text-sm text-muted-foreground">Based on ${periodMetrics.fullGross.toLocaleString()} gross</p>
            </div>
            <span className="font-mono text-lg">${periodMetrics.fullLoadCommission.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border/50">
            <div>
              <p className="font-medium">Partial Load Commission (2%)</p>
              <p className="text-sm text-muted-foreground">Based on ${periodMetrics.partialGross.toLocaleString()} gross</p>
            </div>
            <span className="font-mono text-lg">${periodMetrics.partialLoadCommission.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border/50">
            <div>
              <p className="font-medium">Total Bonuses</p>
              <p className="text-sm text-muted-foreground">Automatic + Manual bonuses</p>
            </div>
            <span className="font-mono text-lg">${periodMetrics.totalBonuses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="flex items-center justify-between py-4 bg-primary/10 rounded-lg px-4 -mx-4">
            <div>
              <p className="font-bold text-lg">Total Salary</p>
              <p className="text-sm text-muted-foreground">Commission + Bonuses</p>
            </div>
            <span className="font-mono text-2xl font-bold text-primary">
              ${periodMetrics.totalSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Daily Stats */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-lg font-semibold">Daily Stats</h3>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Calendar className="h-4 w-4" />
                {format(selectedDate, 'MMM d, yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && onDateChange(date)}
                weekStartsOn={1}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            label="Day's Revenue"
            value={calculateSalary(loads, bonuses, startOfDay(selectedDate), endOfDay(selectedDate)).totalGross}
            icon={<DollarSign className="h-5 w-5" />}
          />
          <MetricCard
            label="Day's Commission"
            value={calculateSalary(loads, bonuses, startOfDay(selectedDate), endOfDay(selectedDate)).fullLoadCommission + 
                   calculateSalary(loads, bonuses, startOfDay(selectedDate), endOfDay(selectedDate)).partialLoadCommission}
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <MetricCard
            label="Day's Bonuses"
            value={calculateSalary(loads, bonuses, startOfDay(selectedDate), endOfDay(selectedDate)).totalBonuses}
            icon={<Gift className="h-5 w-5" />}
          />
        </div>
      </div>
    </div>
  );
};