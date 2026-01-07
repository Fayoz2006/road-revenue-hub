import { useState } from 'react';
import { Plus, Pencil, Trash2, Package, MapPin, Calendar, DollarSign, User } from 'lucide-react';
import { AppData, Load } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format, parseISO } from 'date-fns';

interface LoadsManagerProps {
  data: AppData;
  onAddLoad: (load: Omit<Load, 'loadId' | 'createdAt'>) => void;
  onUpdateLoad: (loadId: string, updates: Partial<Load>) => void;
  onDeleteLoad: (loadId: string) => void;
}

export const LoadsManager = ({ data, onAddLoad, onUpdateLoad, onDeleteLoad }: LoadsManagerProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLoad, setEditingLoad] = useState<Load | null>(null);
  const [formData, setFormData] = useState({
    pickupDate: format(new Date(), 'yyyy-MM-dd'),
    deliveryDate: format(new Date(), 'yyyy-MM-dd'),
    origin: '',
    destination: '',
    rate: '',
    loadType: 'FULL' as 'FULL' | 'PARTIAL',
    driverId: '',
  });

  const resetForm = () => {
    setFormData({
      pickupDate: format(new Date(), 'yyyy-MM-dd'),
      deliveryDate: format(new Date(), 'yyyy-MM-dd'),
      origin: '',
      destination: '',
      rate: '',
      loadType: 'FULL',
      driverId: '',
    });
    setEditingLoad(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const loadData = {
      pickupDate: formData.pickupDate,
      deliveryDate: formData.deliveryDate,
      origin: formData.origin,
      destination: formData.destination,
      rate: parseFloat(formData.rate),
      loadType: formData.loadType,
      driverId: formData.driverId,
    };

    if (editingLoad) {
      onUpdateLoad(editingLoad.loadId, loadData);
    } else {
      onAddLoad(loadData);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (load: Load) => {
    setEditingLoad(load);
    setFormData({
      pickupDate: load.pickupDate,
      deliveryDate: load.deliveryDate,
      origin: load.origin,
      destination: load.destination,
      rate: load.rate.toString(),
      loadType: load.loadType,
      driverId: load.driverId,
    });
    setIsDialogOpen(true);
  };

  const getDriverName = (driverId: string) => {
    return data.drivers.find(d => d.driverId === driverId)?.driverName || 'Unknown';
  };

  const sortedLoads = [...data.loads].sort((a, b) => 
    new Date(b.deliveryDate).getTime() - new Date(a.deliveryDate).getTime()
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Loads Management</h2>
          <p className="text-muted-foreground">Create and manage shipment loads</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="btn-primary gap-2">
              <Plus className="h-4 w-4" />
              New Load
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingLoad ? 'Edit Load' : 'Create New Load'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Pickup Date</label>
                  <Input
                    type="date"
                    value={formData.pickupDate}
                    onChange={(e) => setFormData({ ...formData, pickupDate: e.target.value })}
                    className="input-dark"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Delivery Date</label>
                  <Input
                    type="date"
                    value={formData.deliveryDate}
                    onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                    className="input-dark"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Origin</label>
                  <Input
                    value={formData.origin}
                    onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                    placeholder="e.g., Chicago, IL"
                    className="input-dark"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Destination</label>
                  <Input
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    placeholder="e.g., Los Angeles, CA"
                    className="input-dark"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Rate ($)</label>
                  <Input
                    type="number"
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="input-dark"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Load Type</label>
                  <Select
                    value={formData.loadType}
                    onValueChange={(value: 'FULL' | 'PARTIAL') => setFormData({ ...formData, loadType: value })}
                  >
                    <SelectTrigger className="input-dark">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="FULL">FULL (1% commission)</SelectItem>
                      <SelectItem value="PARTIAL">PARTIAL (2% commission)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Assigned Driver</label>
                <Select
                  value={formData.driverId}
                  onValueChange={(value) => setFormData({ ...formData, driverId: value })}
                >
                  <SelectTrigger className="input-dark">
                    <SelectValue placeholder="Select a driver" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {data.drivers.filter(d => d.status === 'active').map(driver => (
                      <SelectItem key={driver.driverId} value={driver.driverId}>
                        {driver.driverName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="btn-primary">
                  {editingLoad ? 'Update Load' : 'Create Load'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <p className="text-sm text-muted-foreground">Total Loads</p>
          <p className="text-2xl font-bold font-mono">{data.loads.length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-muted-foreground">Full Loads</p>
          <p className="text-2xl font-bold font-mono text-primary">
            {data.loads.filter(l => l.loadType === 'FULL').length}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-muted-foreground">Partial Loads</p>
          <p className="text-2xl font-bold font-mono text-warning">
            {data.loads.filter(l => l.loadType === 'PARTIAL').length}
          </p>
        </div>
      </div>

      {/* Loads Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Load</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Route</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Dates</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Driver</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Rate</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {sortedLoads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No loads yet. Create your first load to get started.</p>
                  </td>
                </tr>
              ) : (
                sortedLoads.map((load) => (
                  <tr key={load.loadId} className="table-row-hover">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                          load.loadType === 'FULL' ? 'bg-primary/20' : 'bg-warning/20'
                        }`}>
                          <Package className={`h-4 w-4 ${
                            load.loadType === 'FULL' ? 'text-primary' : 'text-warning'
                          }`} />
                        </div>
                        <span className={`status-badge ${
                          load.loadType === 'FULL' ? 'status-full' : 'status-partial'
                        }`}>
                          {load.loadType}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{load.origin}</span>
                        <span className="text-muted-foreground">→</span>
                        <span>{load.destination}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{format(parseISO(load.pickupDate), 'MMM d')}</span>
                          <span className="text-muted-foreground">-</span>
                          <span>{format(parseISO(load.deliveryDate), 'MMM d')}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{getDriverName(load.driverId)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="font-mono font-semibold text-lg">
                        ${load.rate.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(load)}
                          className="h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDeleteLoad(load.loadId)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
