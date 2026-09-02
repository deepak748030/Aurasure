'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { moneyShort, shortDate } from '@/lib/format';

const BRAND = '#5b46e5';
const FOOD = '#ff6a3d';
const INK = '#8b93a7';
const LINE = '#e7e9f1';

const AXIS = {
  stroke: INK,
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

const tooltipStyle = {
  borderRadius: 10,
  border: `1px solid ${LINE}`,
  boxShadow: '0 10px 30px rgba(11,16,32,0.12)',
  fontSize: 12.5,
  padding: '8px 10px',
} as const;

export function RevenueChart({
  data,
  height = 280,
}: {
  data: { date: string; revenue: number; orders: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid stroke={LINE} vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} {...AXIS} minTickGap={18} />
        <YAxis tickFormatter={(v: number) => moneyShort(v)} width={64} {...AXIS} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={(label: string) => shortDate(label)}
          formatter={(value: number, name: string) =>
            name === 'revenue' ? [moneyShort(value), 'Revenue'] : [value, 'Orders']
          }
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke={BRAND}
          strokeWidth={2}
          fill={BRAND}
          fillOpacity={0.08}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function OrdersBarChart({
  data,
  height = 260,
}: {
  data: { date: string; orders: number; cancelled: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barGap={2}>
        <CartesianGrid stroke={LINE} vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} {...AXIS} minTickGap={18} />
        <YAxis allowDecimals={false} width={40} {...AXIS} />
        <Tooltip contentStyle={tooltipStyle} labelFormatter={(label: string) => shortDate(label)} cursor={{ fill: '#f1f3f9' }} />
        <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
        <Bar dataKey="orders" name="Orders" fill={BRAND} radius={[4, 4, 0, 0]} maxBarSize={26} />
        <Bar dataKey="cancelled" name="Cancelled" fill={FOOD} radius={[4, 4, 0, 0]} maxBarSize={26} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const DONUT_COLORS = ['#5b46e5', '#ff6a3d', '#16a34a', '#f59e0b', '#0ea5e9', '#8b93a7'];

export function SplitDonut({
  data,
  height = 240,
  valueKey = 'orders',
}: {
  data: { key: string; orders: number; revenue?: number }[];
  height?: number;
  valueKey?: 'orders' | 'revenue';
}) {
  const rows = data.filter((row) => Number(row[valueKey] ?? 0) > 0);
  if (!rows.length) {
    return <p className="py-10 text-center text-[13px] text-ink-400">No data for this period yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={rows}
          dataKey={valueKey}
          nameKey="key"
          innerRadius="58%"
          outerRadius="82%"
          paddingAngle={2}
          stroke="#ffffff"
          strokeWidth={2}
        >
          {rows.map((row, index) => (
            <Cell key={row.key} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value: number) => (valueKey === 'revenue' ? moneyShort(value) : value)}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
      </PieChart>
    </ResponsiveContainer>
  );
}
