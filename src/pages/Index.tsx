import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { TeamDashboard } from '@/components/TeamDashboard';
import { LoadsManager } from '@/components/LoadsManager';
import { BonusesManager } from '@/components/BonusesManager';
import { DriversManager } from '@/components/DriversManager';
import { useAppData } from '@/hooks/useAppData';
import { format, startOfWeek } from 'date-fns';

const Index = () => {
  const [activeTab, setActiveTab] = useState('team');
  const {
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
  } = useAppData();

  const handleDateChange = (date: Date) => {
    updateSystemState({ selectedDay: format(date, 'yyyy-MM-dd') });
  };

  const handleMonthChange = (month: string) => {
    updateSystemState({ selectedMonth: month });
  };

  const handleWeekChange = (week: string) => {
    updateSystemState({ selectedWeek: week });
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'team' && (
        <TeamDashboard
          data={data}
          onDateChange={handleDateChange}
          onMonthChange={handleMonthChange}
        />
      )}
      
      {activeTab === 'loads' && (
        <LoadsManager
          data={data}
          onAddLoad={addLoad}
          onUpdateLoad={updateLoad}
          onDeleteLoad={deleteLoad}
        />
      )}
      
      {activeTab === 'bonuses' && (
        <BonusesManager
          data={data}
          onAddBonus={addManualBonus}
          onDeleteBonus={deleteBonus}
        />
      )}
      
      {activeTab === 'drivers' && (
        <DriversManager
          data={data}
          onAddDriver={addDriver}
          onUpdateDriver={updateDriver}
          onDeleteDriver={deleteDriver}
          onWeekChange={handleWeekChange}
        />
      )}
    </Layout>
  );
};

export default Index;
