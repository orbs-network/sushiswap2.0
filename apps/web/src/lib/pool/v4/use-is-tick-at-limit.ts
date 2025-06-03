'use client'

import { useMemo } from 'react'
import { TickMath, nearestUsableTick } from 'sushi/pool/sushiswap-v3'
import { Bound } from '../../constants'

export function useIsTickAtLimit(
  tickSpacing: number | undefined,
  tickLower: number | undefined,
  tickUpper: number | undefined,
) {
  return useMemo(
    () => ({
      [Bound.LOWER]:
        typeof tickSpacing === 'number' && typeof tickLower === 'number'
          ? tickLower === nearestUsableTick(TickMath.MIN_TICK, tickSpacing)
          : undefined,
      [Bound.UPPER]:
        typeof tickSpacing === 'number' && typeof tickUpper === 'number'
          ? tickUpper === nearestUsableTick(TickMath.MAX_TICK, tickSpacing)
          : undefined,
    }),
    [tickSpacing, tickLower, tickUpper],
  )
}
