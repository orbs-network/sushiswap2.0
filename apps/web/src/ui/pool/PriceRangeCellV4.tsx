'use client'

import { ArrowSmLeftIcon, ArrowSmRightIcon } from '@heroicons/react-v1/solid'
import { classNames } from '@sushiswap/ui'
import { FormattedNumber } from '@sushiswap/ui'
import type { Row } from '@tanstack/react-table'
import { type FC, useMemo, useState } from 'react'
import { Bound } from 'src/lib/constants'
import { formatTickPrice } from 'src/lib/functions'
import { usePriceInverter } from 'src/lib/hooks'
import { SushiSwapV4Position, useIsTickAtLimit } from 'src/lib/pool/v4'
import type { ConcentratedLiquidityPositionWithV4Pool } from 'src/lib/wagmi/hooks/positions/types'
import {
  DAI,
  Native,
  type Price,
  type Type,
  USDC,
  USDT,
  WBTC,
} from 'sushi/currency'

export function getPriceOrderingFromPositionForUI(
  position?: SushiSwapV4Position,
): {
  priceLower?: Price<Type, Type>
  priceUpper?: Price<Type, Type>
  quote?: Type
  base?: Type
} {
  if (!position) {
    return {}
  }

  const token0 = position.amount0.currency
  const token1 = position.amount1.currency
  const chainId = position.amount0.currency.chainId

  // if token0 is a dollar-stable asset, set it as the quote token
  const stables = [
    DAI[chainId as keyof typeof DAI],
    USDC[chainId as keyof typeof USDC],
    USDT[chainId as keyof typeof USDT],
  ]
  if (stables.some((stable) => stable?.equals(token0))) {
    return {
      priceLower: position.token0PriceUpper.invert(),
      priceUpper: position.token0PriceLower.invert(),
      quote: token0,
      base: token1,
    }
  }

  // if token1 is an ETH-/BTC-stable asset, set it as the base token
  const bases = [
    Native.onChain(chainId).wrapped,
    WBTC[chainId as keyof typeof WBTC],
  ]
  if (bases.some((base) => base?.equals(token1))) {
    return {
      priceLower: position.token0PriceUpper.invert(),
      priceUpper: position.token0PriceLower.invert(),
      quote: token0,
      base: token1,
    }
  }

  // if both prices are below 1, invert
  if (position.token0PriceUpper.lessThan(1)) {
    return {
      priceLower: position.token0PriceUpper.invert(),
      priceUpper: position.token0PriceLower.invert(),
      quote: token0,
      base: token1,
    }
  }

  // otherwise, just return the default
  return {
    priceLower: position.token0PriceLower,
    priceUpper: position.token0PriceUpper,
    quote: token1,
    base: token0,
  }
}

export const PriceRangeCellV4: FC<
  Row<ConcentratedLiquidityPositionWithV4Pool>
> = ({ original }) => {
  const [manuallyInverted, setManuallyInverted] = useState(false)
  const position = useMemo(() => {
    if (original.liquidity) {
      return new SushiSwapV4Position({
        pool: original.pool,
        liquidity: original.liquidity,
        tickLower: original.tickLower,
        tickUpper: original.tickUpper,
      })
    }

    return undefined
  }, [
    original.liquidity,
    original.pool,
    original.tickLower,
    original.tickUpper,
  ])

  const closed = original.liquidity === 0n
  const pricesFromPosition = getPriceOrderingFromPositionForUI(position)

  const { priceLower, priceUpper, base } = usePriceInverter({
    priceLower: pricesFromPosition.priceLower,
    priceUpper: pricesFromPosition.priceUpper,
    quote: pricesFromPosition.quote,
    base: pricesFromPosition.base,
    invert: manuallyInverted,
  })

  const inverted = original.pool.token1
    ? base?.equals(original.pool.token1)
    : undefined
  const currencyQuote = inverted ? original.pool.token0 : original.pool.token1
  const currencyBase = inverted ? original.pool.token1 : original.pool.token0

  const invalidRange = Boolean(original.tickLower >= original.tickUpper)

  const tickAtLimit = useIsTickAtLimit(
    original.pool.tickSpacing,
    original.tickLower,
    original.tickUpper,
  )
  const fullRange = Boolean(
    tickAtLimit[Bound.LOWER] && tickAtLimit[Bound.UPPER],
  )

  const below =
    original.pool && true
      ? original.pool.tickCurrent < original.tickLower
      : undefined
  const above =
    original.pool && true
      ? original.pool.tickCurrent >= original.tickUpper
      : undefined
  const inRange =
    typeof below === 'boolean' && typeof above === 'boolean'
      ? !below && !above
      : false

  return (
    <div
      className="flex flex-col gap-1"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setManuallyInverted((prev) => !prev)
      }}
      onKeyDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setManuallyInverted((prev) => !prev)
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className={classNames(
            invalidRange || !inRange
              ? 'bg-red'
              : closed
                ? 'bg-slate-700'
                : 'bg-green',
            'w-2 h-2 rounded-full',
          )}
        />
        <span className="whitespace-nowrap text-sm flex items-center gap-1 text-gray-900 dark:text-slate-50">
          {fullRange ? (
            '0'
          ) : (
            <FormattedNumber
              number={formatTickPrice({
                price: priceLower,
                atLimit: tickAtLimit,
                direction: Bound.LOWER,
              })}
            />
          )}{' '}
          {currencyQuote?.symbol}
          <div className="flex items-center">
            <ArrowSmLeftIcon
              width={16}
              height={16}
              className="text-gray-500 dark:text-slate-500"
            />
            <ArrowSmRightIcon
              width={16}
              height={16}
              className="text-gray-500 dark:text-slate-500 ml-[-7px]"
            />
          </div>
          {fullRange ? (
            '∞'
          ) : (
            <FormattedNumber
              number={formatTickPrice({
                price: priceUpper,
                atLimit: tickAtLimit,
                direction: Bound.UPPER,
              })}
            />
          )}{' '}
          {currencyQuote?.symbol}
        </span>
      </div>
      <span className="text-xs flex items-center gap-1 text-gray-900 dark:text-slate-500">
        Current:{' '}
        <FormattedNumber
          number={(inverted
            ? original.pool?.token1Price
            : original.pool?.token0Price
          )?.toSignificant(6)}
        />{' '}
        {currencyQuote?.symbol} per {currencyBase?.symbol}{' '}
      </span>
    </div>
  )
}
