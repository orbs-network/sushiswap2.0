import { useQuery } from '@tanstack/react-query'
import type { SushiSwapV3ChainId } from 'sushi/config'

import { useConfig } from 'wagmi'
import { getConcentratedLiquidityPositionsV3FromTokenIdsV3 } from '../actions/getConcentratedLiquidityPositionsFromTokenIdsV3'

interface useConcentratedLiquidityPositionsV3FromTokenIdV3sParams {
  keys: { tokenId: bigint; chainId: SushiSwapV3ChainId }[] | undefined
  enabled?: boolean
}

export const useConcentratedLiquidityPositionsV3FromTokenIdV3s = ({
  keys,
  enabled = true,
}: useConcentratedLiquidityPositionsV3FromTokenIdV3sParams) => {
  const config = useConfig()

  return useQuery({
    queryKey: ['useConcentratedLiquidityPositionsV3FromTokenIdV3s', { keys }],
    queryFn: async () => {
      if (!keys) return null

      return getConcentratedLiquidityPositionsV3FromTokenIdsV3({
        tokenIds: keys,
        config,
      })
    },
    refetchInterval: 10000,
    enabled: Boolean(keys && keys.length > 0 && enabled),
  })
}
