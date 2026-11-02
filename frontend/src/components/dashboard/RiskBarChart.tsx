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
import type { RiskFactorItem } from '../../data/dashboard';

interface RiskBarChartProps {
  data: RiskFactorItem[];
}

export const RiskBarChart: React.FC<RiskBarChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 24, left: 4, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 12, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={{ stroke: '#e2e8f0' }}
        />
        <YAxis
          type="category"
          dataKey="faktor"
          tick={{ fontSize: 12, fill: '#64748b' }}
          tickLine={false}
          axisLine={false}
          width={160}
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
          formatter={(value) => [`${value ?? 0} kasus`, 'Jumlah']}
          labelStyle={{ fontWeight: 600, color: '#334155' }}
        />
        <Bar
          dataKey="jumlah"
          name="Jumlah"
          radius={[0, 4, 4, 0]}
          barSize={20}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.warna} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
