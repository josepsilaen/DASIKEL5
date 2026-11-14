
import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Database, Download, Eye, Loader2, RefreshCw } from 'lucide-react';
import {
  applyETL,
  buildWarehouse,
  downloadCleanCSV,
  fetchETLHistory,
  fetchWarehouseStats,
  previewETL,
} from '../../services/dataPipeline';
import type {
  ETLAudit,
  ETLHistoryResponse,
  WarehouseStats,
} from '../../services/dataPipeline';

interface Props {
  mappingValidated: boolean;
  onETLApplied: () => Promise<void>;
  onStatusChange?: (status: { etl: boolean; warehouse: boolean }) => void;
}

type Action = 'preview' | 'apply' | 'build' | 'export' | null;

const buttonPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40';
const buttonOutline =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40';

export const ETLWorkflowSection: React.FC<Props> = ({
  mappingValidated, onETLApplied, onStatusChange,
}) => {
  const [history, setHistory] = useState<ETLHistoryResponse | null>(null);
  const [warehouse, setWarehouse] = useState<WarehouseStats | null>(null);
  const [preview, setPreview] = useState<ETLAudit | null>(null);
  const [consentETL, setConsentETL] = useState(false);
  const [consentWarehouse, setConsentWarehouse] = useState(false);
  const [busy, setBusy] = useState<Action>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const etlApplied = history?.sudah_di_etl === true;
  const warehouseReady = Boolean(
    mappingValidated && warehouse?.tersedia &&
    warehouse.sesuai_dataset_aktif === true &&
    warehouse.integritas_referensi === true
  );

  const reload = useCallback(async () => {
    const [audit, stats] = await Promise.all([
      fetchETLHistory(), fetchWarehouseStats(),
    ]);
    setHistory(audit);
    setWarehouse(stats);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchETLHistory(), fetchWarehouseStats()])
      .then(([audit, stats]) => {
        if (!cancelled) {
          setHistory(audit);
          setWarehouse(stats);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Gagal membaca status ETL.');
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [mappingValidated]);

  useEffect(() => {
    onStatusChange?.({ etl: etlApplied, warehouse: warehouseReady });
  }, [etlApplied, warehouseReady, onStatusChange]);

  async function run(action: Exclude<Action, null>, task: () => Promise<void>) {
    setBusy(action);
    setError(null);
    setMessage(null);
    try {
      await task();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setBusy(null);
    }
  }

  const isBusy = busy !== null || loading;

  function showPreview() {
    void run('preview', async () => {
      const result = await previewETL();
      setPreview(result.audit);
      setConsentETL(false);
      setMessage('Pratinjau berhasil dimuat. Data belum diubah.');
    });
  }

  function apply() {
    void run('apply', async () => {
      const result = await applyETL();
      if (!result.diterapkan) throw new Error('Backend tidak mengonfirmasi penerapan ETL.');
      await onETLApplied();
      await reload();
      setPreview(null);
      setConsentETL(false);
      setConsentWarehouse(false);
      setMessage(`ETL diterapkan: ${result.audit.baris_berubah} baris berubah, ${result.audit.jumlah_perubahan} transformasi.`);
    });
  }

  function build() {
    void run('build', async () => {
      const result = await buildWarehouse();
      if (!result.dibangun) throw new Error('Backend tidak mengonfirmasi pembangunan warehouse.');
      const stats = await fetchWarehouseStats();
      setWarehouse(stats);
      setConsentWarehouse(false);
      if (!stats.tersedia || !stats.sesuai_dataset_aktif || !stats.integritas_referensi) {
        throw new Error('Warehouse dibangun, tetapi integritas atau kecocokan dataset belum terverifikasi.');
      }
      setMessage(`Warehouse siap. ${stats.jumlah?.fact_pengukuran_balita ?? 0} baris fakta.`);
    });
  }

  function download() {
    void run('export', async () => {
      await downloadCleanCSV();
      setMessage('Ekspor CSV terdeidentifikasi berhasil dikirim oleh backend.');
    });
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-800">ETL, Warehouse &amp; Ekspor</h3>
          <p className="mt-1 text-xs text-slate-500">Tinjau transformasi, terapkan setelah persetujuan, bangun warehouse, dan ekspor hasil.</p>
        </div>
        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${etlApplied ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          {etlApplied ? 'ETL pernah dijalankan' : 'Belum ada riwayat ETL'}
        </span>
      </div>

      {!mappingValidated && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          Validasi dan simpan pemetaan kolom dahulu. Pratinjau ETL belum dapat dijalankan.
        </div>
      )}
      {error && <div role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>}
      {message && <div className="mb-3 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-800">{message}</div>}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 p-3">
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-800"><Eye className="h-3.5 w-3.5 text-teal-600" />1. Pratinjau Transformasi</h4>
          <p className="mt-2 text-[11px] text-slate-500">Backend menghitung perubahan tanpa menyimpan data.</p>
          <button type="button" onClick={showPreview} disabled={!mappingValidated || isBusy || etlApplied} className={`${buttonOutline} mt-3`}>
            {busy === 'preview' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
            Periksa ETL
          </button>
          {preview && (
            <div className="mt-3 rounded-md bg-slate-50 p-2 text-[11px] text-slate-700">
              <p>Baris berubah: <strong>{preview.baris_berubah}</strong></p>
              <p>Jumlah transformasi: <strong>{preview.jumlah_perubahan}</strong></p>
              {Object.entries(preview.jenis_perubahan).map(([key, value]) => (
                <p key={key}>{key}: {value}</p>
              ))}
              <p className="mt-1">{preview.catatan}</p>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 p-3">
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-800"><CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />2. Terapkan ETL</h4>
          <p className="mt-2 text-[11px] text-slate-500">Proses hanya berjalan setelah pratinjau dan persetujuan. Model ML lama akan di-reset.</p>
          <label className="mt-3 flex items-start gap-2 text-[11px] text-slate-600">
            <input type="checkbox" checked={consentETL} onChange={(event) => setConsentETL(event.target.checked)} disabled={!preview || isBusy || etlApplied} />
            <span>Saya telah memeriksa pratinjau dan menyetujui transformasi.</span>
          </label>
          <button type="button" onClick={apply} disabled={!mappingValidated || !preview || !consentETL || etlApplied || isBusy} className={`${buttonPrimary} mt-2`}>
            {busy === 'apply' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            Terapkan ETL
          </button>
        </div>

        <div className="rounded-lg border border-slate-200 p-3">
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-800"><Database className="h-3.5 w-3.5 text-teal-600" />3. Warehouse &amp; Ekspor</h4>
          <p className="mt-2 text-[11px] text-slate-500">Buat tabel dimensi dan fakta dari dataset aktif. Ekspor tidak otomatis membangun warehouse.</p>
          <label className="mt-3 flex items-start gap-2 text-[11px] text-slate-600">
            <input type="checkbox" checked={consentWarehouse} onChange={(event) => setConsentWarehouse(event.target.checked)} disabled={!mappingValidated || !etlApplied || warehouseReady || isBusy} />
            <span>Saya setuju membangun warehouse untuk dataset aktif.</span>
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={build} disabled={!mappingValidated || !etlApplied || !consentWarehouse || warehouseReady || isBusy} className={buttonPrimary}>
              {busy === 'build' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
              {warehouseReady ? 'Warehouse Sudah Sesuai' : 'Bangun Warehouse'}
            </button>
            <button type="button" onClick={download} disabled={!mappingValidated || isBusy} className={buttonOutline}>
              {busy === 'export' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Ekspor Data Terdeidentifikasi
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
          <div className="flex items-center justify-between">
            <strong className="text-slate-700">Riwayat ETL</strong>
            <button type="button" onClick={() => void reload().catch((err: unknown) => setError(err instanceof Error ? err.message : 'Gagal memuat ulang.'))} className="text-teal-700" title="Muat ulang status" disabled={isBusy}>
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-2 text-slate-600">{history?.riwayat.length ?? 0} eksekusi tercatat untuk dataset aktif.</p>
          {history?.riwayat.at(-1) && (
            <p className="mt-1 text-slate-600">Eksekusi terakhir: {history.riwayat.at(-1)?.baris_berubah} baris berubah.</p>
          )}
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
          <strong className="text-slate-700">Data Warehouse</strong>
          {warehouseReady ? (
            <div className="mt-2 space-y-1 text-emerald-700">
              <p className="font-semibold">Warehouse berhasil dibangun dan cocok dengan dataset aktif.</p>
              <p>Jumlah baris fakta: <strong>{(warehouse?.jumlah?.fact_pengukuran_balita ?? 0).toLocaleString('id-ID')}</strong></p>
              <p>Integritas relasi: valid</p>
            </div>
          ) : warehouse?.tersedia ? (
            <p className="mt-2 text-amber-700">Warehouse tersedia tetapi belum cocok dengan dataset aktif atau perlu dibangun ulang setelah pembaruan sistem.</p>
          ) : (
            <p className="mt-2 text-slate-600">Warehouse belum dibangun.</p>
          )}
        </div>
      </div>
      <p className="mt-3 text-[11px] text-slate-500">ETL melakukan normalisasi terbatas, tanpa imputasi otomatis. Ekspor individu terdeidentifikasi bukan jaminan anonim dan tidak ditujukan untuk akses publik.</p>
    </section>
  );
};
