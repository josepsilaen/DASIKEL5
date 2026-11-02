import React from 'react';
import type { ChildPreviewRow } from '../../data/dashboard';

interface DataTableProps {
  data: ChildPreviewRow[];
}

export const DataTable: React.FC<DataTableProps> = ({ data }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="text-[15px] font-semibold text-slate-800">
          Preview Data Balita
        </h3>
        <p className="text-[12px] text-slate-400 mt-0.5">
          Contoh data sintetis untuk pengujian antarmuka — bukan data nyata
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70">
              <th className="px-5 py-3 text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                Kode
              </th>
              <th className="px-5 py-3 text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                Usia (bln)
              </th>
              <th className="px-5 py-3 text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                JK
              </th>
              <th className="px-5 py-3 text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                BB (kg)
              </th>
              <th className="px-5 py-3 text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                TB (cm)
              </th>
              <th className="px-5 py-3 text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                Kecamatan
              </th>
              <th className="px-5 py-3 text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-slate-50/50 transition-colors"
              >
                <td className="px-5 py-3 text-[13px] font-medium text-slate-700 font-mono">
                  {row.kodeAnak}
                </td>
                <td className="px-5 py-3 text-[13px] text-slate-600 tabular-nums">
                  {row.usia}
                </td>
                <td className="px-5 py-3 text-[13px] text-slate-600">
                  {row.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                </td>
                <td className="px-5 py-3 text-[13px] text-slate-600 tabular-nums">
                  {row.beratBadan.toFixed(1)}
                </td>
                <td className="px-5 py-3 text-[13px] text-slate-600 tabular-nums">
                  {row.tinggiBadan.toFixed(1)}
                </td>
                <td className="px-5 py-3 text-[13px] text-slate-600">
                  {row.kecamatan}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                      row.statusData === 'Valid'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {row.statusData}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
