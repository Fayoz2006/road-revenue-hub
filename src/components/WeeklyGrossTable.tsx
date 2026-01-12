import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Truck } from 'lucide-react';
import { Driver, Load } from '@/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO, startOfWeek, addWeeks, subWeeks, endOfWeek, addDays, isSameDay } from 'date-fns';

interface WeeklyGrossTableProps {
  drivers: Driver[];
  loads: Load[];
  selectedWeek: string;
  onWeekChange: (week: string) => void;
}

export const WeeklyGrossTable = ({ drivers, loads, selectedWeek, onWeekChange }: WeeklyGrossTableProps) => {
  const weekStart = parseISO(selectedWeek);
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

  const daysOfWeek = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const calculateDailyGross = (driverId: string, date: Date): number => {
    return loads
      .filter(load => {
        const pickupDate = parseISO(load.pickup_date);
        return load.driver_id === driverId && isSameDay(pickupDate, date);
      })
      .reduce((sum, load) => sum + Number(load.rate), 0);
  };

  const calculateWeeklyTotal = (driverId: string): number => {
    return daysOfWeek.reduce((sum, day) => sum + calculateDailyGross(driverId, day), 0);
  };

  const driverData = useMemo(() => {
    return drivers
      .filter(d => d.status === 'active')
      .map(driver => {
        const dailyGross = daysOfWeek.map(day => calculateDailyGross(driver.id, day));
        const weeklyTotal = dailyGross.reduce((a, b) => a + b, 0);
        return {
          driver,
          dailyGross,
          weeklyTotal,
        };
      })
      .sort((a, b) => (a.driver.truck_number || '').localeCompare(b.driver.truck_number || ''));
  }, [drivers, loads, daysOfWeek]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = direction === 'prev' 
      ? subWeeks(weekStart, 1) 
      : addWeeks(weekStart, 1);
    onWeekChange(format(startOfWeek(newWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  };

  const formatCurrency = (amount: number) => {
    if (amount === 0) return '0$';
    return `${amount.toLocaleString()}$`;
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header with Week Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Truck className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Weekly Gross by Driver</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigateWeek('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[180px] text-center">
            {format(weekStart, 'MM-dd-yyyy')} - {format(weekEnd, 'MM-dd-yyyy')}
          </span>
          <Button variant="ghost" size="icon" onClick={() => navigateWeek('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-semibold text-slate-700 whitespace-nowrap min-w-[80px] bg-blue-100/80">Truck №</TableHead>
                <TableHead className="font-semibold text-slate-700 whitespace-nowrap min-w-[150px] bg-blue-100/80">Driver</TableHead>
                <TableHead className="font-semibold text-slate-700 whitespace-nowrap min-w-[100px] bg-blue-100/80 border-r-2 border-slate-300">Weekly total</TableHead>
                <TableHead className="font-semibold text-slate-700 whitespace-nowrap min-w-[90px] bg-amber-50">Monday</TableHead>
                <TableHead className="font-semibold text-slate-700 whitespace-nowrap min-w-[90px] bg-amber-50">Tuesday</TableHead>
                <TableHead className="font-semibold text-slate-700 whitespace-nowrap min-w-[90px] bg-amber-50">Wednesday</TableHead>
                <TableHead className="font-semibold text-slate-700 whitespace-nowrap min-w-[90px] bg-amber-50">Thursday</TableHead>
                <TableHead className="font-semibold text-slate-700 whitespace-nowrap min-w-[90px] bg-amber-50">Friday</TableHead>
                <TableHead className="font-semibold text-slate-700 whitespace-nowrap min-w-[90px] bg-amber-50">Saturday</TableHead>
                <TableHead className="font-semibold text-slate-700 whitespace-nowrap min-w-[90px] bg-amber-50">Sunday</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {driverData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    No active drivers found. Add drivers to see their weekly gross.
                  </TableCell>
                </TableRow>
              ) : (
                driverData.map(({ driver, dailyGross, weeklyTotal }, index) => (
                  <TableRow 
                    key={driver.id} 
                    className="hover:bg-transparent"
                  >
                    <TableCell className={`font-sans font-medium text-slate-800 ${index % 2 === 0 ? 'bg-blue-50/60' : 'bg-blue-50/30'}`}>
                      {driver.truck_number || '-'}
                    </TableCell>
                    <TableCell className={`font-sans font-semibold uppercase text-slate-800 ${index % 2 === 0 ? 'bg-blue-50/60' : 'bg-blue-50/30'}`}>
                      {driver.driver_name}
                    </TableCell>
                    <TableCell className={`font-sans font-bold text-slate-900 border-r-2 border-slate-300 ${index % 2 === 0 ? 'bg-blue-50/60' : 'bg-blue-50/30'}`}>
                      {formatCurrency(weeklyTotal)}
                    </TableCell>
                    {dailyGross.map((amount, dayIndex) => (
                      <TableCell 
                        key={dayIndex} 
                        className={`font-sans text-slate-700 ${amount > 0 ? 'bg-green-100 text-green-800 font-semibold' : index % 2 === 0 ? 'bg-amber-50/40' : 'bg-white'}`}
                      >
                        {formatCurrency(amount)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {driverData.map(({ driver, dailyGross, weeklyTotal }) => (
          <div key={driver.id} className="glass-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground">Truck № </span>
                <span className="font-mono font-medium">{driver.truck_number || '-'}</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted-foreground">Weekly Total</span>
                <p className="font-mono font-bold text-lg">{formatCurrency(weeklyTotal)}</p>
              </div>
            </div>
            <p className="font-semibold uppercase">{driver.driver_name}</p>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                <div key={day} className="space-y-1">
                  <span className="text-muted-foreground">{day}</span>
                  <p className={`font-mono ${dailyGross[i] > 0 ? 'text-warning font-semibold' : ''}`}>
                    {dailyGross[i] > 0 ? `${(dailyGross[i] / 1000).toFixed(1)}k` : '0'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
