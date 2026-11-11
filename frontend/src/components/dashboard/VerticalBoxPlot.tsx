import React from 'react';
import type { BoxPlotStats } from '../../types/dashboard';

interface VerticalBoxPlotProps {
  stuntingStats?: BoxPlotStats | null;
  normalStats?: BoxPlotStats | null;
  threshold?: number; // default 2.5 kg
}

export const VerticalBoxPlot: React.FC<VerticalBoxPlotProps> = ({
  stuntingStats,
  normalStats,
  threshold = 2.5,
}) => {
  const hasData = Boolean(
    (stuntingStats && stuntingStats.count > 0) || (normalStats && normalStats.count > 0)
  );

  if (!hasData) {
    return (
      <div className="h-64 flex flex-col items-center justify-center p-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
        <p className="text-xs text-slate-400">Data distribusi berat lahir belum tersedia.</p>
      </div>
    );
  }

  // Tentukan batas min & max sumbu Y
  const allVals: number[] = [threshold];
  if (stuntingStats && stuntingStats.count > 0) {
    allVals.push(stuntingStats.min_value, stuntingStats.max_value);
  }
  if (normalStats && normalStats.count > 0) {
    allVals.push(normalStats.min_value, normalStats.max_value);
  }

  const rawMin = Math.min(...allVals);
  const rawMax = Math.max(...allVals);
  const yMin = Math.max(0, Math.floor((rawMin - 0.3) * 2) / 2);
  const yMax = Math.ceil((rawMax + 0.3) * 2) / 2 || 5.0;
  const ySpan = yMax - yMin || 1;

  // Dimensi SVG
  const width = 360;
  const height = 240;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 35;
  const plotW = width - paddingLeft - paddingRight;
  const plotH = height - paddingTop - paddingBottom;

  const getY = (val: number) => {
    const clamped = Math.max(yMin, Math.min(yMax, val));
    const ratio = (clamped - yMin) / ySpan;
    return paddingTop + plotH * (1 - ratio);
  };

  // Titik ticks pada sumbu Y
  const ticks: number[] = [];
  const step = ySpan > 3 ? 1.0 : 0.5;
  for (let v = yMin; v <= yMax + 0.001; v += step) {
    ticks.push(Number(v.toFixed(1)));
  }
  if (!ticks.includes(threshold) && threshold >= yMin && threshold <= yMax) {
    ticks.push(threshold);
    ticks.sort((a, b) => a - b);
  }

  // Posisi X untuk dua kategori
  const xStunting = paddingLeft + plotW * 0.3;
  const xNormal = paddingLeft + plotW * 0.72;
  const boxWidth = 52;
  const capWidth = 26;

  const renderSingleBox = (
    stats: BoxPlotStats | null | undefined,
    centerX: number,
    color: string,
    fillBg: string,
    label: string
  ) => {
    if (!stats || stats.count === 0) {
      return (
        <text
          x={centerX}
          y={paddingTop + plotH / 2}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize="11"
        >
          Tidak ada data
        </text>
      );
    }

    const yMinPt = getY(stats.min_value);
    const yQ1Pt = getY(stats.q1);
    const yMedPt = getY(stats.median);
    const yMeanPt = getY(stats.mean);
    const yQ3Pt = getY(stats.q3);
    const yMaxPt = getY(stats.max_value);

    const boxTop = Math.min(yQ1Pt, yQ3Pt);
    const boxHeight = Math.max(2, Math.abs(yQ1Pt - yQ3Pt));

    return (
      <g>
        {/* Whisker Bawah: Min ke Q1 */}
        <line
          x1={centerX}
          y1={yMinPt}
          x2={centerX}
          y2={yQ1Pt}
          stroke={color}
          strokeWidth="1.5"
        />
        {/* Cap Min */}
        <line
          x1={centerX - capWidth / 2}
          y1={yMinPt}
          x2={centerX + capWidth / 2}
          y2={yMinPt}
          stroke={color}
          strokeWidth="2"
        />

        {/* Whisker Atas: Q3 ke Max */}
        <line
          x1={centerX}
          y1={yQ3Pt}
          x2={centerX}
          y2={yMaxPt}
          stroke={color}
          strokeWidth="1.5"
        />
        {/* Cap Max */}
        <line
          x1={centerX - capWidth / 2}
          y1={yMaxPt}
          x2={centerX + capWidth / 2}
          y2={yMaxPt}
          stroke={color}
          strokeWidth="2"
        />

        {/* Kotak IQR (Q1 ke Q3) */}
        <rect
          x={centerX - boxWidth / 2}
          y={boxTop}
          width={boxWidth}
          height={boxHeight}
          fill={fillBg}
          stroke={color}
          strokeWidth="1.75"
          rx="3"
        >
          <title>
            {label}
            {'\n'}Max: {stats.max_value.toFixed(2)} kg
            {'\n'}Q3 (75%): {stats.q3.toFixed(2)} kg
            {'\n'}Median: {stats.median.toFixed(2)} kg
            {'\n'}Mean: {stats.mean.toFixed(2)} kg
            {'\n'}Q1 (25%): {stats.q1.toFixed(2)} kg
            {'\n'}Min: {stats.min_value.toFixed(2)} kg
            {'\n'}N: {stats.count} balita
          </title>
        </rect>

        {/* Median Bar */}
        <line
          x1={centerX - boxWidth / 2}
          y1={yMedPt}
          x2={centerX + boxWidth / 2}
          y2={yMedPt}
          stroke={color}
          strokeWidth="2.5"
        />

        {/* Mean Dot */}
        <circle
          cx={centerX}
          cy={yMeanPt}
          r="3.5"
          fill="#ffffff"
          stroke={color}
          strokeWidth="2"
        />

        {/* Nilai Median Text di Samping Kotak */}
        <text
          x={centerX + boxWidth / 2 + 5}
          y={yMedPt + 3}
          fill={color}
          fontSize="10"
          fontWeight="bold"
        >
          {stats.median.toFixed(2)}
        </text>
      </g>
    );
  };

  const yThresholdPt = getY(threshold);

  return (
    <div className="w-full flex flex-col items-center">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto max-h-64 select-none"
      >
        {/* Grid lines horizontal */}
        {ticks.map((t) => {
          const y = getY(t);
          const isThresh = t === threshold;
          return (
            <g key={t}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={width - paddingRight}
                y2={y}
                stroke={isThresh ? '#ef4444' : '#e2e8f0'}
                strokeWidth={isThresh ? '1.5' : '1'}
                strokeDasharray={isThresh ? '4 3' : undefined}
                opacity={isThresh ? 0.9 : 0.7}
              />
              <text
                x={paddingLeft - 8}
                y={y + 3.5}
                textAnchor="end"
                fontSize="10"
                fill={isThresh ? '#dc2626' : '#64748b'}
                fontWeight={isThresh ? 'bold' : 'normal'}
              >
                {t.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Sumbu Y Label */}
        <text
          x={-(paddingTop + plotH / 2)}
          y={14}
          transform="rotate(-90)"
          textAnchor="middle"
          fontSize="10.5"
          fill="#64748b"
          fontWeight="500"
        >
          Berat Lahir (kg)
        </text>

        {/* Garis Referensi Batas BBLR Label */}
        <text
          x={width - paddingRight}
          y={yThresholdPt - 4}
          textAnchor="end"
          fontSize="9"
          fill="#dc2626"
          fontWeight="600"
        >
          Batas BBLR (2,5 kg)
        </text>

        {/* Render Box Stunting (Merah) */}
        {renderSingleBox(
          stuntingStats,
          xStunting,
          '#ef4444',
          '#fef2f2',
          'Stunting'
        )}

        {/* Render Box Tidak Stunting (Biru) */}
        {renderSingleBox(
          normalStats,
          xNormal,
          '#2563eb',
          '#eff6ff',
          'Tidak Stunting'
        )}

        {/* Sumbu X Categories Label */}
        <text
          x={xStunting}
          y={height - 12}
          textAnchor="middle"
          fontSize="11.5"
          fontWeight="600"
          fill="#dc2626"
        >
          Stunting
        </text>
        <text
          x={xNormal}
          y={height - 12}
          textAnchor="middle"
          fontSize="11.5"
          fontWeight="600"
          fill="#1d4ed8"
        >
          Tidak Stunting
        </text>
      </svg>

      {/* Ringkasan Median & Rata-rata Bawah */}
      <div className="flex items-center justify-around w-full mt-1 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
        <div>
          <span className="font-semibold text-rose-600">Stunting:</span> Median{' '}
          <strong>{stuntingStats?.median.toFixed(2) ?? '-'} kg</strong> (Mean:{' '}
          {stuntingStats?.mean.toFixed(2) ?? '-'} kg)
        </div>
        <div>
          <span className="font-semibold text-blue-600">Tidak Stunting:</span> Median{' '}
          <strong>{normalStats?.median.toFixed(2) ?? '-'} kg</strong> (Mean:{' '}
          {normalStats?.mean.toFixed(2) ?? '-'} kg)
        </div>
      </div>
    </div>
  );
};

