import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { TeamDashboard } from '@/components/TeamDashboard';
import { LoadsManager } from '@/components/LoadsManager';
import { BonusesManager } from '@/components/BonusesManager';
import { DriversManager } from '@/components/DriversManager';
import { useData } from '@/hooks/useData';
import { format, startOfWeek } from 'date-fns';

const Index = () => {
  const [activeTab, setActiveTab] = useState('team');
  const {
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
  } = useData();

  const handleDateChange = (date: Date) => {
    updateSystemState({ selectedDay: format(date, 'yyyy-MM-dd') });
  };

  const handleMonthChange = (month: string) => {
    updateSystemState({ selectedMonth: month });
  };

  const handleWeekChange = (week: string) => {
    updateSystemState({ selectedWeek: week });
  };

  if (loading) {
    return (
      <Layout activeTab={activeTab} onTabChange={setActiveTab}>
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 rounded-full bg-primary animate-pulse" />
            <span className="text-muted-foreground">Loading data...</span>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'team' && (
        <TeamDashboard
          drivers={drivers}
          loads={loads}
          bonuses={bonuses}
          systemState={systemState}
          onDateChange={handleDateChange}
          onMonthChange={handleMonthChange}
        />
      )}
      
      {activeTab === 'loads' && (
        <LoadsManager
          drivers={drivers}
          loads={loads}
          onAddLoad={addLoad}
          onUpdateLoad={updateLoad}
          onDeleteLoad={deleteLoad}
        />
      )}
      
      {activeTab === 'bonuses' && (
        <BonusesManager
          drivers={drivers}
          bonuses={bonuses}
          onAddBonus={addManualBonus}
          onDeleteBonus={deleteBonus}
        />
      )}
      
      {activeTab === 'drivers' && (
        <DriversManager
          drivers={drivers}
          loads={loads}
          systemState={systemState}
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
