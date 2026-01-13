import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Driver, Load, Bonus, SystemState, getBonusThresholds, DriverType } from '@/types';
import { format, startOfWeek, parseISO, endOfWeek, isWithinInterval } from 'date-fns';
import { toast } from 'sonner';

interface UseDataReturn {
  drivers: Driver[];
  loads: Load[];
  bonuses: Bonus[];
  systemState: SystemState;
  loading: boolean;
  updateSystemState: (updates: Partial<SystemState>) => void;
  addDriver: (driver: Omit<Driver, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Driver | null>;
  updateDriver: (id: string, updates: Partial<Driver>) => Promise<void>;
  deleteDriver: (id: string) => Promise<void>;
  addLoad: (load: Omit<Load, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Load | null>;
  updateLoad: (id: string, updates: Partial<Load>) => Promise<void>;
  deleteLoad: (id: string) => Promise<void>;
  addManualBonus: (bonus: Omit<Bonus, 'id' | 'user_id' | 'bonus_type' | 'created_at'>) => Promise<Bonus | null>;
  deleteBonus: (id: string) => Promise<void>;
  recalculateAutomaticBonuses: () => Promise<void>;
}

export const useData = (): UseDataReturn => {
  const { user } = useAuth();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loads, setLoads] = useState<Load[]>([]);
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [loading, setLoading] = useState(true);
  const [systemState, setSystemState] = useState<SystemState>({
    selectedDay: format(new Date(), 'yyyy-MM-dd'),
    selectedWeek: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    selectedMonth: format(new Date(), 'yyyy-MM'),
  });

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const [driversRes, loadsRes, bonusesRes] = await Promise.all([
        supabase.from('drivers').select('*').order('created_at', { ascending: false }),
        supabase.from('loads').select('*').order('delivery_date', { ascending: false }),
        supabase.from('bonuses').select('*').order('date', { ascending: false }),
      ]);

      if (driversRes.error) throw driversRes.error;
      if (loadsRes.error) throw loadsRes.error;
      if (bonusesRes.error) throw bonusesRes.error;

      setDrivers(driversRes.data as Driver[]);
      setLoads(loadsRes.data as Load[]);
      setBonuses(bonusesRes.data as Bonus[]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateSystemState = useCallback((updates: Partial<SystemState>) => {
    setSystemState(prev => ({ ...prev, ...updates }));
  }, []);

  // Calculate automatic bonus for a driver
  const calculateAutomaticBonus = (weeklyGross: number, driverType: DriverType): number => {
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

  // Calculate weekly gross for a driver
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

  // Helper to calculate weekly gross with custom loads array
  const calculateWeeklyGrossWithLoads = (driverId: string, weekStart: Date, loadsList: Load[]): number => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    
    return loadsList
      .filter(load => {
        const deliveryDate = parseISO(load.delivery_date);
        return (
          load.driver_id === driverId &&
          isWithinInterval(deliveryDate, { start: weekStart, end: weekEnd })
        );
      })
      .reduce((sum, load) => sum + Number(load.rate), 0);
  };

  // Recalculate automatic bonuses with specific loads
  const recalculateBonusesWithLoads = useCallback(async (loadsList: Load[]) => {
    if (!user) return;

    try {
      // Delete existing automatic bonuses
      await supabase
        .from('bonuses')
        .delete()
        .eq('user_id', user.id)
        .eq('bonus_type', 'automatic');

      // Get all unique weeks from loads
      const weeks = new Set<string>();
      loadsList.forEach(load => {
        const weekStart = startOfWeek(parseISO(load.delivery_date), { weekStartsOn: 1 });
        weeks.add(format(weekStart, 'yyyy-MM-dd'));
      });

      // Calculate new automatic bonuses
      const newBonuses: Omit<Bonus, 'id' | 'created_at'>[] = [];
      
      weeks.forEach(weekString => {
        const weekStart = parseISO(weekString);
        
        drivers.forEach(driver => {
          const weeklyGross = calculateWeeklyGrossWithLoads(driver.id, weekStart, loadsList);
          const bonusAmount = calculateAutomaticBonus(weeklyGross, driver.driver_type);
          
          if (bonusAmount > 0) {
            newBonuses.push({
              user_id: user.id,
              driver_id: driver.id,
              bonus_type: 'automatic',
              amount: bonusAmount,
              week_start: weekString,
              date: weekString,
              note: `Auto bonus for $${weeklyGross.toLocaleString()} weekly gross`,
            });
          }
        });
      });

      // Insert new automatic bonuses
      if (newBonuses.length > 0) {
        const { error } = await supabase.from('bonuses').insert(newBonuses);
        if (error) throw error;
      }

      // Refresh bonuses
      const { data, error } = await supabase
        .from('bonuses')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) throw error;
      setBonuses(data as Bonus[]);
    } catch (error) {
      console.error('Error recalculating bonuses:', error);
    }
  }, [user, drivers]);

  // Recalculate automatic bonuses using current loads state
  const recalculateAutomaticBonuses = useCallback(async () => {
    await recalculateBonusesWithLoads(loads);
  }, [loads, recalculateBonusesWithLoads]);

  // Driver operations
  const addDriver = async (driver: Omit<Driver, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from('drivers')
        .insert({ ...driver, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      setDrivers(prev => [data as Driver, ...prev]);
      toast.success('Driver added successfully');
      return data as Driver;
    } catch (error) {
      console.error('Error adding driver:', error);
      toast.error('Failed to add driver');
      return null;
    }
  };

  const updateDriver = async (id: string, updates: Partial<Driver>) => {
    try {
      const { error } = await supabase
        .from('drivers')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
      setDrivers(prev => prev.map(d => d.id === id ? { ...d, ...updates } as Driver : d));
      toast.success('Driver updated successfully');
      
      // Recalculate bonuses if driver type changed
      if (updates.driver_type) {
        await recalculateAutomaticBonuses();
      }
    } catch (error) {
      console.error('Error updating driver:', error);
      toast.error('Failed to update driver');
    }
  };

  const deleteDriver = async (id: string) => {
    try {
      const { error } = await supabase
        .from('drivers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setDrivers(prev => prev.filter(d => d.id !== id));
      toast.success('Driver deleted successfully');
    } catch (error) {
      console.error('Error deleting driver:', error);
      toast.error('Failed to delete driver');
    }
  };

  // Load operations
  const addLoad = async (load: Omit<Load, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from('loads')
        .insert({ ...load, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      const newLoad = data as Load;
      
      // Update loads state immediately
      const updatedLoads = [newLoad, ...loads];
      setLoads(updatedLoads);
      
      // Immediately recalculate bonuses with the new load included
      await recalculateBonusesWithLoads(updatedLoads);
      
      toast.success('Load added successfully');
      return newLoad;
    } catch (error: any) {
      console.error('Error adding load:', error);
      if (error.message?.includes('unique')) {
        toast.error('Load ID already exists. Please use a unique Load ID.');
      } else {
        toast.error('Failed to add load');
      }
      return null;
    }
  };

  const updateLoad = async (id: string, updates: Partial<Load>) => {
    try {
      const { error } = await supabase
        .from('loads')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
      const updatedLoads = loads.map(l => l.id === id ? { ...l, ...updates } as Load : l);
      setLoads(updatedLoads);
      
      // Immediately recalculate bonuses
      await recalculateBonusesWithLoads(updatedLoads);
      toast.success('Load updated successfully');
    } catch (error: any) {
      console.error('Error updating load:', error);
      if (error.message?.includes('unique')) {
        toast.error('Load ID already exists. Please use a unique Load ID.');
      } else {
        toast.error('Failed to update load');
      }
    }
  };

  const deleteLoad = async (id: string) => {
    try {
      const { error } = await supabase
        .from('loads')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      const updatedLoads = loads.filter(l => l.id !== id);
      setLoads(updatedLoads);
      
      // Immediately recalculate bonuses
      await recalculateBonusesWithLoads(updatedLoads);
      toast.success('Load deleted successfully');
    } catch (error) {
      console.error('Error deleting load:', error);
      toast.error('Failed to delete load');
    }
  };

  // Bonus operations
  const addManualBonus = async (bonus: Omit<Bonus, 'id' | 'user_id' | 'bonus_type' | 'created_at'>) => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from('bonuses')
        .insert({ ...bonus, user_id: user.id, bonus_type: 'manual' })
        .select()
        .single();
      
      if (error) throw error;
      setBonuses(prev => [data as Bonus, ...prev]);
      toast.success('Bonus added successfully');
      return data as Bonus;
    } catch (error) {
      console.error('Error adding bonus:', error);
      toast.error('Failed to add bonus');
      return null;
    }
  };

  const deleteBonus = async (id: string) => {
    try {
      const { error } = await supabase
        .from('bonuses')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setBonuses(prev => prev.filter(b => b.id !== id));
      toast.success('Bonus deleted successfully');
    } catch (error) {
      console.error('Error deleting bonus:', error);
      toast.error('Failed to delete bonus');
    }
  };

  return {
    drivers,
    loads,
    bonuses,
    systemState,
    loading,
    updateSystemState,
    addDriver,
    updateDriver,
    deleteDriver,
    addLoad,
    updateLoad,
    deleteLoad,
    addManualBonus,
    deleteBonus,
    recalculateAutomaticBonuses,
  };
};
