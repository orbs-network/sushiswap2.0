import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { SushiSwapV3ChainId } from 'sushi/config'

import { useConfig } from 'wagmi'
import { getConcentratedLiquidityPositionsFromTokenIdsV3 } from '../actions/getConcentratedLiquidityPositionsFromTokenIdsV3'

interface useConcentratedLiquidityPositionsFromTokenIdV3Params {
  tokenId: number | string | undefined
  chainId: SushiSwapV3ChainId
  enabled?: boolean
}

export const useConcentratedLiquidityPositionsFromTokenIdV3 = ({
  tokenId,
  chainId,
  enabled = true,
}: useConcentratedLiquidityPositionsFromTokenIdV3Params) => {
  const config = useConfig()

  return useQuery({
    queryKey: [
      'useConcentratedLiquidityPositionsFromTokenIdV3',
      { chainId, tokenIds: tokenId },
    ],
    queryFn: async () => {
      // Shouldn't happen
      if (!tokenId) throw new Error('TokenId is undefined')

      const positions = await getConcentratedLiquidityPositionsFromTokenIdsV3({
        tokenIds: [{ tokenId: BigInt(tokenId), chainId }],
        config,
      })

      return positions[0]
    },
    refetchInterval: 10000,
    enabled: Boolean(tokenId && chainId && enabled),
    placeholderData: keepPreviousData,
  })
}
