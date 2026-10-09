"use client";
import { useBranchStore } from "@/store/branch.store";

import { Area, AreaChart as RechartsAreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatShort } from "@/lib/utils";

interface AreaChartProps {
  data: any[];
  xKey?: string;
  series: {
    key: string;
    color: string;
    label?: string;
  }[];
  height?: number;
}

export function AreaChart({ data, xKey = "name", series, height = 300 }: AreaChartProps) {
  const activeCurrency = useBranchStore((state) => state.activeCurrency);

  return (
    <div style={{ width: '100%', height: height }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <RechartsAreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={`color-${s.key}`} id={`color-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={s.color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--tf-border)" />
          <XAxis 
            dataKey={xKey} 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: "var(--tf-text-muted)" }} 
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: "var(--tf-text-muted)" }} 
            tickFormatter={(value) => formatShort(value)}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: "var(--tf-surface)", borderColor: "var(--tf-border)", borderRadius: "8px", boxShadow: "var(--shadow-md)" }}
            itemStyle={{ fontSize: 14, fontWeight: 500 }}
            labelStyle={{ color: "var(--tf-text-secondary)", marginBottom: 4 }}
            formatter={(value, name) => {
              const num = typeof value === 'number' ? value : 0;
              return [`${activeCurrency} ${num.toLocaleString()}`, String(name)];
            }}
          />
          {series.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label || s.key}
              stroke={s.color}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#color-${s.key})`}
              animationDuration={600}
              animationEasing="ease-out"
            />
          ))}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
}
