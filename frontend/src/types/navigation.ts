export type PageId =
  | 'dashboard'
  | 'data-balita'
  | 'visualisasi'
  | 'analisis'
  | 'wilayah'
  | 'tren'
  | 'machine-learning';

export type ModulePageId = Exclude<
  PageId,
  'dashboard' | 'data-balita' | 'visualisasi'
>;

export interface NavItem {
  id: PageId;
  label: string;
  iconName: string;
  description: string;
}

export const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard Utama',
    iconName: 'LayoutDashboard',
    description: 'Ringkasan dataset dan indikator utama stunting',
  },
  {
    id: 'data-balita',
    label: 'Manajemen Data & ETL',
    iconName: 'Database',
    description: 'Unggah, pemetaan, validasi, cleaning, dan ekspor data',
  },
  {
    id: 'visualisasi',
    label: 'Visualisasi Interaktif',
    iconName: 'BarChart3',
    description: 'Eksplorasi grafik dan distribusi data balita',
  },
  {
    id: 'analisis',
    label: 'Analisis Faktor Risiko',
    iconName: 'SearchCheck',
    description: 'Analisis BBLR, ASI, Posyandu, dan gizi ibu',
  },
  {
    id: 'wilayah',
    label: 'Perbandingan Wilayah',
    iconName: 'MapPinned',
    description: 'Perbandingan stunting antarkecamatan',
  },
  {
    id: 'tren',
    label: 'Tren Stunting 2025–2026',
    iconName: 'TrendingUp',
    description: 'Tren pengukuran berdasarkan tanggal pada dataset aktif',
  },
  {
    id: 'machine-learning',
    label: 'Klasifikasi Machine Learning',
    iconName: 'BrainCircuit',
    description: 'Pelatihan, evaluasi, dan prediksi berbasis model',
  },
];

export const DEFAULT_PAGE: PageId = 'dashboard';

export function isModulePage(page: PageId): page is ModulePageId {
  return (
    page === 'analisis' ||
    page === 'wilayah' ||
    page === 'tren' ||
    page === 'machine-learning'
  );
}

/**
 * Mengubah URL hash menjadi ID halaman.
 * Contoh: #/machine-learning
 */
export function pageFromHash(hash: string): PageId {
  const segment = hash.replace(/^#\/?/, '').replace(/\/$/, '');
  const found = navItems.find((item) => item.id === segment);
  return found?.id ?? DEFAULT_PAGE;
}

export function hashFromPage(page: PageId): string {
  return `#/${page}`;
}
