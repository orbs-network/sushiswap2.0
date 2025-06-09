import type { V4Pool } from '@sushiswap/graph-client/data-api'
import { useMemo } from 'react'
import {
  type TickProcessed,
  useConcentratedActiveLiquidity as useConcentratedActiveLiquidityV3,
} from 'src/lib/pool/v3'
import { useConcentratedActiveLiquidity as useConcentratedActiveLiquidityV4 } from 'src/lib/pool/v4'
import type { PoolKey, SushiSwapV4ChainId } from 'src/lib/pool/v4'
import type { SushiSwapV3ChainId, SushiSwapV3FeeAmount } from 'sushi/config'
import type { Type } from 'sushi/currency'
import type { ChartEntry } from './types'

interface UseDensityChartDataV3 {
  chainId: SushiSwapV3ChainId
  token0: Type | undefined
  token1: Type | undefined
  feeAmount: SushiSwapV3FeeAmount | undefined
  enabled?: boolean
}

export function UseDensityChartDataV3({
  chainId,
  token0,
  token1,
  feeAmount,
  enabled = true,
}: UseDensityChartDataV3) {
  const activeLiquidity = useConcentratedActiveLiquidityV3({
    chainId,
    token0,
    token1,
    feeAmount,
    enabled,
  })

  return useMemo(() => {
    const data = activeLiquidity.data
    if (!data) return activeLiquidity

    const newData: ChartEntry[] = []
    for (let i = 0; i < data.length; i++) {
      const t: TickProcessed = data[i]

      const chartEntry = {
        activeLiquidity: Number.parseFloat(t.liquidityActive.toString()),
        price0: Number.parseFloat(t.price0),
      }

      if (chartEntry.activeLiquidity > 0) {
        newData.push(chartEntry)
      }
    }

    return {
      ...activeLiquidity,
      data: newData,
    }
  }, [activeLiquidity])
}

interface UseDensityChartDataV4 {
  chainId: SushiSwapV4ChainId
  currency0: Type | undefined
  currency1: Type | undefined
  poolKey: PoolKey
  enabled?: boolean
}

export function UseDensityChartDataV4({
  chainId,
  currency0,
  currency1,
  poolKey,
  enabled = true,
}: UseDensityChartDataV4) {
  const activeLiquidity = useConcentratedActiveLiquidityV4({
    chainId,
    currency0,
    currency1,
    poolKey,
    enabled,
  })

  return useMemo(() => {
    const data = activeLiquidity.data
    if (!data) return { ...activeLiquidity, data }

    const newData: ChartEntry[] = []
    for (let i = 0; i < data.length; i++) {
      const t: TickProcessed = data[i]

      const chartEntry = {
        activeLiquidity: Number.parseFloat(t.liquidityActive.toString()),
        price0: Number.parseFloat(t.price0),
      }

      if (chartEntry.activeLiquidity > 0) {
        newData.push(chartEntry)
      }
    }

    return {
      ...activeLiquidity,
      data: newData,
    }
  }, [activeLiquidity])
}
