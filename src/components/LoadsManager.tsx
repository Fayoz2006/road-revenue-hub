import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Package, MapPin, Calendar, DollarSign, User, Search, Link2, AlertCircle, Check, ChevronsUpDown } from 'lucide-react';
import { Driver, Load } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

// Searchable Full Load Selector Component
interface FullLoadSearchProps {
  fullLoads: Load[];
  selectedLoadId: string;
  onSelect: (loadId: string) => void;
}

const FullLoadSearch = ({ fullLoads, selectedLoadId, onSelect }: FullLoadSearchProps) => {
  const [open, setOpen] = useState(false);
  const selectedLoad = fullLoads.find(l => l.load_id === selectedLoadId);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium flex items-center gap-2">
        <Link2 className="h-4 w-4" />
        Connected FULL Load ID (Required)
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between input-dark"
          >
            {selectedLoad 
              ? `${selectedLoad.load_id} - ${selectedLoad.origin} → ${selectedLoad.destination}`
              : "Search for a FULL load..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0 bg-card border-border" align="start">
          <Command className="bg-card">
            <CommandInput placeholder="Search by Load ID, origin, or destination..." className="h-9" />
            <CommandList>
              <CommandEmpty>
                {fullLoads.length === 0 
                  ? "No FULL loads available. Create a FULL load first."
                  : "No matching loads found."}
              </CommandEmpty>
              <CommandGroup>
                {fullLoads.map(load => (
                  <CommandItem
                    key={load.id}
                    value={`${load.load_id} ${load.origin} ${load.destination}`}
                    onSelect={() => {
                      onSelect(load.load_id);
                      setOpen(false);
                    }}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedLoadId === load.load_id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-mono font-medium">{load.load_id}</span>
                      <span className="text-xs text-muted-foreground">
                        {load.origin} → {load.destination}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {fullLoads.length === 0 && (
        <p className="text-xs text-destructive">You must create a FULL load before creating a PARTIAL load.</p>
      )}
    </div>
  );
};

interface LoadsManagerProps {
  drivers: Driver[];
  loads: Load[];
  onAddLoad: (load: Omit<Load, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Load | null>;
  onUpdateLoad: (id: string, updates: Partial<Load>) => Promise<void>;
  onDeleteLoad: (id: string) => Promise<void>;
}

export const LoadsManager = ({ drivers, loads, onAddLoad, onUpdateLoad, onDeleteLoad }: LoadsManagerProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLoad, setEditingLoad] = useState<Load | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [validationError, setValidationError] = useState('');
  const [formData, setFormData] = useState({
    load_id: '',
    pickup_date: format(new Date(), 'yyyy-MM-dd'),
    delivery_date: format(new Date(), 'yyyy-MM-dd'),
    origin: '',
    destination: '',
    rate: '',
    load_type: 'FULL' as 'FULL' | 'PARTIAL',
    driver_id: '',
    connected_full_load_id: '',
  });

  const fullLoads = useMemo(() => loads.filter(l => l.load_type === 'FULL'), [loads]);

  const resetForm = () => {
    setFormData({
      load_id: '',
      pickup_date: format(new Date(), 'yyyy-MM-dd'),
      delivery_date: format(new Date(), 'yyyy-MM-dd'),
      origin: '',
      destination: '',
      rate: '',
      load_type: 'FULL',
      driver_id: '',
      connected_full_load_id: '',
    });
    setEditingLoad(null);
    setValidationError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    // Validate PARTIAL load requires a connected FULL load
    if (formData.load_type === 'PARTIAL' && !formData.connected_full_load_id) {
      setValidationError('PARTIAL loads must be linked to an existing FULL load.');
      return;
    }

    // Find the connected full load to get its UUID
    let connectedLoadUuid: string | null = null;
    if (formData.connected_full_load_id) {
      const connectedLoad = fullLoads.find(l => l.load_id === formData.connected_full_load_id);
      if (!connectedLoad) {
        setValidationError('The selected FULL load does not exist.');
        return;
      }
      connectedLoadUuid = connectedLoad.id;
    }

    const loadData = {
      load_id: formData.load_id,
      pickup_date: formData.pickup_date,
      delivery_date: formData.delivery_date,
      origin: formData.origin,
      destination: formData.destination,
      rate: parseFloat(formData.rate),
      load_type: formData.load_type,
      driver_id: formData.driver_id,
      connected_full_load_id: connectedLoadUuid,
    };

    if (editingLoad) {
      await onUpdateLoad(editingLoad.id, loadData);
    } else {
      await onAddLoad(loadData);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (load: Load) => {
    setEditingLoad(load);
    const connectedLoad = load.connected_full_load_id 
      ? loads.find(l => l.id === load.connected_full_load_id)?.load_id || ''
      : '';
    setFormData({
      load_id: load.load_id,
      pickup_date: load.pickup_date,
      delivery_date: load.delivery_date,
      origin: load.origin,
      destination: load.destination,
      rate: load.rate.toString(),
      load_type: load.load_type,
      driver_id: load.driver_id,
      connected_full_load_id: connectedLoad,
    });
    setIsDialogOpen(true);
  };

  const getDriverName = (driverId: string) => {
    return drivers.find(d => d.id === driverId)?.driver_name || 'Unknown';
  };

  const filteredLoads = useMemo(() => {
    const sorted = [...loads].sort((a, b) => 
      new Date(b.delivery_date).getTime() - new Date(a.delivery_date).getTime()
    );
    
    if (!searchQuery.trim()) return sorted;
    
    const query = searchQuery.toLowerCase();
    return sorted.filter(load => 
      load.load_id.toLowerCase().includes(query) ||
      load.origin.toLowerCase().includes(query) ||
      load.destination.toLowerCase().includes(query)
    );
  }, [loads, searchQuery]);

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Loads Management</h2>
          <p className="text-sm text-muted-foreground">Create and manage shipment loads</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="btn-primary gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              New Load
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingLoad ? 'Edit Load' : 'Create New Load'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {validationError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                  <p className="text-sm text-destructive">{validationError}</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Load ID</label>
                <Input
                  value={formData.load_id}
                  onChange={(e) => setFormData({ ...formData, load_id: e.target.value })}
                  placeholder="e.g., LD-2024-001"
                  className="input-dark"
                  required
                  maxLength={50}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Pickup Date</label>
                  <Input
                    type="date"
                    value={formData.pickup_date}
                    onChange={(e) => setFormData({ ...formData, pickup_date: e.target.value })}
                    className="input-dark"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Delivery Date</label>
                  <Input
                    type="date"
                    value={formData.delivery_date}
                    onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
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
                    maxLength={100}
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
                    maxLength={100}
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
                    value={formData.load_type}
                    onValueChange={(value: 'FULL' | 'PARTIAL') => {
                      setFormData({ ...formData, load_type: value, connected_full_load_id: value === 'FULL' ? '' : formData.connected_full_load_id });
                      setValidationError('');
                    }}
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

              {formData.load_type === 'PARTIAL' && (
                <FullLoadSearch
                  fullLoads={fullLoads}
                  selectedLoadId={formData.connected_full_load_id}
                  onSelect={(value) => {
                    setFormData({ ...formData, connected_full_load_id: value });
                    setValidationError('');
                  }}
                />
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Assigned Driver</label>
                <Select
                  value={formData.driver_id}
                  onValueChange={(value) => setFormData({ ...formData, driver_id: value })}
                >
                  <SelectTrigger className="input-dark">
                    <SelectValue placeholder="Select a driver" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {drivers.filter(d => d.status === 'active').map(driver => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.driver_name} ({driver.driver_type === 'owner_operator' ? 'OO' : 'CD'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="btn-primary"
                  disabled={formData.load_type === 'PARTIAL' && fullLoads.length === 0}
                >
                  {editingLoad ? 'Update Load' : 'Create Load'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Load ID, origin, or destination..."
          className="pl-10 input-dark"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="glass-card p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-muted-foreground">Total Loads</p>
          <p className="text-xl sm:text-2xl font-bold font-mono">{loads.length}</p>
        </div>
        <div className="glass-card p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-muted-foreground">Full Loads</p>
          <p className="text-xl sm:text-2xl font-bold font-mono text-primary">
            {loads.filter(l => l.load_type === 'FULL').length}
          </p>
        </div>
        <div className="glass-card p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-muted-foreground">Partial Loads</p>
          <p className="text-xl sm:text-2xl font-bold font-mono text-warning">
            {loads.filter(l => l.load_type === 'PARTIAL').length}
          </p>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {filteredLoads.length === 0 ? (
          <div className="glass-card p-8 text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>{searchQuery ? 'No loads match your search.' : 'No loads yet. Create your first load to get started.'}</p>
          </div>
        ) : (
          filteredLoads.map((load) => (
            <div key={load.id} className="glass-card p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono font-medium text-sm">{load.load_id}</span>
                  <span className={`ml-2 status-badge ${
                    load.load_type === 'FULL' ? 'status-full' : 'status-partial'
                  }`}>
                    {load.load_type}
                  </span>
                  {load.connected_full_load_id && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Link2 className="h-3 w-3" />
                      <span>{loads.find(l => l.id === load.connected_full_load_id)?.load_id || 'Linked'}</span>
                    </div>
                  )}
                </div>
                <span className="font-mono font-semibold text-lg text-primary">
                  ${Number(load.rate).toLocaleString()}
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{load.origin} → {load.destination}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{format(parseISO(load.pickup_date), 'MMM d')} - {format(parseISO(load.delivery_date), 'MMM d')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{getDriverName(load.driver_id)}</span>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-2 border-t border-border/30">
                <Button variant="ghost" size="sm" onClick={() => handleEdit(load)}>
                  <Pencil className="h-4 w-4 mr-1" /> Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onDeleteLoad(load.id)} className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Load ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Route</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Dates</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Driver</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Rate</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filteredLoads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>{searchQuery ? 'No loads match your search.' : 'No loads yet. Create your first load to get started.'}</p>
                  </td>
                </tr>
              ) : (
                filteredLoads.map((load) => (
                  <tr key={load.id} className="table-row-hover">
                    <td className="px-4 py-4">
                      <span className="font-mono font-medium">{load.load_id}</span>
                      {load.connected_full_load_id && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Link2 className="h-3 w-3" />
                          <span>
                            {loads.find(l => l.id === load.connected_full_load_id)?.load_id || 'Linked'}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`status-badge ${
                        load.load_type === 'FULL' ? 'status-full' : 'status-partial'
                      }`}>
                        {load.load_type}
                      </span>
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
                          <span>{format(parseISO(load.pickup_date), 'MMM d')}</span>
                          <span className="text-muted-foreground">-</span>
                          <span>{format(parseISO(load.delivery_date), 'MMM d')}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{getDriverName(load.driver_id)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="font-mono font-semibold text-lg">
                        ${Number(load.rate).toLocaleString()}
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
                          onClick={() => onDeleteLoad(load.id)}
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
