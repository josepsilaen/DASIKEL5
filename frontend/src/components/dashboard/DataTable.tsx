import React from 'react';

export interface ChildPreviewItem {
  id?: string | number;
  kodeAnak?: string;
  usia?: number | string;
  jenisKelamin?: string;
  beratBadan?: number | string;
  tinggiBadan?: number | string;
  wilayah?: string;
  kecamatan?: string;
  statusData?: string;
  statusStunting?: string;
}

interface DataTableProps {
  data: ChildPreviewItem[];
  isSynthetic?: boolean;
  totalRecords?: number;
  filename?: string | null;
}

export const DataTable: React.FC<DataTableProps> = ({
  data,
  isSynthetic = false,
  totalRecords,
  filename,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[16px] font-bold text-slate-800 tracking-tight">
              Preview Catatan Data Balita
            </h3>
            {isSynthetic ? (
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80"
                title="Data tiruan statis untuk evaluasi tata letak antarmuka"
              >
                Data Contoh
              </span>
            ) : (
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                title="Data balita nyata dari dataset aktif dengan PII disamarkan"
              >
                Data Aktual (Tersamar)
              </span>
            )}
          </div>
          <p className="text-[12px] text-slate-500 mt-0.5">
            {isSynthetic
              ? 'Contoh data sintetis statis untuk pengujian antarmuka — bukan data hasil survei/penelitian Kabupaten Toba'
              : `Sampel ${data.length} baris catatan dari berkas aktif ${filename ? `"${filename}"` : ''} (informasi pribadi NIK/Nama disamarkan)`}
          </p>
        </div>
        <span className="text-[11.5px] text-slate-400 font-mono">
          {totalRecords ? `${totalRecords.toLocaleString('id-ID')} total catatan` : `${data.length} baris data`}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              <th className="px-5 py-2.5 text-[11.5px] sm:text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                Kode Balita
              </th>
              <th className="px-5 py-2.5 text-[11.5px] sm:text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                Usia (bln)
              </th>
              <th className="px-5 py-2.5 text-[11.5px] sm:text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                JK
              </th>
              <th className="px-5 py-2.5 text-[11.5px] sm:text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                BB (kg)
              </th>
              <th className="px-5 py-2.5 text-[11.5px] sm:text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                TB (cm)
              </th>
              <th className="px-5 py-2.5 text-[11.5px] sm:text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                Wilayah
              </th>
              <th className="px-5 py-2.5 text-[11.5px] sm:text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                Status Catatan
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-slate-400 text-sm">
                  Tidak ada baris data untuk ditampilkan
                </td>
              </tr>
            ) : (
              data.map((row, idx) => {
                const rowKey = row.id ?? `row-${idx}`;
                const genderDisplay =
                  row.jenisKelamin === 'L' || row.jenisKelamin === 'Laki-laki'
                    ? 'Laki-laki'
                    : row.jenisKelamin === 'P' || row.jenisKelamin === 'Perempuan'
                    ? 'Perempuan'
                    : row.jenisKelamin || '-';

                const beratDisplay =
                  typeof row.beratBadan === 'number'
                    ? row.beratBadan.toFixed(1)
                    : row.beratBadan || '-';

                const tinggiDisplay =
                  typeof row.tinggiBadan === 'number'
                    ? row.tinggiBadan.toFixed(1)
                    : row.tinggiBadan || '-';

                const wilayahDisplay = row.wilayah || row.kecamatan || '-';

                return (
                  <tr key={rowKey} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3 text-[13px] font-semibold text-slate-800 font-mono">
                      {row.kodeAnak || `BLT-${idx + 1}`}
                    </td>
                    <td className="px-5 py-3 text-[13px] text-slate-700 tabular-nums">
                      {row.usia ?? '-'}
                    </td>
                    <td className="px-5 py-3 text-[13px] text-slate-700">
                      {genderDisplay}
                    </td>
                    <td className="px-5 py-3 text-[13px] text-slate-700 tabular-nums">
                      {beratDisplay}
                    </td>
                    <td className="px-5 py-3 text-[13px] text-slate-700 tabular-nums">
                      {tinggiDisplay}
                    </td>
                    <td className="px-5 py-3 text-[13px] text-slate-700">
                      {wilayahDisplay}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11.5px] font-semibold ${
                          row.statusData === 'Valid'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {row.statusData || 'Tercatat'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
