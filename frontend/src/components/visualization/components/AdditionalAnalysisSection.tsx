import React from 'react';
import { HeartPulse, Users, FileSpreadsheet } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ReferenceLine,
} from 'recharts';
import type {
  DashboardSection4PosyanduParenting,
  DashboardSection5MaternalFactors,
} from '../../../types/dashboard';

interface AdditionalAnalysisSectionProps {
  section4: DashboardSection4PosyanduParenting;
  section5: DashboardSection5MaternalFactors;
  onGoToDataBalita: () => void;
}

export const AdditionalAnalysisSection: React.FC<AdditionalAnalysisSectionProps> = ({
  section4,
  section5,
}) => {
  const hasNaikBb = section4.has_naik_bb && section4.naik_bb_categories.length > 0;
  const hasKelasIbu = section4.has_kelas_ibu && section4.kelas_ibu_categories.length > 0;
  const hasLila = section5.has_lila && section5.lila_categories.length > 0;
  const hasPanjangLahir = section5.has_panjang_lahir && section5.scatter_panjang_sample.length > 0;

  const hasAnyAdditional = hasNaikBb || hasKelasIbu || hasLila || hasPanjangLahir;

  const naikBbData = section4.naik_bb_categories.map((c) => ({
    name: c.category,
    stunting_rate: c.stunting_rate,
    total: c.total_count,
    stunting_count: c.stunting_count,
  }));

  const kelasIbuData = section4.kelas_ibu_categories.map((c) => ({
    name: c.category,
    stunting_rate: c.stunting_rate,
    total: c.total_count,
    stunting_count: c.stunting_count,
  }));

  const lilaBarData = section5.lila_categories.map((c) => ({
    name: c.category,
    stunting_rate: c.stunting_rate,
    total: c.total_count,
    stunting_count: c.stunting_count,
  }));

  const scatterStunting = section5.scatter_panjang_sample.filter((p) => p.is_stunting);
  const scatterNormal = section5.scatter_panjang_sample.filter((p) => !p.is_stunting);

  if (!hasAnyAdditional) {
    return (
      <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-6 text-center space-y-2">
        <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto" />
        <h4 className="text-sm font-bold text-slate-800">Analisis Tambahan Belum Tersedia</h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          Variabel tambahan (Status Naik BB KMS, Kelas Ibu Balita, LiLA Ibu, dan Panjang Lahir) belum dipetakan atau sampel tidak mencukupi pada dataset aktif saat ini.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-4 border-t border-slate-200">
      {/* Header Analisis Tambahan */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200/80 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 font-extrabold text-[11px]">
              ANALISIS TAMBAHAN
            </span>
            <h3 className="text-base font-bold text-slate-800">
              Pola Asuh Posyandu & Faktor Ibu Hamil (Variabel Khusus)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Analisis kondisional yang hanya muncul ketika variabel tersedia pada dataset aktif (termasuk data pemantauan Puskesmas Silaen)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 1. Bar Chart Naik BB (KMS) */}
        {hasNaikBb && (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                <HeartPulse className="w-4 h-4 text-teal-600" />
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Prevalensi Stunting Berdasarkan Status Kenaikan Berat Badan (KMS)
                  </h4>
                  <p className="text-[11px] text-amber-700 font-medium">
                    * Khusus data pemantauan penimbangan Puskesmas Silaen (N / T / O / B)
                  </p>
                </div>
              </div>

              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={naikBbData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val: any, _name: any, item: any) => [
                        `${Number(val).toFixed(1)}% (${item.payload.stunting_count} stunting dari ${item.payload.total} balita)`,
                        'Prevalensi Stunting',
                      ]}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    />
                    <Bar dataKey="stunting_rate" name="Prevalensi Stunting" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
              Keterangan: <strong>N</strong>=Naik, <strong>T</strong>=Tidak Naik/Turun, <strong>O</strong>=Tidak Ditimbang, <strong>B</strong>=Baru
            </div>
          </div>
        )}

        {/* 2. Bar Chart Kelas Ibu Balita */}
        {hasKelasIbu && (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                <Users className="w-4 h-4 text-teal-600" />
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Prevalensi Stunting Berdasarkan Keikutsertaan Kelas Ibu Balita
                  </h4>
                  <p className="text-xs text-slate-500">Perbandingan tingkat stunting ibu aktif vs tidak aktif kelas bina balita</p>
                </div>
              </div>

              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={kelasIbuData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val: any, _name: any, item: any) => [
                        `${Number(val).toFixed(1)}% (${item.payload.stunting_count} stunting dari ${item.payload.total} balita)`,
                        'Prevalensi Stunting',
                      ]}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    />
                    <Bar dataKey="stunting_rate" name="Prevalensi Stunting" fill="#0d9488" radius={[6, 6, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
              Partisipasi Ibu: <strong>{section4.kelas_ibu_participation_rate?.toFixed(1) || 0}%</strong>
            </div>
          </div>
        )}

        {/* 3. Bar Chart Kategori LiLA Ibu */}
        {hasLila && (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                <Users className="w-4 h-4 text-teal-600" />
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Prevalensi Stunting Berdasarkan Kategori LiLA Ibu
                  </h4>
                  <p className="text-[11px] text-amber-700 font-medium">
                    * Khusus data Puskesmas Silaen (Ambang KEK: &lt; 23,5 cm Kemenkes RI)
                  </p>
                </div>
              </div>

              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={lilaBarData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val: any, _name: any, item: any) => [
                        `${Number(val).toFixed(1)}% (${item.payload.stunting_count} stunting dari ${item.payload.total} balita)`,
                        'Prevalensi Stunting',
                      ]}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    />
                    <Bar dataKey="stunting_rate" name="Prevalensi Stunting" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
              Ibu Berisiko KEK: <strong>{section5.kek_risk_rate?.toFixed(1) || 0}%</strong>
            </div>
          </div>
        )}

        {/* 4. Scatter Plot Panjang Badan Lahir (PBL) vs Z-Score TB/U */}
        {hasPanjangLahir && (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                <FileSpreadsheet className="w-4 h-4 text-teal-600" />
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Scatter Plot Panjang Lahir vs Z-Score TB/U
                  </h4>
                  <p className="text-xs text-slate-500">Korelasi panjang badan saat lahir terhadap z-score tinggi saat ukur</p>
                </div>
              </div>

              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" dataKey="x" name="Panjang Lahir" unit=" cm" domain={[40, 56]} tick={{ fontSize: 11 }} />
                    <YAxis type="number" dataKey="y" name="Z-Score TB/U" unit=" SD" domain={[-5.0, 3.0]} tick={{ fontSize: 11 }} />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      formatter={(val: any, name: any) => [
                        `${Number(val).toFixed(2)} ${name === 'Panjang Lahir' ? 'cm' : 'SD'}`,
                        name,
                      ]}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    />
                    <ReferenceLine y={-2.0} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Stunting (-2 SD)', fill: '#ef4444', fontSize: 10, position: 'insideTopLeft' }} />
                    <Scatter name="Stunting" data={scatterStunting} fill="#ef4444" opacity={0.7} />
                    <Scatter name="Tidak Stunting" data={scatterNormal} fill="#2563eb" opacity={0.6} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
              <span>Ambang Normal PBL: &ge; 48 cm</span>
              <span>{section5.scatter_panjang_sample.length} Sampel Terplot</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
