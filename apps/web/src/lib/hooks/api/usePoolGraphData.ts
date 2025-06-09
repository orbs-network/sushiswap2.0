'use client'

import {
  getV2PoolBuckets,
  getV3PoolBuckets,
  getV4PoolBuckets,
} from '@sushiswap/graph-client/data-api'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { type SushiSwapV4ChainId, isSushiSwapV4ChainId } from 'src/lib/pool/v4'
import { type Address, SushiSwapProtocol } from 'sushi'
import {
  type SushiSwapV2ChainId,
  type SushiSwapV3ChainId,
  isSushiSwapV2ChainId,
  isSushiSwapV3ChainId,
} from 'sushi/config'
import type { Hex } from 'viem'

interface UsePoolGraphDataParams {
  chainId: SushiSwapV2ChainId | SushiSwapV3ChainId | SushiSwapV4ChainId
  enabled?: boolean
}

interface UseGraphDataPramsV2_V3Params extends UsePoolGraphDataParams {
  poolAddress: Address
  protocol: SushiSwapProtocol
}

interface UseGraphDataPramsV4Params extends UsePoolGraphDataParams {
  poolId: Hex
  protocol: 'SUSHISWAP_V4'
}

export const usePoolGraphData = (
  params: UseGraphDataPramsV2_V3Params | UseGraphDataPramsV4Params,
) => {
  const { chainId, protocol, enabled = true } = params
  return useQuery({
    queryKey: [
      'usePoolGraphData',
      chainId,
      protocol === 'SUSHISWAP_V4' ? params.poolId : params.poolAddress,
    ],
    queryFn: async () => {
      const buckets =
        protocol === SushiSwapProtocol.SUSHISWAP_V2 &&
        isSushiSwapV2ChainId(chainId)
          ? await getV2PoolBuckets({
              chainId,
              address: params.poolAddress,
            })
          : protocol === SushiSwapProtocol.SUSHISWAP_V3 &&
              isSushiSwapV3ChainId(chainId)
            ? await getV3PoolBuckets({
                chainId,
                address: params.poolAddress,
              })
            : protocol === 'SUSHISWAP_V4' && isSushiSwapV4ChainId(chainId)
              ? await getV4PoolBuckets({ chainId, poolId: params.poolId })
              : {
                  dayBuckets: [],
                  hourBuckets: [],
                }
      return buckets
    },
    placeholderData: keepPreviousData,
    staleTime: 0,
    gcTime: 3600, // 1hr
    enabled: Boolean(chainId && enabled),
  })
}
