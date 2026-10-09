"use client";

import { Line, LineChart as RechartsLineChart } from "recharts";

interface SparklineChartProps {
  data: number[];
  color: string;
  height?: number;
  width?: number;
}

export function SparklineChart({ data, color, height = 30, width = 80 }: SparklineChartProps) {
  // Format data for recharts
  const chartData = data.map((val, i) => ({ value: val, index: i }));

  return (
    <div style={{ width, height }}>
      <RechartsLineChart data={chartData} width={width} height={height}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          isAnimationActive={true}
          animationDuration={600}
          animationEasing="ease-out"
        />
      </RechartsLineChart>
    </div>
  );
}
