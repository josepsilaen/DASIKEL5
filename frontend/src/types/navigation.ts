/**
 * Navigasi halaman pada aplikasi Stunting Toba.
 * Setiap page punya id unik, label, ikon, dan status ketersediaan.
 */

export type PageId =
  | 'dashboard'
  | 'data-balita'
  | 'analisis'
  | 'visualisasi'
  | 'pengaturan';

export interface NavItem {
  id: PageId;
  label: string;
  iconName: string;
  available: boolean;
  description: string;
}

export const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    iconName: 'LayoutDashboard',
    available: true,
    description: 'Ringkasan data dan status sistem',
  },
  {
    id: 'data-balita',
    label: 'Data Balita',
    iconName: 'Users',
    available: true,
    description: 'Manajemen data antropometri balita',
  },
  {
    id: 'analisis',
    label: 'Analisis Faktor Risiko',
    iconName: 'SearchCheck',
    available: false,
    description: 'Eksplorasi korelasi variabel risiko',
  },
  {
    id: 'visualisasi',
    label: 'Visualisasi',
    iconName: 'BarChart3',
    available: true,
    description: 'Distribusi statistik dan antropometri balita',
  },
  {
    id: 'pengaturan',
    label: 'Pengaturan',
    iconName: 'Settings',
    available: false,
    description: 'Konfigurasi aplikasi',
  },
];
