import { Price, type Type } from 'sushi/currency'
import {
  TickMath,
  encodeSqrtRatioX96,
  nearestUsableTick,
} from 'sushi/pool/sushiswap-v3'
import { priceToClosestTick, tickToPrice } from './priceTickConversions'

export function getTickToPrice(
  baseCurrency?: Type,
  quoteCurrency?: Type,
  tick?: number,
): Price<Type, Type> | undefined {
  if (!baseCurrency || !quoteCurrency || typeof tick !== 'number') {
    return undefined
  }
  return tickToPrice(baseCurrency, quoteCurrency, tick)
}

export function tryParsePrice(
  baseCurrency?: Type,
  quoteCurrency?: Type,
  value?: string,
) {
  if (!baseCurrency || !quoteCurrency || !value) {
    return undefined
  }

  if (!value.match(/^\d*\.?\d+$/)) {
    return undefined
  }

  const [whole, fraction] = value.split('.')

  const decimals = fraction?.length ?? 0
  const withoutDecimals = BigInt((whole ?? '') + (fraction ?? ''))

  return new Price(
    baseCurrency,
    quoteCurrency,
    BigInt(10 ** decimals) * BigInt(10 ** baseCurrency.decimals),
    withoutDecimals * BigInt(10 ** quoteCurrency.decimals),
  )
}

export function tryParseTick(
  baseCurrency?: Type,
  quoteCurrency?: Type,
  feeAmount?: number,
  tickSpacing?: number,
  value?: string,
): number | undefined {
  if (!baseCurrency || !quoteCurrency || !feeAmount || !tickSpacing || !value) {
    return undefined
  }

  const price = tryParsePrice(baseCurrency, quoteCurrency, value)

  if (!price) {
    return undefined
  }

  let tick: number

  // check price is within min/max bounds, if outside return min/max
  const sqrtRatioX96 = encodeSqrtRatioX96(price.numerator, price.denominator)

  if (sqrtRatioX96 >= TickMath.MAX_SQRT_RATIO) {
    tick = TickMath.MAX_TICK
  } else if (sqrtRatioX96 <= TickMath.MIN_SQRT_RATIO) {
    tick = TickMath.MIN_TICK
  } else {
    // this function is agnostic to the base, will always return the correct tick
    tick = priceToClosestTick(price)
  }

  return nearestUsableTick(tick, tickSpacing)
}
