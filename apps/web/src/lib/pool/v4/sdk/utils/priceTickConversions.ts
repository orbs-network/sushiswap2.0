import { Price, type Type } from 'sushi/currency'
import { TickMath, encodeSqrtRatioX96 } from 'sushi/pool/sushiswap-v3'
import { Q192 } from '../constants/internalConstants'
import { isCurrencySorted } from './sortCurrencies'

/**
 * Returns a price object corresponding to the input tick and the base/quote token
 * Inputs must be tokens because the address order is used to interpret the price represented by the tick
 * @param baseToken the base token of the price
 * @param quoteToken the quote token of the price
 * @param tick the tick for which to return the price
 */
export function tickToPrice(
  baseCurrency: Type,
  quoteCurrency: Type,
  tick: number,
): Price<Type, Type> {
  const sqrtRatioX96 = TickMath.getSqrtRatioAtTick(tick)

  const ratioX192 = sqrtRatioX96 * sqrtRatioX96

  const sorted = isCurrencySorted(baseCurrency, quoteCurrency)

  return sorted
    ? new Price(baseCurrency, quoteCurrency, Q192, ratioX192)
    : new Price(baseCurrency, quoteCurrency, ratioX192, Q192)
}

export function priceToClosestTick(price: Price<Type, Type>): number {
  const sorted = isCurrencySorted(price.baseCurrency, price.quoteCurrency)

  const sqrtRatioX96 = sorted
    ? encodeSqrtRatioX96(price.numerator, price.denominator)
    : encodeSqrtRatioX96(price.denominator, price.numerator)

  let tick = TickMath.getTickAtSqrtRatio(sqrtRatioX96)
  const nextTickPrice = tickToPrice(
    price.baseCurrency,
    price.quoteCurrency,
    tick + 1,
  )
  if (sorted) {
    if (!price.lessThan(nextTickPrice)) {
      tick++
    }
  } else {
    if (!price.greaterThan(nextTickPrice)) {
      tick++
    }
  }
  return tick
}
