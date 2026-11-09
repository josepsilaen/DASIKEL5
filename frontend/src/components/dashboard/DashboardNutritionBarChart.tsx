import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { DistributionItem } from '../../types/visualization';

interface DashboardNutritionBarChartProps {
  data: DistributionItem[];
}

const CATEGORY_COLORS: Record<string, string> = {
  'Sangat Pendek': '#dc2626', // Red-600
  'Pendek': '#f59e0b',        // Amber-500
  'Normal': '#10b981',       // Emerald-500
  'Tinggi': '#3b82f6',       // Blue-500
};

export const DashboardNutritionBarChart: React.FC<DashboardNutritionBarChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">
        Tidak ada data distribusi antropometri
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={290}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 24, left: 4, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 12, fill: '#64748b' }}
          tickLine={false}
          axisLine={{ stroke: '#cbd5e1' }}
        />
        <YAxis
          type="category"
          dataKey="category"
          tick={{ fontSize: 12, fill: '#334155', fontWeight: 500 }}
          tickLine={false}
          axisLine={false}
          width={130}
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
            padding: '6px 10px',
          }}
          formatter={(value: any, _name: any, item: any) => [
            `${value ?? 0} balita (${item.payload?.percentage ?? 0}%)`,
            'Jumlah',
          ]}
          labelStyle={{ fontWeight: 600, color: '#1e293b' }}
        />
        <Bar
          dataKey="count"
          name="Jumlah Balita"
          radius={[0, 4, 4, 0]}
          barSize={22}
        >
          {data.map((entry, index) => {
            const color = CATEGORY_COLORS[entry.category] || '#0d9488';
            return <Cell key={`cell-${index}`} fill={color} />;
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
