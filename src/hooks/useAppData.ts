import { useState, useEffect, useCallback } from 'react';
import { AppData, Driver, Load, Bonus } from '@/types';
import { loadData, saveData, generateId, calculateAutomaticBonus, calculateWeeklyGross } from '@/lib/storage';
import { startOfWeek, parseISO, format } from 'date-fns';

export const useAppData = () => {
  const [data, setData] = useState<AppData>(() => loadData());

  useEffect(() => {
    saveData(data);
  }, [data]);

  const updateSystemState = useCallback((updates: Partial<AppData['systemState']>) => {
    setData(prev => ({
      ...prev,
      systemState: { ...prev.systemState, ...updates },
    }));
  }, []);

  // Driver operations
  const addDriver = useCallback((driver: Omit<Driver, 'driverId' | 'createdAt'>) => {
    const newDriver: Driver = {
      ...driver,
      driverId: generateId(),
      createdAt: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      drivers: [...prev.drivers, newDriver],
    }));
    return newDriver;
  }, []);

  const updateDriver = useCallback((driverId: string, updates: Partial<Driver>) => {
    setData(prev => ({
      ...prev,
      drivers: prev.drivers.map(d =>
        d.driverId === driverId ? { ...d, ...updates } : d
      ),
    }));
  }, []);

  const deleteDriver = useCallback((driverId: string) => {
    setData(prev => ({
      ...prev,
      drivers: prev.drivers.filter(d => d.driverId !== driverId),
    }));
  }, []);

  // Load operations
  const addLoad = useCallback((load: Omit<Load, 'loadId' | 'createdAt'>) => {
    const newLoad: Load = {
      ...load,
      loadId: generateId(),
      createdAt: new Date().toISOString(),
    };
    
    setData(prev => {
      const updatedLoads = [...prev.loads, newLoad];
      // Recalculate automatic bonuses
      const updatedBonuses = recalculateAutomaticBonuses(updatedLoads, prev.drivers, prev.bonuses);
      return {
        ...prev,
        loads: updatedLoads,
        bonuses: updatedBonuses,
      };
    });
    
    return newLoad;
  }, []);

  const updateLoad = useCallback((loadId: string, updates: Partial<Load>) => {
    setData(prev => {
      const updatedLoads = prev.loads.map(l =>
        l.loadId === loadId ? { ...l, ...updates } : l
      );
      const updatedBonuses = recalculateAutomaticBonuses(updatedLoads, prev.drivers, prev.bonuses);
      return {
        ...prev,
        loads: updatedLoads,
        bonuses: updatedBonuses,
      };
    });
  }, []);

  const deleteLoad = useCallback((loadId: string) => {
    setData(prev => {
      const updatedLoads = prev.loads.filter(l => l.loadId !== loadId);
      const updatedBonuses = recalculateAutomaticBonuses(updatedLoads, prev.drivers, prev.bonuses);
      return {
        ...prev,
        loads: updatedLoads,
        bonuses: updatedBonuses,
      };
    });
  }, []);

  // Bonus operations
  const addManualBonus = useCallback((bonus: Omit<Bonus, 'bonusId' | 'createdAt' | 'bonusType'>) => {
    const newBonus: Bonus = {
      ...bonus,
      bonusId: generateId(),
      bonusType: 'manual',
      createdAt: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      bonuses: [...prev.bonuses, newBonus],
    }));
    return newBonus;
  }, []);

  const deleteBonus = useCallback((bonusId: string) => {
    setData(prev => ({
      ...prev,
      bonuses: prev.bonuses.filter(b => b.bonusId !== bonusId),
    }));
  }, []);

  return {
    data,
    updateSystemState,
    addDriver,
    updateDriver,
    deleteDriver,
    addLoad,
    updateLoad,
    deleteLoad,
    addManualBonus,
    deleteBonus,
  };
};

// Helper function to recalculate automatic bonuses
const recalculateAutomaticBonuses = (
  loads: Load[],
  drivers: Driver[],
  existingBonuses: Bonus[]
): Bonus[] => {
  // Keep manual bonuses
  const manualBonuses = existingBonuses.filter(b => b.bonusType === 'manual');
  const automaticBonuses: Bonus[] = [];

  // Get all unique weeks from loads
  const weeks = new Set<string>();
  loads.forEach(load => {
    const weekStart = startOfWeek(parseISO(load.deliveryDate), { weekStartsOn: 1 });
    weeks.add(format(weekStart, 'yyyy-MM-dd'));
  });

  // Calculate automatic bonus for each driver for each week
  weeks.forEach(weekString => {
    const weekStart = parseISO(weekString);
    
    drivers.forEach(driver => {
      const weeklyGross = calculateWeeklyGross(loads, driver.driverId, weekStart);
      const bonusAmount = calculateAutomaticBonus(weeklyGross);
      
      if (bonusAmount > 0) {
        automaticBonuses.push({
          bonusId: `auto-${driver.driverId}-${weekString}`,
          driverId: driver.driverId,
          bonusType: 'automatic',
          amount: bonusAmount,
          week: weekString,
          date: weekString,
          note: `Auto bonus for $${weeklyGross.toLocaleString()} weekly gross`,
          createdAt: new Date().toISOString(),
        });
      }
    });
  });

  return [...manualBonuses, ...automaticBonuses];
};
