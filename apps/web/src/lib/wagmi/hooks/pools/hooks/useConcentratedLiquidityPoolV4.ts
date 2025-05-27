import { useQuery } from '@tanstack/react-query'
import type { SushiSwapV4ChainId } from 'src/lib/pool/v4'
import type { Type } from 'sushi/currency'
import { useConfig } from 'wagmi'
import { getConcentratedLiquidityPoolV4 } from '../actions/getConcentratedLiquidityPoolV4'

interface UseConcentratedLiquidityPoolV4 {
  currency0: Type | undefined
  currency1: Type | undefined
  chainId: SushiSwapV4ChainId
  feeAmount: number | undefined
  tickSpacing: number | undefined
  enabled?: boolean
}

export const useConcentratedLiquidityPoolV4 = ({
  currency0,
  currency1,
  chainId,
  feeAmount,
  tickSpacing,
  enabled = true,
}: UseConcentratedLiquidityPoolV4) => {
  const config = useConfig()

  return useQuery({
    queryKey: [
      'useConcentratedLiquidityPoolV4',
      { chainId, currency0, currency1, feeAmount },
    ],
    queryFn: async () => {
      if (!currency0 || !currency1 || !feeAmount || !tickSpacing)
        throw new Error()
      return getConcentratedLiquidityPoolV4({
        chainId,
        currency0,
        currency1,
        feeAmount,
        tickSpacing,
        config,
      })
    },
    refetchInterval: 10000,
    enabled: Boolean(
      enabled && feeAmount && tickSpacing && chainId && currency0 && currency1,
    ),
  })
}
