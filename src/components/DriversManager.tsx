import { useState, useMemo } from 'react';
import { Plus, User, TrendingUp, Calendar, Pencil, Trash2, Truck, Building2 } from 'lucide-react';
import { Driver, Load, SystemState, getBonusThresholds } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format, parseISO, startOfWeek, addWeeks, subWeeks, endOfWeek, isWithinInterval } from 'date-fns';

interface DriversManagerProps {
  drivers: Driver[];
  loads: Load[];
  systemState: SystemState;
  onAddDriver: (driver: Omit<Driver, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Driver | null>;
  onUpdateDriver: (id: string, updates: Partial<Driver>) => Promise<void>;
  onDeleteDriver: (id: string) => Promise<void>;
  onWeekChange: (week: string) => void;
}

export const DriversManager = ({
  drivers,
  loads,
  systemState,
  onAddDriver,
  onUpdateDriver,
  onDeleteDriver,
  onWeekChange,
}: DriversManagerProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [formData, setFormData] = useState({
    driver_name: '',
    driver_type: 'company_driver' as 'owner_operator' | 'company_driver',
    status: 'active' as 'active' | 'inactive',
  });

  const selectedWeek = parseISO(systemState.selectedWeek);

  const resetForm = () => {
    setFormData({ driver_name: '', driver_type: 'company_driver', status: 'active' });
    setEditingDriver(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDriver) {
      await onUpdateDriver(editingDriver.id, formData);
    } else {
      await onAddDriver(formData);
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setFormData({ 
      driver_name: driver.driver_name, 
      driver_type: driver.driver_type,
      status: driver.status 
    });
    setIsDialogOpen(true);
  };

  const calculateWeeklyGross = (driverId: string, weekStart: Date): number => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    
    return loads
      .filter(load => {
        const deliveryDate = parseISO(load.delivery_date);
        return (
          load.driver_id === driverId &&
          isWithinInterval(deliveryDate, { start: weekStart, end: weekEnd })
        );
      })
      .reduce((sum, load) => sum + Number(load.rate), 0);
  };

  const calculateAutomaticBonus = (weeklyGross: number, driverType: 'owner_operator' | 'company_driver'): number => {
    const thresholds = getBonusThresholds(driverType);
    let bonus = 0;
    const sortedThresholds = Object.keys(thresholds)
      .map(Number)
      .sort((a, b) => b - a);
    
    for (const threshold of sortedThresholds) {
      if (weeklyGross >= threshold) {
        bonus = thresholds[threshold];
        break;
      }
    }
    
    return bonus;
  };

  const getFirstBonusThreshold = (driverType: 'owner_operator' | 'company_driver'): number => {
    const thresholds = getBonusThresholds(driverType);
    return Math.min(...Object.keys(thresholds).map(Number));
  };

  const driverStats = useMemo(() => {
    return drivers.map(driver => {
      const weeklyGross = calculateWeeklyGross(driver.id, selectedWeek);
      const bonusAmount = calculateAutomaticBonus(weeklyGross, driver.driver_type);
      const firstThreshold = getFirstBonusThreshold(driver.driver_type);
      return {
        driver,
        weeklyGross,
        bonusAmount,
        firstThreshold,
      };
    });
  }, [drivers, loads, selectedWeek]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = direction === 'prev' 
      ? subWeeks(selectedWeek, 1) 
      : addWeeks(selectedWeek, 1);
    onWeekChange(format(startOfWeek(newWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Drivers</h2>
          <p className="text-sm text-muted-foreground">Driver performance and weekly stats</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="btn-primary gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Add Driver
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>{editingDriver ? 'Edit Driver' : 'Add New Driver'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Driver Name</label>
                <Input
                  value={formData.driver_name}
                  onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                  placeholder="e.g., John Smith"
                  className="input-dark"
                  required
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Driver Type</label>
                <Select
                  value={formData.driver_type}
                  onValueChange={(value: 'owner_operator' | 'company_driver') => 
                    setFormData({ ...formData, driver_type: value })
                  }
                >
                  <SelectTrigger className="input-dark">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="company_driver">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Company Driver
                      </div>
                    </SelectItem>
                    <SelectItem value="owner_operator">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        Owner Operator
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={formData.status}
                  onValueChange={(value: 'active' | 'inactive') => 
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger className="input-dark">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="btn-primary">
                  {editingDriver ? 'Update Driver' : 'Add Driver'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Week Picker */}
      <div className="glass-card p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary hidden sm:block" />
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Selected Week</p>
              <p className="text-sm sm:text-base font-semibold">
                Week of {format(selectedWeek, 'MMM d, yyyy')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')} className="flex-1 sm:flex-none">
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onWeekChange(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'))}
              className="flex-1 sm:flex-none"
            >
              This Week
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateWeek('next')} className="flex-1 sm:flex-none">
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Driver Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {driverStats.map(({ driver, weeklyGross, bonusAmount, firstThreshold }) => (
          <div
            key={driver.id}
            className="glass-card p-6 hover:border-primary/30 transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
                  driver.driver_type === 'owner_operator' ? 'bg-warning/10' : 'bg-primary/10'
                }`}>
                  {driver.driver_type === 'owner_operator' ? (
                    <Truck className={`h-6 w-6 text-warning`} />
                  ) : (
                    <Building2 className={`h-6 w-6 text-primary`} />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold">{driver.driver_name}</h3>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${
                      driver.driver_type === 'owner_operator' ? 'text-warning' : 'text-primary'
                    }`}>
                      {driver.driver_type === 'owner_operator' ? 'Owner Operator' : 'Company Driver'}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      driver.status === 'active'
                        ? 'bg-success/20 text-success'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {driver.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(driver)}
                  className="h-8 w-8"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDeleteDriver(driver.id)}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Weekly Gross</span>
                </div>
                <span className="font-mono font-bold text-xl">
                  ${weeklyGross.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between py-3 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Weekly Bonus</span>
                </div>
                <span className={`font-mono font-bold text-lg ${
                  bonusAmount > 0 ? 'text-primary' : 'text-muted-foreground'
                }`}>
                  {bonusAmount > 0 ? `$${bonusAmount}` : '-'}
                </span>
              </div>

              {weeklyGross > 0 && weeklyGross < firstThreshold && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">
                    ${(firstThreshold - weeklyGross).toLocaleString()} more to reach first bonus tier
                  </p>
                  <div className="mt-2 h-2 bg-background rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        driver.driver_type === 'owner_operator' ? 'bg-warning/50' : 'bg-primary/50'
                      }`}
                      style={{ width: `${Math.min((weeklyGross / firstThreshold) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {drivers.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No drivers yet. Add your first driver to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};
