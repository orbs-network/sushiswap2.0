import { getV4TokenIdsQuery } from '@sushiswap/graph-client/data-api'
import { useCustomTokens } from '@sushiswap/hooks'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useAllPrices } from 'src/lib/hooks/react-query'
import {
  type SushiSwapV4ChainId,
  type SushiSwapV4Pool,
  SushiSwapV4Position,
  getPoolId,
} from 'src/lib/pool/v4'
import { Amount, Native, type Token, type Type } from 'sushi/currency'
import { type Address, zeroAddress } from 'viem'
import { useConfig } from 'wagmi'
import { usePrices } from '~evm/_common/ui/price-provider/price-provider/use-prices'
import { getConcentratedLiquidityPoolsV4 } from '../../pools/actions/getConcentratedLiquidityPoolV4'
import {
  getTokenWithCacheQueryFn,
  getTokenWithQueryCacheHydrate,
} from '../../tokens/useTokenWithCache'
import { getConcentratedLiquidityPositionsFromTokenIdsV4 } from '../actions/getConcentratedLiquidityPositionsFromTokenIdsV4'
import type { ConcentratedLiquidityPositionV4 } from '../types'

interface useConcentratedLiquidityPositionsV4Data
  extends Omit<ConcentratedLiquidityPositionV4, 'currency0' | 'currency1'> {
  currency0: Type
  currency1: Type
  pool: SushiSwapV4Pool
  position: {
    position: SushiSwapV4Position
    positionUSD: number
    unclaimedUSD: number
  }
}

interface useConcentratedLiquidityPositionsV4Params {
  account: Address | undefined
  chainIds: readonly SushiSwapV4ChainId[]
  enabled?: boolean
}

export const useConcentratedLiquidityPositionsV4 = ({
  account,
  chainIds,
  enabled = true,
}: useConcentratedLiquidityPositionsV4Params) => {
  const { data: customTokens, hasToken } = useCustomTokens()

  const {
    data: allPrices,
    isError: isAllPricesError,
    isLoading: isAllPricesInitialLoading,
  } = useAllPrices({
    enabled: chainIds.length > 1,
  })
  const {
    data: chainPrices,
    isError: isChainPricesError,
    isLoading: isChainPricesInitialLoading,
  } = usePrices({
    chainId: chainIds?.length === 1 ? chainIds[0] : undefined,
  })

  const prices = useMemo(() => {
    if (chainIds.length > 1) {
      return allPrices
    }

    if (chainIds.length === 1 && chainPrices) {
      return new Map([[chainIds[0], chainPrices]])
    }
  }, [allPrices, chainPrices, chainIds])
  const isPriceInitialLoading =
    isAllPricesInitialLoading || isChainPricesInitialLoading
  const isPriceError = isAllPricesError || isChainPricesError

  const config = useConfig()

  const {
    data: positions,
    isError: isPositionsError,
    error: positionsError,
    isLoading: isPositionsInitialLoading,
  } = useQuery({
    queryKey: [
      'useConcentratedLiquidityPositionsV4',
      { chainIds, account, prices },
    ],
    queryFn: async () => {
      if (!account) return []
      const _tokenIds = await Promise.allSettled(
        chainIds.map(
          async (chainId) =>
            await getV4TokenIdsQuery({ owner: account, chainId }),
        ),
      )
      const tokenIds = _tokenIds.reduce(
        (prev, cur, i) => {
          if (cur.status === 'fulfilled' && cur.value) {
            prev.push(
              ...cur.value.map((tokenId) => ({
                tokenId,
                chainId: chainIds[i],
              })),
            )
          }

          return prev
        },
        [] as { tokenId: bigint; chainId: SushiSwapV4ChainId }[],
      )
      const positions = await getConcentratedLiquidityPositionsFromTokenIdsV4({
        tokenIds,
        config,
      })

      console.log('|-positions', positions)

      if (!positions.length) return []

      const positionsWithTokens = (
        await Promise.all(
          positions.map(async (position) => {
            const [currency0, currency1] = await Promise.all([
              position.currency0 === zeroAddress
                ? Native.onChain(position.chainId)
                : getTokenWithCacheQueryFn({
                    chainId: position.chainId,
                    hasToken,
                    customTokens,
                    address: position.currency0,
                    config,
                  }).then((token0Data) =>
                    getTokenWithQueryCacheHydrate(position.chainId, token0Data),
                  ),
              position.currency1 === zeroAddress
                ? Native.onChain(position.chainId)
                : getTokenWithCacheQueryFn({
                    chainId: position.chainId,
                    hasToken,
                    customTokens,
                    address: position.currency1,
                    config,
                  }).then((token1Data) =>
                    getTokenWithQueryCacheHydrate(position.chainId, token1Data),
                  ),
            ])

            return {
              ...position,
              currency0,
              currency1,
            }
          }),
        )
      ).filter((position) =>
        Boolean(position.currency0 && position.currency1),
      ) as (Omit<ConcentratedLiquidityPositionV4, 'currency0' | 'currency1'> & {
        currency0: Type
        currency1: Type
      })[]

      console.log('positionsWithTokens', positionsWithTokens)

      const poolKeys = new Map(
        positionsWithTokens.map(
          ({ chainId, currency0, currency1, poolKey }) => {
            const id = getPoolId(poolKey)
            return [
              id,
              {
                chainId,
                currency0,
                currency1,
                poolKey,
              },
            ]
          },
        ),
      )

      const pools = new Map(
        (
          await getConcentratedLiquidityPoolsV4({
            poolKeys: Array.from(poolKeys.values()),
            config,
          })
        )
          .filter((pool): pool is SushiSwapV4Pool => Boolean(pool))
          .map((pool) => [pool.id, pool]),
      )

      return positionsWithTokens
        .map((_position) => {
          const { chainId, liquidity, tickLower, tickUpper, poolKey, fees } =
            _position
          const pool = pools.get(getPoolId(poolKey))
          if (!pool) return undefined

          const position = new SushiSwapV4Position({
            pool,
            liquidity,
            tickLower,
            tickUpper,
          })

          const amountToUsd = (amount: Amount<Token>) => {
            const _price = prices?.get(chainId)?.get(amount.currency.address)

            if (!amount?.greaterThan(0n) || !_price) return 0
            const price = Number(
              Number(amount.toExact()) * Number(_price.toFixed(10)),
            )
            if (Number.isNaN(price) || price < 0.000001) {
              return 0
            }

            return price
          }

          const positionUSD =
            amountToUsd(position.amount0.wrapped) +
            amountToUsd(position.amount1.wrapped)
          const unclaimedUSD =
            amountToUsd(
              Amount.fromRawAmount(pool.currency0.wrapped, fees?.[0] || 0),
            ) +
            amountToUsd(
              Amount.fromRawAmount(pool.currency1.wrapped, fees?.[1] || 0),
            )

          return {
            ..._position,
            pool,
            position: {
              position,
              positionUSD,
              unclaimedUSD,
            },
          }
        })
        .filter(
          (position): position is useConcentratedLiquidityPositionsV4Data =>
            typeof position !== 'undefined',
        )
    },
    refetchInterval: Number.POSITIVE_INFINITY,
    enabled: Boolean(
      account && chainIds && enabled && (prices || isPriceError),
    ),
  })

  console.log('isPositionsError', isPositionsError, positionsError)

  return {
    data: positions,
    isError: isPositionsError || isPriceError,
    isInitialLoading: isPositionsInitialLoading || isPriceInitialLoading,
  }
}
