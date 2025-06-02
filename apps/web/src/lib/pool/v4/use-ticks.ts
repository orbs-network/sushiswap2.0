'use client'

import { useMemo } from 'react'
import { useConcentratedLiquidityPoolV4 } from 'src/lib/wagmi/hooks/pools/hooks/useConcentratedLiquidityPoolV4'
import type { Type } from 'sushi/currency'
import {
  computeSushiSwapV3PoolAddress,
  nearestUsableTick,
} from 'sushi/pool/sushiswap-v3'
import type { Address } from 'viem'
import { useReadContracts } from 'wagmi'
import type { Writeable } from 'zod'
import { SUSHISWAP_V4_CL_TICK_LENS, type SushiSwapV4ChainId } from './config'
import { type PoolKey, getPoolId } from './sdk'

interface useTicksProps {
  currency0: Type | undefined
  currency1: Type | undefined
  chainId: SushiSwapV4ChainId
  poolKey: PoolKey | undefined
  numSurroundingTicks?: number | undefined
  enabled?: boolean | undefined
}

const bitmapIndex = (tick: number, tickSpacing: number) => {
  return Math.floor(tick / tickSpacing / 256)
}

const getPopulatedTicksInWordAbiShard = [
  {
    inputs: [
      {
        internalType: 'PoolId',
        name: 'id',
        type: 'bytes32',
      },
      {
        internalType: 'int16',
        name: 'tickBitmapIndex',
        type: 'int16',
      },
    ],
    name: 'getPopulatedTicksInWord',
    outputs: [
      {
        components: [
          {
            internalType: 'int24',
            name: 'tick',
            type: 'int24',
          },
          {
            internalType: 'int128',
            name: 'liquidityNet',
            type: 'int128',
          },
          {
            internalType: 'uint128',
            name: 'liquidityGross',
            type: 'uint128',
          },
        ],
        internalType: 'struct ITickLens.PopulatedTick[]',
        name: 'populatedTicks',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const

export function useTicks({
  currency0,
  currency1,
  chainId,
  poolKey,
  numSurroundingTicks: _numSurroundingTicks,
  enabled,
}: useTicksProps) {
  const numSurroundingTicks = _numSurroundingTicks ?? 1250

  const { data: pool } = useConcentratedLiquidityPoolV4({
    currency0,
    currency1,
    chainId,
    poolKey,
    enabled,
  })

  const tickSpacing = poolKey?.parameters.tickSpacing

  const activeTick =
    typeof pool?.tickCurrent === 'number' && tickSpacing
      ? nearestUsableTick(pool?.tickCurrent, tickSpacing)
      : undefined

  const poolId = useMemo(
    () => (poolKey ? getPoolId(poolKey) : undefined),
    [poolKey],
  )

  const minIndex = useMemo(
    () =>
      tickSpacing !== undefined && activeTick !== undefined
        ? bitmapIndex(
            activeTick - numSurroundingTicks * tickSpacing,
            tickSpacing,
          )
        : undefined,
    [tickSpacing, activeTick, numSurroundingTicks],
  )
  const maxIndex = useMemo(
    () =>
      tickSpacing !== undefined && activeTick !== undefined
        ? bitmapIndex(
            activeTick + numSurroundingTicks * tickSpacing,
            tickSpacing,
          )
        : undefined,
    [tickSpacing, activeTick, numSurroundingTicks],
  )

  const contractReads = useMemo(() => {
    const reads = []
    if (typeof minIndex === 'number' && typeof maxIndex === 'number') {
      for (let i = minIndex; i <= maxIndex; i++) {
        reads.push({
          address: SUSHISWAP_V4_CL_TICK_LENS[chainId],
          abi: getPopulatedTicksInWordAbiShard,
          chainId,
          functionName: 'getPopulatedTicksInWord',
          args: [poolId, i],
        } as const)
      }
    }
    return reads
  }, [chainId, maxIndex, minIndex, poolId])

  const reads = useReadContracts({
    contracts: contractReads,
    allowFailure: false,
    query: {
      enabled: true,
    },
  })

  return useMemo(() => {
    const { data } = reads

    const reduced = data?.reduce((ticks, word) => {
      return ticks.concat(word)
    }, [])
    const renamed = (reduced as Writeable<typeof reduced>)?.map((tick) => ({
      tickIdx: tick.tick,
      liquidityNet: tick.liquidityNet,
    }))
    const sorted = renamed?.sort((a, b) => a.tickIdx - b.tickIdx)

    return {
      ...reads,
      data: sorted,
    }
  }, [reads])
}
