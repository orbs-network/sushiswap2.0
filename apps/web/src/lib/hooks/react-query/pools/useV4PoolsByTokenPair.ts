'use client'

import { useQuery } from '@tanstack/react-query'
import { getV4PoolsByTokenPair } from 'src/lib/graph'
import type { SushiSwapV4ChainId } from 'src/lib/pool/v4'

function useV4PoolsByTokenPair(
  chainId: SushiSwapV4ChainId,
  tokenId0?: string,
  tokenId1?: string,
) {
  return useQuery({
    queryKey: ['v4-poolsByTokenPair', chainId, tokenId0, tokenId1],
    queryFn: () => {
      if (!tokenId0 || !tokenId1) return []

      return getV4PoolsByTokenPair(chainId, tokenId0, tokenId1)
    },
    enabled: !!tokenId0 && !!tokenId1,
  })
}

export { useV4PoolsByTokenPair }
