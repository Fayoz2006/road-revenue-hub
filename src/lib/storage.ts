import { AppData, Driver, Load, Bonus, BONUS_THRESHOLDS } from '@/types';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';

const STORAGE_KEY = 'ug_transportation_data';

const getDefaultData = (): AppData => ({
  drivers: [
    { driverId: '1', driverName: 'Marcus Johnson', status: 'active', createdAt: new Date().toISOString() },
    { driverId: '2', driverName: 'Elena Rodriguez', status: 'active', createdAt: new Date().toISOString() },
    { driverId: '3', driverName: 'David Chen', status: 'active', createdAt: new Date().toISOString() },
    { driverId: '4', driverName: 'Sarah Williams', status: 'active', createdAt: new Date().toISOString() },
  ],
  loads: [],
  bonuses: [],
  salarySnapshots: [],
  systemState: {
    selectedDay: format(new Date(), 'yyyy-MM-dd'),
    selectedWeek: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    selectedMonth: format(new Date(), 'yyyy-MM'),
  },
});

export const loadData = (): AppData => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading data:', error);
  }
  return getDefaultData();
};

export const saveData = (data: AppData): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving data:', error);
  }
};

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Calculate weekly gross for a driver
export const calculateWeeklyGross = (
  loads: Load[],
  driverId: string,
  weekStart: Date
): number => {
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  
  return loads
    .filter(load => {
      const deliveryDate = parseISO(load.deliveryDate);
      return (
        load.driverId === driverId &&
        isWithinInterval(deliveryDate, { start: weekStart, end: weekEnd })
      );
    })
    .reduce((sum, load) => sum + load.rate, 0);
};

// Calculate automatic bonus based on weekly gross
export const calculateAutomaticBonus = (weeklyGross: number): number => {
  let bonus = 0;
  const thresholds = Object.keys(BONUS_THRESHOLDS)
    .map(Number)
    .sort((a, b) => b - a);
  
  for (const threshold of thresholds) {
    if (weeklyGross >= threshold) {
      bonus = BONUS_THRESHOLDS[threshold];
      break;
    }
  }
  
  return bonus;
};

// Calculate salary for a period
export const calculateSalary = (
  loads: Load[],
  bonuses: Bonus[],
  startDate: Date,
  endDate: Date
): {
  fullLoadCommission: number;
  partialLoadCommission: number;
  totalBonuses: number;
  totalSalary: number;
  fullGross: number;
  partialGross: number;
  totalGross: number;
} => {
  const filteredLoads = loads.filter(load => {
    const deliveryDate = parseISO(load.deliveryDate);
    return isWithinInterval(deliveryDate, { start: startDate, end: endDate });
  });

  const fullLoads = filteredLoads.filter(l => l.loadType === 'FULL');
  const partialLoads = filteredLoads.filter(l => l.loadType === 'PARTIAL');

  const fullGross = fullLoads.reduce((sum, l) => sum + l.rate, 0);
  const partialGross = partialLoads.reduce((sum, l) => sum + l.rate, 0);
  const totalGross = fullGross + partialGross;

  const fullLoadCommission = fullGross * 0.01;
  const partialLoadCommission = partialGross * 0.02;

  const filteredBonuses = bonuses.filter(bonus => {
    const bonusDate = parseISO(bonus.date);
    return isWithinInterval(bonusDate, { start: startDate, end: endDate });
  });

  const totalBonuses = filteredBonuses.reduce((sum, b) => sum + b.amount, 0);
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

// Get loads for a specific period
export const getLoadsForPeriod = (
  loads: Load[],
  startDate: Date,
  endDate: Date
): Load[] => {
  return loads.filter(load => {
    const deliveryDate = parseISO(load.deliveryDate);
    return isWithinInterval(deliveryDate, { start: startDate, end: endDate });
  });
};

// Get bonuses for a specific period
export const getBonusesForPeriod = (
  bonuses: Bonus[],
  startDate: Date,
  endDate: Date
): Bonus[] => {
  return bonuses.filter(bonus => {
    const bonusDate = parseISO(bonus.date);
    return isWithinInterval(bonusDate, { start: startDate, end: endDate });
  });
};
