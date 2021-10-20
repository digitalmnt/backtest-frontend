import { useState, useEffect, useContext } from 'react'
import { ResponsiveContainer, XAxis, YAxis, Tooltip, AreaChart, Area, Legend } from 'recharts'
import { ThemeContext } from 'styled-components/macro'
import dayjs from 'dayjs'
import { ReturnsData, PriceData } from './chartData'

export type LineChartProps = {
  color?: string | undefined
  height?: number | undefined
  minHeight?: number
  value?: number
  label?: string
  returnsData?: ReturnsData[]
  priceData?: PriceData[]
  chartDataValues?: PriceData[] | ReturnsData[]
  chartType: string
} & React.HTMLAttributes<HTMLDivElement>

interface LineProps {
  key: string
  color: string
}

const colors: any = {
  'PNL ($)': 'blue1',
  'Fees Earned': 'green1',
  'Impermanent Loss': 'yellow2',
  Price: 'blue1',
  'Price Lower Tick': 'yellow2',
  'Price Upper Tick': 'yellow2',
}

function getLineData(data: any) {
  const keys = data[0]
  delete keys.time
  return Object.keys(data[0]).map((key) => ({
    color: colors[key],
    key,
  }))
}

export const BTAreaChart = ({ chartDataValues }: LineChartProps) => {
  const theme: any = useContext(ThemeContext)
  const [chartData, setchartData] = useState<PriceData[] | ReturnsData[]>()
  const [lines, setLines] = useState<LineProps[]>()
  useEffect(() => {
    setLines(getLineData(chartDataValues))
    setchartData(chartDataValues)
  }, [chartDataValues])

  return (
    <ResponsiveContainer width="95%" height={600}>
      <AreaChart
        data={chartData}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <XAxis
          dataKey="time"
          axisLine={false}
          tickLine={false}
          allowDataOverflow={false}
          tickFormatter={(time) => dayjs.unix(time).format('MM-DD')}
          minTickGap={10}
        />
        <YAxis type="number" domain={['auto', 'auto']} />
        <Tooltip
          cursor={{ stroke: theme.primary1 }}
          contentStyle={{
            background: theme.bg1,
            border: theme.bg0,
            borderRadius: 10,
            color: theme.bg1,
          }}
          // todo format tooltip
          // formatter={({ active, payload, label }: { active: any; payload: any; label: any }) => {
          //   if (active && payload && payload.length) {
          //     console.log({ active, payload, label })
          //   }
          // }}
        />
        {lines?.map((line) => (
          <Area
            key={line.key}
            dataKey={line.key}
            type="monotone"
            stroke={theme[line.color]}
            fill="url(#gradient)"
            strokeWidth={2}
          />
        ))}
        <Legend verticalAlign="top" height={36} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
