'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { SushiSwapV4ChainId } from 'src/lib/pool/v4'
import type { Hex } from 'viem'

interface UsePoolGraphDataParams {
  poolId: Hex
  chainId: SushiSwapV4ChainId
  enabled?: boolean
}

export const useV4PoolGraphData = ({
  poolId,
  chainId,
  enabled = true,
}: UsePoolGraphDataParams) => {
  return useQuery({
    queryKey: ['usePoolGraphData', { poolId, chainId }],
    queryFn: async () => {
      const buckets =
        // await getV4PoolBuckets({
        //           chainId,
        //           poolId
        //         })
        //       :
        {
          dayBuckets: [],
          hourBuckets: [],
        }
      return buckets
    },
    placeholderData: keepPreviousData,
    staleTime: 0,
    gcTime: 3600, // 1hr
    enabled: Boolean(poolId && chainId && enabled),
  })
}
