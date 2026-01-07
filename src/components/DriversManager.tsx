import { useState, useMemo } from 'react';
import { Plus, User, TrendingUp, Calendar, Pencil, Trash2 } from 'lucide-react';
import { AppData, Driver } from '@/types';
import { calculateWeeklyGross, calculateAutomaticBonus } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format, parseISO, startOfWeek, addWeeks, subWeeks } from 'date-fns';

interface DriversManagerProps {
  data: AppData;
  onAddDriver: (driver: Omit<Driver, 'driverId' | 'createdAt'>) => Driver;
  onUpdateDriver: (driverId: string, updates: Partial<Driver>) => void;
  onDeleteDriver: (driverId: string) => void;
  onWeekChange: (week: string) => void;
}

export const DriversManager = ({
  data,
  onAddDriver,
  onUpdateDriver,
  onDeleteDriver,
  onWeekChange,
}: DriversManagerProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [formData, setFormData] = useState({
    driverName: '',
    status: 'active' as 'active' | 'inactive',
  });

  const selectedWeek = parseISO(data.systemState.selectedWeek);

  const resetForm = () => {
    setFormData({ driverName: '', status: 'active' });
    setEditingDriver(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDriver) {
      onUpdateDriver(editingDriver.driverId, formData);
    } else {
      onAddDriver(formData);
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setFormData({ driverName: driver.driverName, status: driver.status });
    setIsDialogOpen(true);
  };

  const driverStats = useMemo(() => {
    return data.drivers.map(driver => {
      const weeklyGross = calculateWeeklyGross(data.loads, driver.driverId, selectedWeek);
      const bonusAmount = calculateAutomaticBonus(weeklyGross);
      return {
        driver,
        weeklyGross,
        bonusAmount,
      };
    });
  }, [data.drivers, data.loads, selectedWeek]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = direction === 'prev' 
      ? subWeeks(selectedWeek, 1) 
      : addWeeks(selectedWeek, 1);
    onWeekChange(format(startOfWeek(newWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Drivers</h2>
          <p className="text-muted-foreground">Driver performance and weekly stats</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="btn-primary gap-2">
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
                  value={formData.driverName}
                  onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                  placeholder="e.g., John Smith"
                  className="input-dark"
                  required
                />
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
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Selected Week</p>
              <p className="font-semibold">
                Week of {format(selectedWeek, 'MMMM d, yyyy')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onWeekChange(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'))}
            >
              This Week
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Driver Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {driverStats.map(({ driver, weeklyGross, bonusAmount }) => (
          <div
            key={driver.driverId}
            className="glass-card p-6 hover:border-primary/30 transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{driver.driverName}</h3>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    driver.status === 'active'
                      ? 'bg-success/20 text-success'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {driver.status}
                  </span>
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
                  onClick={() => onDeleteDriver(driver.driverId)}
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

              {weeklyGross > 0 && weeklyGross < 10000 && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">
                    ${(10000 - weeklyGross).toLocaleString()} more to reach first bonus tier
                  </p>
                  <div className="mt-2 h-2 bg-background rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/50 transition-all"
                      style={{ width: `${Math.min((weeklyGross / 10000) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {data.drivers.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No drivers yet. Add your first driver to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};
