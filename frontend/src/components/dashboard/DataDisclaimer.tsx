import React from 'react';
import { AlertCircle, ShieldCheck } from 'lucide-react';

interface DataDisclaimerProps {
  isSynthetic?: boolean;
  filename?: string | null;
  totalRecords?: number;
}

export const DataDisclaimer: React.FC<DataDisclaimerProps> = ({
  isSynthetic = true,
  filename,
  totalRecords,
}) => {
  if (!isSynthetic) {
    return (
      <div className="flex items-start gap-3.5 p-4 sm:p-5 rounded-xl bg-teal-50/70 border border-teal-200/90 text-teal-950 shadow-2xs">
        <ShieldCheck className="w-5 h-5 mt-0.5 text-teal-600 flex-shrink-0" />
        <div className="text-[13px] leading-relaxed space-y-1">
          <p className="font-bold text-teal-950">
            Integritas Data: Statistik Bersumber dari Dataset Aktif Terverifikasi
          </p>
          <p className="text-teal-900/90">
            Metrik ringkasan, distribusi antropometri, dan tabel pratinjau di atas dihitung langsung secara dinamis dari{' '}
            <span className="font-semibold text-teal-950">{filename || 'dataset aktif'}</span>
            {totalRecords ? ` (${totalRecords.toLocaleString('id-ID')} catatan baris)` : ''}.
            Sistem menerapkan proteksi privasi ketat dengan menonaktifkan tampilan NIK dan nama lengkap (PII Protection) untuk kepatuhan regulasi data kesehatan.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3.5 p-4 sm:p-5 rounded-xl bg-amber-50/70 border border-amber-200/90 text-amber-900 shadow-2xs">
      <AlertCircle className="w-5 h-5 mt-0.5 text-amber-600 flex-shrink-0" />
      <div className="text-[13px] leading-relaxed space-y-1">
        <p className="font-bold text-amber-950">
          Pemberitahuan Data: Seluruh Angka & Visualisasi Merupakan Data Contoh (Dummy)
        </p>
        <p className="text-amber-900/90">
          Seluruh metrik ringkasan, grafik tren bulanan, diagram faktor risiko, dan tabel preview di atas dibuat semata-mata sebagai{' '}
          <span className="font-semibold text-amber-950">ilustrasi pengembangan antarmuka (UI prototype)</span>. Angka-angka tersebut{' '}
          <span className="font-semibold underline decoration-amber-400">bukan hasil penelitian atau survei lapangan sebenarnya di Kabupaten Toba</span>{' '}
          dan tidak mengandung data identitas pribadi. Metrik analitik resmi akan dihitung dan disajikan begitu dataset final Puskesmas telah aktif.
        </p>
      </div>
    </div>
  );
};
