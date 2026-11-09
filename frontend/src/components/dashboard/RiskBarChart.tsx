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
export interface RiskFactorChartItem {
  faktor: string;
  jumlah: number;
  warna?: string | null;
}

interface RiskBarChartProps {
  data: RiskFactorChartItem[];
}

const DEFAULT_BAR_COLOR = '#0d9488';

export const RiskBarChart: React.FC<RiskBarChartProps> = ({ data }) => {
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
          dataKey="faktor"
          tick={{ fontSize: 12, fill: '#334155', fontWeight: 500 }}
          tickLine={false}
          axisLine={false}
          width={168}
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
            padding: '6px 10px',
          }}
          formatter={(value) => [`${value ?? 0} kasus`, 'Jumlah']}
          labelStyle={{ fontWeight: 600, color: '#1e293b' }}
        />
        <Bar
          dataKey="jumlah"
          name="Jumlah"
          radius={[0, 4, 4, 0]}
          barSize={20}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.warna || DEFAULT_BAR_COLOR} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
