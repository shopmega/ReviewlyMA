"use client"

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"


const chartData = [
  { month: "Janvier", views: 186 },
  { month: "Février", views: 305 },
  { month: "Mars", views: 237 },
  { month: "Avril", views: 73 },
  { month: "Mai", views: 209 },
  { month: "Juin", views: 214 },
]

const chartConfig = {
  views: {
    label: "Vues",
    color: "hsl(var(--primary))",
  },
}

export function AnalyticsChart() {
  return (
      <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
        <BarChart accessibilityLayer data={chartData} margin={{ top: 20 }}>
            <CartesianGrid vertical={false} />
            <XAxis
                dataKey="month"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) => value.slice(0, 3)}
            />
             <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={10}
            />
            <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
            />
            <Bar dataKey="views" fill="var(--color-views)" radius={4} />
        </BarChart>
    </ChartContainer>
  )
}
