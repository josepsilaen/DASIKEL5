import React, { useState } from 'react';
import type { DashboardTableauAnalytics } from '../../../types/dashboard';
import { DashboardTableauNav, type TableauSectionTab } from './DashboardTableauNav';
import { DashboardActiveDesaBanner } from './DashboardActiveDesaBanner';
import { DashboardSection1BirthWeight } from './DashboardSection1BirthWeight';
import { DashboardSection2AgeCohort } from './DashboardSection2AgeCohort';
import { DashboardSection3RegionalSpread } from './DashboardSection3RegionalSpread';
import { DashboardSection4PosyanduParenting } from './DashboardSection4PosyanduParenting';
import { DashboardSection5MaternalFactors } from './DashboardSection5MaternalFactors';

interface DashboardTableauContainerProps {
  analytics?: DashboardTableauAnalytics | null;
  selectedDesa: string | null;
  onSelectDesa: (desa: string) => void;
  onResetDesa: () => void;
  onGoToDataBalita: () => void;
}

export const DashboardTableauContainer: React.FC<DashboardTableauContainerProps> = ({
  analytics,
  selectedDesa,
  onSelectDesa,
  onResetDesa,
  onGoToDataBalita,
}) => {
  const [activeTab, setActiveTab] = useState<TableauSectionTab>('all');

  if (!analytics) return null;

  // Temukan info desa terpilih dari data regional jika ada
  const activeDesaInfo = selectedDesa
    ? analytics.section3_regional_spread.all_desas.find((d) => d.desa_name === selectedDesa)
    : undefined;

  return (
    <div className="space-y-5">
      {/* Tab Navigasi Lima Kelompok Analisis Tableau */}
      <DashboardTableauNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        selectedDesaFilter={selectedDesa}
      />

      {/* Banner Penanda Filter Aksi Desa Aktif */}
      <DashboardActiveDesaBanner
        selectedDesa={selectedDesa}
        onReset={onResetDesa}
        totalBalita={activeDesaInfo?.total_balita}
        stuntingRate={activeDesaInfo?.stunting_rate}
      />

      {/* Tampilan Seksi Berdasarkan Tab */}
      {(activeTab === 'all' || activeTab === 'birth-weight') && (
        <DashboardSection1BirthWeight
          data={analytics.section1_birth_weight}
          onGoToDataBalita={onGoToDataBalita}
        />
      )}

      {(activeTab === 'all' || activeTab === 'age-cohort') && (
        <DashboardSection2AgeCohort
          data={analytics.section2_age_cohort}
          onGoToDataBalita={onGoToDataBalita}
        />
      )}

      {(activeTab === 'all' || activeTab === 'regional') && (
        <DashboardSection3RegionalSpread
          data={analytics.section3_regional_spread}
          selectedDesa={selectedDesa}
          onSelectDesa={onSelectDesa}
          onGoToDataBalita={onGoToDataBalita}
        />
      )}

      {(activeTab === 'all' || activeTab === 'posyandu') && (
        <DashboardSection4PosyanduParenting
          data={analytics.section4_posyandu_parenting}
          onGoToDataBalita={onGoToDataBalita}
        />
      )}

      {(activeTab === 'all' || activeTab === 'maternal') && (
        <DashboardSection5MaternalFactors
          data={analytics.section5_maternal_factors}
          onGoToDataBalita={onGoToDataBalita}
        />
      )}
    </div>
  );
};

