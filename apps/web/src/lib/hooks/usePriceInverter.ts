'use client'

import { useMemo } from 'react'
import type { Price, Type } from 'sushi/currency'

export const usePriceInverter = <T extends Type>({
  priceLower,
  priceUpper,
  quote,
  base,
  invert,
}: {
  priceLower?: Price<T, T>
  priceUpper?: Price<T, T>
  quote?: T
  base?: T
  invert?: boolean
}): {
  priceLower?: Price<T, T>
  priceUpper?: Price<T, T>
  quote?: T
  base?: T
} => {
  return useMemo(
    () => ({
      priceUpper: invert ? priceLower?.invert() : priceUpper,
      priceLower: invert ? priceUpper?.invert() : priceLower,
      quote: invert ? base : quote,
      base: invert ? quote : base,
    }),
    [base, invert, priceLower, priceUpper, quote],
  )
}
