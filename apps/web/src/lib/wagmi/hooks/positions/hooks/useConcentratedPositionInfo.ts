import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { SushiSwapV3ChainId } from 'sushi/config'
import type { Type } from 'sushi/currency'
import { Position } from 'sushi/pool/sushiswap-v3'
import { stringify } from 'viem'

import { useConfig } from 'wagmi'
import { getConcentratedLiquidityPoolV3 } from '../../pools/actions/getConcentratedLiquidityPoolV3'
import { useConcentratedLiquidityPositionsFromTokenId } from './useConcentratedPositionsFromTokenId'

interface UseConcentratedLiquidityPositionsFromTokenIdParams {
  token0: Type | undefined
  token1: Type | undefined
  tokenId: number | string | undefined
  chainId: SushiSwapV3ChainId
  enabled?: boolean
}

export const useConcentratedPositionInfo = ({
  token0,
  token1,
  tokenId,
  chainId,
  enabled = true,
}: UseConcentratedLiquidityPositionsFromTokenIdParams) => {
  const { data: positionDetails } =
    useConcentratedLiquidityPositionsFromTokenId({
      chainId,
      tokenId,
    })

  const config = useConfig()

  return useQuery({
    queryKey: [
      'useConcentratedPositionInfo',
      { chainId, token0, token1, tokenId, positionDetails },
    ],
    queryFn: async () => {
      if (!token0 || !token1 || !positionDetails) throw new Error()

      const pool = await getConcentratedLiquidityPoolV3({
        chainId,
        token0,
        token1,
        feeAmount: positionDetails.fee,
        config,
      })

      let position = null
      if (pool && positionDetails) {
        position = new Position({
          pool,
          liquidity: positionDetails.liquidity.toString(),
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
