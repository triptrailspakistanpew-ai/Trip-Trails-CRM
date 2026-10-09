"use client";
import { useBranchStore } from "@/store/branch.store";

import { ComposedChart, Bar, Line, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatShort } from "@/lib/utils";

interface ComboChartProps {
  data: any[];
  xKey?: string;
  barSeries: { key: string; color: string; label?: string };
  lineSeries: { key: string; color: string; label?: string };
  height?: number;
}

export function ComboChart({ data, xKey = "name", barSeries, lineSeries, height = 300 }: ComboChartProps) {
  const activeCurrency = useBranchStore((state) => state.activeCurrency);

  return (
    <div style={{ width: '100%', height: height }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--tf-border)" />
          <XAxis 
            dataKey={xKey} 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: "var(--tf-text-muted)" }} 
            dy={10}
          />
          <YAxis 
            yAxisId="left"
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: "var(--tf-text-muted)" }} 
            tickFormatter={(value) => formatShort(value)}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: "var(--tf-text-muted)" }} 
            tickFormatter={(value) => formatShort(value)}
          />
          <Tooltip 
            cursor={{ fill: 'var(--tf-surface-2)', opacity: 0.5 }}
            contentStyle={{ backgroundColor: "var(--tf-surface)", borderColor: "var(--tf-border)", borderRadius: "8px", boxShadow: "var(--shadow-md)" }}
            itemStyle={{ fontSize: 14, fontWeight: 500 }}
            labelStyle={{ color: "var(--tf-text-secondary)", marginBottom: 4 }}
            formatter={(value, name) => {
              const num = typeof value === 'number' ? value : 0;
              return [`${activeCurrency} ${num.toLocaleString()}`, String(name)];
            }}
          />
          
          <Bar
            yAxisId="left"
            dataKey={barSeries.key}
            name={barSeries.label || barSeries.key}
            fill={barSeries.color}
            radius={[4, 4, 0, 0]}
            animationDuration={600}
            animationEasing="ease-out"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey={lineSeries.key}
            name={lineSeries.label || lineSeries.key}
            stroke={lineSeries.color}
            strokeWidth={3}
            dot={{ r: 4, fill: lineSeries.color, strokeWidth: 2, stroke: "var(--tf-surface)" }}
            activeDot={{ r: 6 }}
            animationDuration={600}
            animationEasing="ease-out"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
