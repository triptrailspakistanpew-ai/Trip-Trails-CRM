"use client";
import { useBranchStore } from "@/store/branch.store";

import { Bar, BarChart as RechartsBarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, LabelList } from "recharts";
import { formatShort } from "@/lib/utils";

interface BarChartProps {
  data: any[];
  xKey?: string;
  series: {
    key: string;
    color: string;
    label?: string;
  }[];
  height?: number;
  layout?: "vertical" | "horizontal";
  showValueOnBars?: boolean;
}

export function BarChart({ data, xKey = "name", series, height = 300, layout = "horizontal", showValueOnBars = false }: BarChartProps) {
  const activeCurrency = useBranchStore((state) => state.activeCurrency);

  const isVertical = layout === "vertical";
  
  return (
    <div style={{ width: '100%', height: height }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <RechartsBarChart 
          data={data} 
          layout={layout}
          margin={{ top: 10, right: 20, left: isVertical ? 20 : -20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={!isVertical} horizontal={isVertical} stroke="var(--tf-border)" />
          
          {isVertical ? (
            <>
              <XAxis 
                type="number" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: "var(--tf-text-muted)" }} 
                tickFormatter={(value) => formatShort(value)}
              />
              <YAxis 
                dataKey={xKey} 
                type="category" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: "var(--tf-text-secondary)", fontWeight: 500 }} 
                width={100}
              />
            </>
          ) : (
            <>
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
            </>
          )}
          
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
          
          {series.map((s) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label || s.key}
              fill={s.color}
              radius={isVertical ? [0, 4, 4, 0] : [4, 4, 0, 0]}
              animationDuration={600}
              animationEasing="ease-out"
              barSize={isVertical ? 24 : undefined}
            >
              {showValueOnBars && (
                <LabelList 
                  dataKey={s.key} 
                  position={isVertical ? "right" : "top"} 
                  formatter={(val: unknown) => formatShort(Number(val))}
                  style={{ fill: "var(--tf-text-secondary)", fontSize: 12, fontWeight: 600 }}
                />
              )}
            </Bar>
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
