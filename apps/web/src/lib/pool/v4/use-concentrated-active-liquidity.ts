import { useMemo } from 'react'
import { useConcentratedLiquidityPoolV4 } from 'src/lib/wagmi/hooks/pools/hooks/useConcentratedLiquidityPoolV4'
import type { Type } from 'sushi/currency'
import type { TickProcessed } from '../v3'
import { type PoolKey, type SushiSwapV4ChainId, tickToPrice } from '../v4'
import { useTicks } from './use-ticks'

const getActiveTick = (
  tickCurrent: number | undefined,
  tickSpacing: number | undefined,
) =>
  typeof tickCurrent !== 'undefined' && typeof tickSpacing !== 'undefined'
    ? Math.floor(tickCurrent / tickSpacing) * tickSpacing
    : undefined

const useAllV4Ticks = ({
  currency0,
  currency1,
  chainId,
  poolKey,
  enabled,
}: {
  chainId: SushiSwapV4ChainId
  currency0: Type | undefined
  currency1: Type | undefined
  poolKey: PoolKey | undefined
  enabled?: boolean
}) => {
  // TODO: Add subgraph support
  return useTicks({ chainId, currency0, currency1, poolKey, enabled })
}

export function useConcentratedActiveLiquidity({
  chainId,
  currency0,
  currency1,
  poolKey,
  enabled,
}: {
  chainId: SushiSwapV4ChainId
  currency0: Type | undefined
  currency1: Type | undefined
  poolKey: PoolKey | undefined
  enabled?: boolean
}): {
  isLoading: boolean
  error: Error | null
  activeTick: number | undefined
  data: TickProcessed[] | undefined
} {
  const { data: pool, isLoading: isPoolLoading } =
    useConcentratedLiquidityPoolV4({
      currency0,
      currency1,
      chainId,
      poolKey,
      enabled,
    })

  const activeTick = useMemo(
    () =>
      getActiveTick(
        pool?.tickCurrent ? pool.tickCurrent : undefined,
        pool?.tickSpacing,
      ),
    [pool?.tickCurrent, pool?.tickSpacing],
  )

  const {
    isLoading,
    error,
    data: ticks,
  } = useAllV4Ticks({ chainId, currency0, currency1, poolKey, enabled })

  return useMemo(() => {
    if (
      !currency0 ||
      !currency1 ||
      activeTick === undefined ||
      !pool ||
      !ticks ||
      ticks.length === 0 ||
      isLoading
    ) {
      return {
        isLoading: isLoading || isPoolLoading,
        error,
        activeTick,
        data: undefined,
      }
    }

    // find where the active tick would be to partition the array
    // if the active tick is initialized, the pivot will be an element
    // if not, take the previous tick as pivot
    const pivot = ticks.findIndex(({ tickIdx }) => tickIdx > activeTick) - 1

    if (pivot < 0) {
      // consider setting a local error
      console.error('TickData pivot not found')
      return {
        isLoading,
        error,
        activeTick,
        data: undefined,
      }
    }

    const activeTickProcessed: TickProcessed = {
      liquidityActive: BigInt(pool?.liquidity.toString()) ?? 0n,
      tick: activeTick,
      liquidityNet:
        Number(ticks[pivot].tickIdx) === activeTick
          ? ticks[pivot].liquidityNet
          : 0n,
      price0: tickToPrice(currency0, currency1, activeTick).toFixed(
        PRICE_FIXED_DIGITS,
      ),
    }

    const subsequentTicks = computeSurroundingTicks(
      currency0,
      currency1,
      activeTickProcessed,
      ticks,
      pivot,
      true,
    )
    const previousTicks = computeSurroundingTicks(
      currency0,
      currency1,
      activeTickProcessed,
      ticks,
      pivot,
      false,
    )
    const ticksProcessed = previousTicks
      .concat(activeTickProcessed)
      .concat(subsequentTicks)

    return {
      isLoading,
      error,
      activeTick,
      data: ticksProcessed,
    }
  }, [
    currency0,
    currency1,
    activeTick,
    pool,
    ticks,
    isLoading,
    error,
    isPoolLoading,
  ])
}

const PRICE_FIXED_DIGITS = 8

// Computes the numSurroundingTicks above or below the active tick.
function computeSurroundingTicks(
  currency0: Type,
  currency1: Type,
  activeTickProcessed: TickProcessed,
  sortedTickData: NonNullable<ReturnType<typeof useTicks>['data']>,
  pivot: number,
  ascending: boolean,
): TickProcessed[] {
  let previousTickProcessed: TickProcessed = {
    ...activeTickProcessed,
  }
  // Iterate outwards (either up or down depending on direction) from the active tick,
  // building active liquidity for every tick.
  let processedTicks: TickProcessed[] = []
  for (
    let i = pivot + (ascending ? 1 : -1);
    ascending ? i < sortedTickData.length : i >= 0;
    ascending ? i++ : i--
  ) {
    const tick = Number(sortedTickData[i].tickIdx)
    const currentTickProcessed: TickProcessed = {
      liquidityActive: previousTickProcessed.liquidityActive,
      tick,
      liquidityNet: sortedTickData[i].liquidityNet,
      price0: tickToPrice(currency0, currency1, tick).toFixed(
        PRICE_FIXED_DIGITS,
      ),
    }

    // Update the active liquidity.
    // If we are iterating ascending and we found an initialized tick we immediately apply
    // it to the current processed tick we are building.
    // If we are iterating descending, we don't want to apply the net liquidity until the following tick.
    if (ascending) {
      currentTickProcessed.liquidityActive =
        previousTickProcessed.liquidityActive + sortedTickData[i].liquidityNet
    } else if (!ascending && previousTickProcessed.liquidityNet !== 0n) {
      // We are iterating descending, so look at the previous tick and apply any net liquidity.
      currentTickProcessed.liquidityActive =
        previousTickProcessed.liquidityActive -
        previousTickProcessed.liquidityNet
    }

    processedTicks.push(currentTickProcessed)
    previousTickProcessed = currentTickProcessed
  }

  if (!ascending) {
    processedTicks = processedTicks.reverse()
  }

  return processedTicks
}

export type { TickProcessed }
