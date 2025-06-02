import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { SushiSwapV3ChainId } from 'sushi/config'

import { useConfig } from 'wagmi'
import { getConcentratedLiquidityPositionsV3FromTokenIdsV3 } from '../actions/getConcentratedLiquidityPositionsFromTokenIdsV3'

interface useConcentratedLiquidityPositionsV3FromTokenIdV3Params {
  tokenId: number | string | undefined
  chainId: SushiSwapV3ChainId
  enabled?: boolean
}

export const useConcentratedLiquidityPositionsV3FromTokenIdV3 = ({
  tokenId,
  chainId,
  enabled = true,
}: useConcentratedLiquidityPositionsV3FromTokenIdV3Params) => {
  const config = useConfig()

  return useQuery({
    queryKey: [
      'useConcentratedLiquidityPositionsV3FromTokenIdV3',
      { chainId, tokenIds: tokenId },
    ],
    queryFn: async () => {
      // Shouldn't happen
      if (!tokenId) throw new Error('TokenId is undefined')

      const positions = await getConcentratedLiquidityPositionsV3FromTokenIdsV3(
        {
          tokenIds: [{ tokenId: BigInt(tokenId), chainId }],
          config,
        },
      )

      return positions[0]
    },
    refetchInterval: 10000,
    enabled: Boolean(tokenId && chainId && enabled),
    placeholderData: keepPreviousData,
  })
}
