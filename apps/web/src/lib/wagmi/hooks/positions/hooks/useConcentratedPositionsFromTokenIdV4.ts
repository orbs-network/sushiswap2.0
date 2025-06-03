import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { SushiSwapV4ChainId } from 'src/lib/pool/v4'
import { useConfig } from 'wagmi'
import { getConcentratedLiquidityPositionsFromTokenIdsV4 } from '../actions/getConcentratedLiquidityPositionsFromTokenIdsV4'

interface useConcentratedLiquidityPositionsFromTokenIdV4Params {
  tokenId: number | string | undefined
  chainId: SushiSwapV4ChainId
  enabled?: boolean
}

export const useConcentratedLiquidityPositionsFromTokenIdV4 = ({
  tokenId,
  chainId,
  enabled = true,
}: useConcentratedLiquidityPositionsFromTokenIdV4Params) => {
  const config = useConfig()

  return useQuery({
    queryKey: [
      'useConcentratedLiquidityPositionsFromTokenIdV4',
      { chainId, tokenIds: tokenId },
    ],
    queryFn: async () => {
      // Shouldn't happen
      if (!tokenId) throw new Error('TokenId is undefined')

      const positions = await getConcentratedLiquidityPositionsFromTokenIdsV4({
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
