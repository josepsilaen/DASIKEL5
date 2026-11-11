import React from 'react';
import {
  Layers,
  Scale,
  Calendar,
  MapPin,
  HeartPulse,
  Users,
} from 'lucide-react';

export type TableauSectionTab = 'all' | 'birth-weight' | 'age-cohort' | 'regional' | 'posyandu' | 'maternal';

interface DashboardTableauNavProps {
  activeTab: TableauSectionTab;
  onChangeTab: (tab: TableauSectionTab) => void;
  selectedDesaFilter?: string | null;
}

export const DashboardTableauNav: React.FC<DashboardTableauNavProps> = ({
  activeTab,
  onChangeTab,
  selectedDesaFilter,
}) => {
  const tabs = [
    {
      id: 'all' as TableauSectionTab,
      label: 'Semua Analisis',
      icon: Layers,
    },
    {
      id: 'birth-weight' as TableauSectionTab,
      label: '1. Berat Lahir',
      icon: Scale,
    },
    {
      id: 'age-cohort' as TableauSectionTab,
      label: '2. Kelompok Usia',
      icon: Calendar,
    },
    {
      id: 'regional' as TableauSectionTab,
      label: '3. Sebaran Wilayah',
      icon: MapPin,
      badge: selectedDesaFilter ? 'Filter Aktif' : undefined,
    },
    {
      id: 'posyandu' as TableauSectionTab,
      label: '4. Posyandu & Pola Asuh',
      icon: HeartPulse,
    },
    {
      id: 'maternal' as TableauSectionTab,
      label: '5. Faktor Ibu',
      icon: Users,
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-1.5 shadow-xs overflow-x-auto">
      <div className="flex items-center gap-1 min-w-max">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              type="button"
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-teal-300' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-teal-500 text-white font-bold ml-1">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

