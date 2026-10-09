"use client";
import { useBranchStore } from "@/store/branch.store";

import {
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { formatShort } from "@/lib/utils";

interface DonutChartProps {
  data: { name: string; value: number; color: string }[];
  height?: number;
  centerLabel?: string;
  centerValue?: string | number;
}

export function DonutChart({
  data,
  height = 300,
  centerLabel,
  centerValue,
}: DonutChartProps) {
  const activeCurrency = useBranchStore((state) => state.activeCurrency);

  return (
    <div
      style={{ width: "100%", height: height }}
      className="relative flex items-center justify-center"
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={1}
        minHeight={1}
      >
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="80%"
            paddingAngle={2}
            dataKey="value"
            stroke="none"
            animationDuration={600}
            animationEasing="ease-out"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--tf-surface)",
              borderColor: "var(--tf-border)",
              borderRadius: "8px",
              boxShadow: "var(--shadow-sm)",
            }}
            itemStyle={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--tf-text-primary)",
            }}
            formatter={(value, name) => {
              const num = typeof value === "number" ? value : 0;
              return [`${activeCurrency} ${formatShort(num)}`, String(name)];
            }}
          />
        </RechartsPieChart>
      </ResponsiveContainer>

      {(centerLabel || centerValue) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {centerValue && (
            <span className="tf-h3 text-tf-text-primary">{centerValue}</span>
          )}
          {centerLabel && (
            <span className="tf-caption text-tf-text-muted">{centerLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
