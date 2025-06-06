import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { type SushiSwapV4ChainId, SushiSwapV4Position } from 'src/lib/pool/v4'
import type { Type } from 'sushi/currency'
import { stringify } from 'viem'
import { useConfig } from 'wagmi'
import { getConcentratedLiquidityPoolV4 } from '../../pools/actions/getConcentratedLiquidityPoolV4'
import { useConcentratedLiquidityPositionsFromTokenIdV4 } from './useConcentratedPositionsFromTokenIdV4'

interface useConcentratedLiquidityPositionsFromTokenIdV3Params {
  token0: Type | undefined
  token1: Type | undefined
  tokenId: number | string | undefined
  chainId: SushiSwapV4ChainId
  enabled?: boolean
}

export const useConcentratedPositionInfoV4 = ({
  token0,
  token1,
  tokenId,
  chainId,
  enabled = true,
}: useConcentratedLiquidityPositionsFromTokenIdV3Params) => {
  const { data: positionDetails } =
    useConcentratedLiquidityPositionsFromTokenIdV4({
      chainId,
      tokenId,
    })

  const config = useConfig()

  return useQuery({
    queryKey: [
      'useConcentratedPositionInfoV4',
      { chainId, token0, token1, tokenId, positionDetails },
    ],
    queryFn: async () => {
      if (!token0 || !token1 || !positionDetails) throw new Error()

      const pool = await getConcentratedLiquidityPoolV4({
        chainId,
        currency0: token0,
        currency1: token1,
        poolKey: positionDetails.poolKey,
        config,
      })

      let position = null
      if (pool && positionDetails) {
        position = new SushiSwapV4Position({
          pool,
          liquidity: positionDetails.liquidity,
          tickLower: positionDetails.tickLower,
          tickUpper: positionDetails.tickUpper,
        })
      }

      return position
    },
    refetchInterval: 10000,
    enabled: Boolean(token0 && token1 && chainId && enabled && positionDetails),
    placeholderData: keepPreviousData,
    queryKeyHashFn: stringify,
  })
}
