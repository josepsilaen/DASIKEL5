import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Cell,
} from 'recharts';
import type { CategoryPrevalenceItem } from '../../types/dashboard';

interface BblrPrevalenceBarChartProps {
  categories: CategoryPrevalenceItem[];
}

export const BblrPrevalenceBarChart: React.FC<BblrPrevalenceBarChartProps> = ({
  categories,
}) => {
  if (!categories || categories.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center p-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
        <p className="text-xs text-slate-400">Data prevalensi BBLR belum tersedia.</p>
      </div>
    );
  }

  // Format data untuk Recharts
  const chartData = categories.map((c) => ({
    category: c.category,
    stunting_rate: c.stunting_rate,
    stunting_count: c.stunting_count,
    total_count: c.total_count,
    normal_count: c.normal_count,
    isBblr: c.category.toLowerCase().includes('bblr'),
  }));

  // Hitung batas atas YAxis agar label nilai di atas bar tidak terpotong
  const maxVal = Math.max(...chartData.map((d) => d.stunting_rate), 10);
  const yDomainMax = Math.ceil((maxVal + 8) / 10) * 10;

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full h-60">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 25, right: 25, left: -10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="category"
              tick={{ fontSize: 11.5, fill: '#334155', fontWeight: 600 }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
            />
            <YAxis
              unit="%"
              tick={{ fontSize: 11, fill: '#64748b' }}
              domain={[0, yDomainMax]}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
            />
            <Tooltip
              formatter={(value: any, _name: any, item: any) => [
                `${Number(value).toFixed(1)}% (${item.payload.stunting_count} stunting dari ${item.payload.total_count} balita)`,
                'Prevalensi Stunting',
              ]}
              contentStyle={{
                backgroundColor: '#0f172a',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '12px',
                border: 'none',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
            />
            <Bar
              dataKey="stunting_rate"
              name="Prevalensi Stunting"
              radius={[6, 6, 0, 0]}
              maxBarSize={55}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isBblr ? '#ef4444' : '#2563eb'}
                />
              ))}
              <LabelList
                dataKey="stunting_rate"
                position="top"
                formatter={(val: any) => `${Number(val).toFixed(1)}%`}
                style={{
                  fontSize: '12px',
                  fontWeight: 'bold',
                  fill: '#1e293b',
                }}
                offset={6}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Ringkasan Bawah Bar Chart */}
      <div className="flex items-center justify-around w-full mt-1 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
        {chartData.map((d) => (
          <div key={d.category} className="text-center">
            <span
              className={`font-semibold ${
                d.isBblr ? 'text-rose-600' : 'text-blue-600'
              }`}
            >
              {d.category}:
            </span>{' '}
            <strong>{d.stunting_rate.toFixed(1)}%</strong> ({d.stunting_count}/{d.total_count} balita)
          </div>
        ))}
      </div>
    </div>
  );
};

