import type { V4Pool } from '@sushiswap/graph-client/data-api'
import { Card } from '@sushiswap/ui'
import React, { type FC, useMemo, useState } from 'react'
import type { PoolKey } from 'src/lib/pool/v4'
import { SushiSwapProtocol } from 'sushi'
import { LiquidityDepthWidgetV4 } from './LiquidityDepthWidgetV4'
import { PoolChartGraph } from './PoolChartGraph'
import { PoolChartPeriod, PoolChartPeriods } from './PoolChartPeriods'
import { PoolChartType, PoolChartTypes } from './PoolChartTypes'

const statisticsChart = [
  PoolChartType.Volume,
  PoolChartType.TVL,
  PoolChartType.Fees,
  PoolChartType.Depth,
]

interface Charts {
  pool: V4Pool
  poolKey: PoolKey
}

export const StatisticsChartsV4: FC<Charts> = ({ pool, poolKey }) => {
  const [chart, setChart] = useState<PoolChartType>(statisticsChart[0])
  const [period, setPeriod] = useState<PoolChartPeriod>(PoolChartPeriod.Month)

  const periods = useMemo(() => {
    if (chart === PoolChartType.Depth) return []

    return [
      PoolChartPeriod.Day,
      PoolChartPeriod.Week,
      PoolChartPeriod.Month,
      PoolChartPeriod.Year,
      PoolChartPeriod.All,
    ]
  }, [chart])

  return (
    <Card>
      <div className="border-b border-accent px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex mx-auto">
          <PoolChartTypes
            charts={statisticsChart}
            selectedChart={chart}
            setChart={setChart}
          />
        </div>
        <div className="flex mx-auto">
          <PoolChartPeriods
            periods={periods}
            selectedPeriod={period}
            setPeriod={setPeriod}
          />
        </div>
      </div>
      {chart === PoolChartType.Depth ? (
        <LiquidityDepthWidgetV4 poolKey={poolKey} pool={pool} />
      ) : (
        <PoolChartGraph
          chart={chart}
          period={period}
          pool={pool}
          protocol={SushiSwapProtocol.SUSHISWAP_V3}
        />
      )}
    </Card>
  )
}
