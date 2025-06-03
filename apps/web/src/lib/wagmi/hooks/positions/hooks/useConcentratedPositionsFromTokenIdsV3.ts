import { useQuery } from '@tanstack/react-query'
import type { SushiSwapV3ChainId } from 'sushi/config'

import { useConfig } from 'wagmi'
import { getConcentratedLiquidityPositionsFromTokenIdsV3 } from '../actions/getConcentratedLiquidityPositionsFromTokenIdsV3'

interface useConcentratedLiquidityPositionsFromTokenIdV3sParams {
  keys: { tokenId: bigint; chainId: SushiSwapV3ChainId }[] | undefined
  enabled?: boolean
}

export const useConcentratedLiquidityPositionsFromTokenIdV3s = ({
  keys,
  enabled = true,
}: useConcentratedLiquidityPositionsFromTokenIdV3sParams) => {
  const config = useConfig()

  return useQuery({
    queryKey: ['useConcentratedLiquidityPositionsFromTokenIdV3s', { keys }],
    queryFn: async () => {
      if (!keys) return null

      return getConcentratedLiquidityPositionsFromTokenIdsV3({
        tokenIds: keys,
        config,
      })
    },
    refetchInterval: 10000,
    enabled: Boolean(keys && keys.length > 0 && enabled),
  })
}
