import { useQuery } from '@tanstack/react-query'
import type { PoolKey, SushiSwapV4ChainId } from 'src/lib/pool/v4'
import type { Type } from 'sushi/currency'
import { useConfig } from 'wagmi'
import { getConcentratedLiquidityPoolV4 } from '../actions/getConcentratedLiquidityPoolV4'

interface UseConcentratedLiquidityPoolV4 {
  currency0: Type | undefined
  currency1: Type | undefined
  chainId: SushiSwapV4ChainId
  poolKey: PoolKey | undefined
  enabled?: boolean
}

export const useConcentratedLiquidityPoolV4 = ({
  currency0,
  currency1,
  chainId,
  poolKey,
  enabled = true,
}: UseConcentratedLiquidityPoolV4) => {
  const config = useConfig()

  return useQuery({
    queryKey: [
      'useConcentratedLiquidityPoolV4',
      { chainId, currency0, currency1, poolKey },
    ],
    queryFn: async () => {
      if (!currency0 || !currency1 || !poolKey) throw new Error()
      return getConcentratedLiquidityPoolV4({
        chainId,
        currency0,
        currency1,
        poolKey,
        config,
      })
    },
    refetchInterval: 10000,
    enabled: Boolean(enabled && chainId && currency0 && currency1 && poolKey),
  })
}
