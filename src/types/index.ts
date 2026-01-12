export type DriverType = 'owner_operator' | 'company_driver';
export type LoadType = 'FULL' | 'PARTIAL';
export type DriverStatus = 'active' | 'inactive';
export type BonusType = 'automatic' | 'manual';

export interface Driver {
  id: string;
  user_id: string;
  driver_name: string;
  driver_type: DriverType;
  status: DriverStatus;
  truck_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface Load {
  id: string;
  user_id: string;
  load_id: string;
  driver_id: string;
  pickup_date: string;
  delivery_date: string;
  origin: string;
  destination: string;
  rate: number;
  load_type: LoadType;
  connected_full_load_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Bonus {
  id: string;
  user_id: string;
  driver_id: string | null;
  bonus_type: BonusType;
  amount: number;
  week_start: string;
  date: string;
  note: string | null;
  created_at: string;
}

export interface SystemState {
  selectedDay: string;
  selectedWeek: string;
  selectedMonth: string;
}

// Bonus thresholds by driver type
export const OWNER_OPERATOR_BONUS_THRESHOLDS: Record<number, number> = {
  13000: 50,
  14000: 75,
  15000: 100,
};

export const COMPANY_DRIVER_BONUS_THRESHOLDS: Record<number, number> = {
  10000: 30,
  11000: 50,
  12000: 70,
  13000: 90,
  14000: 110,
  15000: 150,
};

// Helper to get thresholds by driver type
export const getBonusThresholds = (driverType: DriverType): Record<number, number> => {
  return driverType === 'owner_operator' 
    ? OWNER_OPERATOR_BONUS_THRESHOLDS 
    : COMPANY_DRIVER_BONUS_THRESHOLDS;
};
