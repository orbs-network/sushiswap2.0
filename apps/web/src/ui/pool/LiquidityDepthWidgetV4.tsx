'use client'

import type { V4Pool } from '@sushiswap/graph-client/data-api'
import { SkeletonBox } from '@sushiswap/ui'
import React, { type FC, useMemo } from 'react'
import { Bound } from 'src/lib/constants'
import type { PoolKey } from 'src/lib/pool/v4'
import { Native, Token } from 'sushi/currency'
import { zeroAddress } from 'viem'
import { useConcentratedDerivedMintInfoV4 } from './ConcentratedLiquidityProviderV4'
import LiquidityChartRangeInput from './LiquidityChartRangeInput'
import { UseDensityChartDataV4 } from './LiquidityChartRangeInput/hooks'

interface LiquidityDepthWidgetV4 {
  pool: V4Pool
  poolKey: PoolKey
}

// ID has to be set (and unique) if there are multiple charts on the same page
export const LiquidityDepthWidgetV4: FC<LiquidityDepthWidgetV4> = ({
  pool,
  poolKey,
}) => {
  const { chainId } = pool
  const { currency0, currency1 } = useMemo(
    () => ({
      currency0:
        pool.token0.address === zeroAddress
          ? Native.onChain(chainId)
          : new Token(pool.token0),
      currency1:
        pool.token1.address === zeroAddress
          ? Native.onChain(chainId)
          : new Token(pool.token1),
    }),
    [chainId, pool.token0, pool.token1],
  )

  const { price, invertPrice, noLiquidity } = useConcentratedDerivedMintInfoV4({
    account: undefined,
    poolKey,
    chainId,
    currency0,
    currency1,
    baseCurrency: currency0,
    existingPosition: undefined,
  })

  const { isLoading, data } = UseDensityChartDataV4({
    chainId,
    currency0,
    currency1,
    poolKey,
  })

  const current = useMemo(() => {
    if (!price) return null

    return Number.parseFloat(
      (invertPrice ? price.invert() : price)?.toSignificant(8),
    )
  }, [invertPrice, price])

  return (
    <>
      {isLoading && <SkeletonBox className="w-full h-full" />}
      {!noLiquidity && !isLoading && data && current && (
        <LiquidityChartRangeInput
          chainId={chainId}
          currencyA={currency0}
          currencyB={currency1}
          feeAmount={
            poolKey.fee
          } /* TODO: should account for protocol fee here? */
          ticksAtLimit={{ [Bound.LOWER]: false, [Bound.UPPER]: false }}
          price={
            price
              ? Number.parseFloat(
                  (invertPrice ? price.invert() : price).toSignificant(8),
                )
              : undefined
          }
          weightLockedCurrencyBase={undefined}
          priceRange={undefined}
          priceLower={undefined}
          priceUpper={undefined}
          interactive={false}
          hideBrushes={true}
          onLeftRangeInput={() => {}}
          onRightRangeInput={() => {}}
        />
      )}
    </>
  )
}
