import { useQuery } from '@tanstack/react-query'
import type { SushiSwapV3ChainId, SushiSwapV3FeeAmount } from 'sushi/config'
import type { Type } from 'sushi/currency'
import { useConfig } from 'wagmi'
import { getConcentratedLiquidityPoolV3 } from '../actions/getConcentratedLiquidityPoolV3'

interface UseConcentratedLiquidityPoolV3 {
  token0: Type | undefined
  token1: Type | undefined
  chainId: SushiSwapV3ChainId
  feeAmount: SushiSwapV3FeeAmount | undefined
  enabled?: boolean
}

export const useConcentratedLiquidityPoolV3 = ({
  token0,
  token1,
  chainId,
  feeAmount,
  enabled = true,
}: UseConcentratedLiquidityPoolV3) => {
  const config = useConfig()

  return useQuery({
    queryKey: [
      'useConcentratedLiquidityPoolV3',
      { chainId, token0, token1, feeAmount },
    ],
    queryFn: async () => {
      if (!token0 || !token1 || !feeAmount) throw new Error()
      return getConcentratedLiquidityPoolV3({
        chainId,
        token0,
        token1,
        feeAmount,
        config,
      })
    },
    refetchInterval: 10000,
    enabled: Boolean(enabled && feeAmount && chainId && token0 && token1),
  })
}
