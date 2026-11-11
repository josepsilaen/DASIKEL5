import React from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { ScatterPoint } from '../../types/dashboard';

interface BirthWeightScatterPlotProps {
  scatterSample: ScatterPoint[];
}

export const BirthWeightScatterPlot: React.FC<BirthWeightScatterPlotProps> = ({
  scatterSample,
}) => {
  if (!scatterSample || scatterSample.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center p-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
        <p className="text-xs text-slate-400">Data scatter plot berat lahir dan Z-Score belum tersedia.</p>
      </div>
    );
  }

  // Pisahkan titik stunting (merah) dan tidak stunting (biru)
  const stuntingPoints = scatterSample.filter((p) => p.is_stunting);
  const normalPoints = scatterSample.filter((p) => !p.is_stunting);

  // Cari domain X dari data
  const xValues = scatterSample.map((p) => p.x);
  const minX = Math.max(0.5, Math.floor((Math.min(...xValues) - 0.2) * 2) / 2);
  const maxX = Math.ceil((Math.max(...xValues) + 0.2) * 2) / 2 || 5.0;

  return (
    <div className="w-full">
      <div className="w-full h-72 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, bottom: 25, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              type="number"
              dataKey="x"
              name="BB Lahir"
              unit=" kg"
              domain={[minX, maxX]}
              tick={{ fontSize: 11, fill: '#64748b' }}
              label={{
                value: 'BB Lahir (kg)',
                position: 'insideBottom',
                offset: -12,
                fontSize: 12,
                fontWeight: 600,
                fill: '#475569',
              }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Z-score TB/U"
              unit=" SD"
              domain={[-6, 5]}
              tick={{ fontSize: 11, fill: '#64748b' }}
              label={{
                value: 'Z-score TB/U',
                angle: -90,
                position: 'insideLeft',
                offset: 5,
                fontSize: 12,
                fontWeight: 600,
                fill: '#475569',
              }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
            />
            <Tooltip
              cursor={{ strokeDasharray: '3 3', stroke: '#94a3b8' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const pt = payload[0].payload as ScatterPoint;
                  return (
                    <div className="bg-slate-900 text-white text-xs p-3 rounded-lg shadow-lg border border-slate-700 min-w-44">
                      <p className="font-bold text-slate-200 border-b border-slate-700 pb-1 mb-1.5">
                        {pt.label || 'Data Balita'}
                      </p>
                      <div className="space-y-1">
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-400">BB Lahir:</span>
                          <strong className="text-white">{pt.x.toFixed(2)} kg</strong>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-400">Z-score TB/U:</span>
                          <strong className="text-white">{pt.y.toFixed(2)} SD</strong>
                        </div>
                        <div className="flex justify-between gap-3 pt-1 border-t border-slate-800">
                          <span className="text-slate-400">Status:</span>
                          <span
                            className={`font-bold ${
                              pt.is_stunting ? 'text-rose-400' : 'text-blue-400'
                            }`}
                          >
                            {pt.is_stunting ? 'Stunting' : 'Tidak Stunting'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            {/* Garis Batas Stunting (-2 SD) */}
            <ReferenceLine
              y={-2}
              stroke="#ef4444"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: 'Batas Stunting (-2 SD)',
                fill: '#ef4444',
                fontSize: 11,
                fontWeight: 'bold',
                position: 'insideTopLeft',
              }}
            />
            {/* Garis Batas BBLR (2,5 kg) */}
            <ReferenceLine
              x={2.5}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: 'Batas BBLR (2,5 kg)',
                fill: '#d97706',
                fontSize: 11,
                fontWeight: 'bold',
                position: 'insideTopRight',
              }}
            />
            {/* Titik Tidak Stunting (Biru) */}
            <Scatter
              name="Tidak Stunting"
              data={normalPoints}
              fill="#2563eb"
              opacity={0.55}
            />
            {/* Titik Stunting (Merah) */}
            <Scatter
              name="Stunting"
              data={stuntingPoints}
              fill="#ef4444"
              opacity={0.75}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Anotasi Keterangan Scatter Plot */}
      <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t-2 border-dashed border-red-500" />
            <span>Garis Horisontal: Batas Stunting (Z-Score = -2 SD)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t-2 border-dashed border-amber-500" />
            <span>Garis Vertikal: Batas BBLR (2,5 kg)</span>
          </span>
        </div>
        <span className="text-[11px] text-slate-400">
          Satu titik mewakili satu balita dari dataset aktif
        </span>
      </div>
    </div>
  );
};

