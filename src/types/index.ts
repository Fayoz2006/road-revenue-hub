export interface Driver {
  driverId: string;
  driverName: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Load {
  loadId: string;
  pickupDate: string;
  deliveryDate: string;
  origin: string;
  destination: string;
  rate: number;
  loadType: 'FULL' | 'PARTIAL';
  driverId: string;
  createdAt: string;
}

export interface Bonus {
  bonusId: string;
  driverId: string | null;
  bonusType: 'automatic' | 'manual';
  amount: number;
  week: string;
  date: string;
  note: string;
  createdAt: string;
}

export interface SalarySnapshot {
  salaryId: string;
  periodType: 'day' | 'week' | 'month';
  periodStart: string;
  periodEnd: string;
  fullLoadCommission: number;
  partialLoadCommission: number;
  totalBonuses: number;
  totalSalary: number;
  calculatedAt: string;
}

export interface SystemState {
  selectedDay: string;
  selectedWeek: string;
  selectedMonth: string;
}

export interface AppData {
  drivers: Driver[];
  loads: Load[];
  bonuses: Bonus[];
  salarySnapshots: SalarySnapshot[];
  systemState: SystemState;
}

export const BONUS_THRESHOLDS: Record<number, number> = {
  10000: 30,
  11000: 50,
  12000: 70,
  13000: 90,
  14000: 110,
  15000: 150,
};
