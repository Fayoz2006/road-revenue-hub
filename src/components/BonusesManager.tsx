import { useState, useMemo } from 'react';
import { Plus, Gift, Zap, FileText, Trash2 } from 'lucide-react';
import { AppData, Bonus, BONUS_THRESHOLDS } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format, parseISO } from 'date-fns';

interface BonusesManagerProps {
  data: AppData;
  onAddBonus: (bonus: Omit<Bonus, 'bonusId' | 'createdAt' | 'bonusType'>) => void;
  onDeleteBonus: (bonusId: string) => void;
}

export const BonusesManager = ({ data, onAddBonus, onDeleteBonus }: BonusesManagerProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    driverId: '',
    note: '',
    week: format(new Date(), 'yyyy-MM-dd'),
  });

  const resetForm = () => {
    setFormData({
      amount: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      driverId: '',
      note: '',
      week: format(new Date(), 'yyyy-MM-dd'),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddBonus({
      amount: parseFloat(formData.amount),
      date: formData.date,
      driverId: formData.driverId || null,
      note: formData.note,
      week: formData.week,
    });
    setIsDialogOpen(false);
    resetForm();
  };

  const getDriverName = (driverId: string | null) => {
    if (!driverId) return 'Company-wide';
    return data.drivers.find(d => d.driverId === driverId)?.driverName || 'Unknown';
  };

  const sortedBonuses = useMemo(() => {
    return [...data.bonuses].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [data.bonuses]);

  const automaticBonuses = sortedBonuses.filter(b => b.bonusType === 'automatic');
  const manualBonuses = sortedBonuses.filter(b => b.bonusType === 'manual');

  const totalAutomatic = automaticBonuses.reduce((sum, b) => sum + b.amount, 0);
  const totalManual = manualBonuses.reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bonuses</h2>
          <p className="text-muted-foreground">Automatic and manual bonus management</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="btn-primary gap-2">
              <Plus className="h-4 w-4" />
              Add Manual Bonus
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Add Manual Bonus</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount ($)</label>
                  <Input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="input-dark"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date</label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="input-dark"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Driver (Optional)</label>
              <Select
                  value={formData.driverId}
                  onValueChange={(value) => setFormData({ ...formData, driverId: value === 'company-wide' ? '' : value })}
                >
                  <SelectTrigger className="input-dark">
                    <SelectValue placeholder="Select a driver (or leave empty for company-wide)" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="company-wide">Company-wide</SelectItem>
                    {data.drivers.filter(d => d.status === 'active').map(driver => (
                      <SelectItem key={driver.driverId} value={driver.driverId}>
                        {driver.driverName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Note / Reason</label>
                <Textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Reason for this bonus..."
                  className="input-dark"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="btn-primary">
                  Add Bonus
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Bonus Threshold Reference */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Automatic Weekly Bonus Thresholds
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(BONUS_THRESHOLDS).map(([threshold, bonus]) => (
            <div key={threshold} className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Weekly Gross ≥</p>
              <p className="font-mono font-semibold">${parseInt(threshold).toLocaleString()}</p>
              <p className="text-primary font-bold mt-1">${bonus}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <p className="text-sm text-muted-foreground">Total Bonuses</p>
          <p className="text-2xl font-bold font-mono">{data.bonuses.length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-muted-foreground">Automatic</p>
          <p className="text-2xl font-bold font-mono text-primary">
            ${totalAutomatic.toLocaleString()}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-muted-foreground">Manual</p>
          <p className="text-2xl font-bold font-mono text-warning">
            ${totalManual.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Bonuses List */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Driver</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Note</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {sortedBonuses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    <Gift className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No bonuses yet. Add loads to trigger automatic bonuses.</p>
                  </td>
                </tr>
              ) : (
                sortedBonuses.map((bonus) => (
                  <tr key={bonus.bonusId} className="table-row-hover">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {bonus.bonusType === 'automatic' ? (
                          <Zap className="h-4 w-4 text-primary" />
                        ) : (
                          <FileText className="h-4 w-4 text-warning" />
                        )}
                        <span className={`status-badge ${
                          bonus.bonusType === 'automatic' ? 'status-full' : 'status-partial'
                        }`}>
                          {bonus.bonusType}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {getDriverName(bonus.driverId)}
                    </td>
                    <td className="px-4 py-4">
                      {format(parseISO(bonus.date), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-4 max-w-xs truncate">
                      <span className="text-muted-foreground">{bonus.note || '-'}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="font-mono font-semibold text-lg text-primary">
                        ${bonus.amount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      {bonus.bonusType === 'manual' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDeleteBonus(bonus.bonusId)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
