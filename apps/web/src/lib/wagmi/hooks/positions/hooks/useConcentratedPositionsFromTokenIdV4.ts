import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { SushiSwapV4ChainId } from 'src/lib/pool/v4'
import { useConfig } from 'wagmi'
import { getConcentratedLiquidityPositionsV3FromTokenIdsV4 } from '../actions/getConcentratedLiquidityPositionsFromTokenIdsV4'

interface useConcentratedLiquidityPositionsV3FromTokenIdV4Params {
  tokenId: number | string | undefined
  chainId: SushiSwapV4ChainId
  enabled?: boolean
}

export const useConcentratedLiquidityPositionsV3FromTokenIdV4 = ({
  tokenId,
  chainId,
  enabled = true,
}: useConcentratedLiquidityPositionsV3FromTokenIdV4Params) => {
  const config = useConfig()

  return useQuery({
    queryKey: [
      'useConcentratedLiquidityPositionsV3FromTokenIdV4',
      { chainId, tokenIds: tokenId },
    ],
    queryFn: async () => {
      // Shouldn't happen
      if (!tokenId) throw new Error('TokenId is undefined')

      const positions = await getConcentratedLiquidityPositionsV3FromTokenIdsV4(
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
