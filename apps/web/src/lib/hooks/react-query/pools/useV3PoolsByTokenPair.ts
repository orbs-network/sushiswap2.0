'use client'

import { useQuery } from '@tanstack/react-query'
import { getV3PoolsByTokenPair } from 'src/lib/graph'

function useV3PoolsByTokenPair(tokenId0?: string, tokenId1?: string) {
  return useQuery({
    queryKey: ['v3-poolsByTokenPair', tokenId0, tokenId1],
    queryFn: () => {
      if (!tokenId0 || !tokenId1) return []

      return getV3PoolsByTokenPair(tokenId0, tokenId1)
    },
    enabled: !!tokenId0 && !!tokenId1,
  })
}

export { useV3PoolsByTokenPair }
