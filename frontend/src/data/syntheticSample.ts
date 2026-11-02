/**
 * Generator berkas sintetis contoh balita Kabupaten Toba untuk pengujian antarmuka.
 * PENTING: Data ini murni fiktif / sintetis tanpa identitas asli.
 */

export function createSyntheticSampleFile(): File {
  const csvContent = `Nama Balita,NIK,Usia Saat Ukur,Jenis Kelamin,Berat,Tinggi,Desa/Kel,Pukesmas,TB/U,ZS TB/U,BB Lahir
Anak A,1209012304200001,24,L,11.2,85.4,Balige III,Balige,Normal,-0.45,3.1
Anak B,1209012304200002,18,P,8.9,76.2,Lumban Bulbul,Balige,Normal,-0.82,2.9
Anak C,1209012304200003,36,L,12.5,88.0,Laguboti Kota,Laguboti,Pendek,-2.35,2.4
Anak D,1209012304200004,12,P,7.8,70.5,Siregar Aek Nalas,Laguboti,Normal,-0.95,3.0
Anak E,1209012304200005,48,L,14.8,98.2,Porsea,Porsea,Normal,0.15,3.3
Anak F,1209012304200006,30,P,10.2,82.5,Patane I,Porsea,Pendek,-2.18,2.3
Anak G,1209012304200007,15,L,9.1,75.0,Pardamean Sibisa,Ajibata,Normal,-1.10,3.0
Anak H,1209012304200008,42,P,11.0,86.4,Motung,Ajibata,Sangat Pendek,-3.12,2.1
Anak I,1209012304200009,20,L,10.4,81.0,Silaen,Silaen,Normal,-0.75,3.2
Anak J,1209012304200010,28,P,9.8,80.1,Huta Gurgur,Silaen,Pendek,-2.45,2.5
Anak K,1209012304200011,14,L,8.8,74.2,Sigumpar,Sigumpar,Normal,-0.90,3.0
Anak L,1209012304200012,32,P,11.5,86.0,Sitoluama,Laguboti,Normal,-1.05,2.8
Anak M,1209012304200013,26,L,10.8,83.5,Lintong Nihuta,Tampahan,Normal,-0.88,3.1
Anak N,1209012304200014,38,P,10.5,85.2,Tarabunga,Tampahan,Sangat Pendek,-3.05,2.2
Anak O,1209012304200015,16,L,9.3,77.1,Lumban Pea,Balige,Normal,-0.60,3.4`;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  return new File([blob], 'sampel_balita_toba_sintetis.csv', { type: 'text/csv' });
}
