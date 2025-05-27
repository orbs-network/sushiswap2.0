import { type MulticallReturnType, readContracts } from '@wagmi/core/actions'
import {
  type HookData,
  type PoolKey,
  SUSHISWAP_V4_CL_POOL_MANAGER,
  type SushiSwapV4ChainId,
  SushiSwapV4Pool,
  getPoolId,
  getPoolKey,
} from 'src/lib/pool/v4'
import { sushiswapV4CLPoolManagerAbi_getLiquidity } from 'src/lib/pool/v4/sdk/abi/sushiswapV4CLPoolManagerAbi_getLiquidity'
import { sushiswapV4CLPoolManagerAbi_getSlot0 } from 'src/lib/pool/v4/sdk/abi/sushiswapV4CLPoolManagerAbi_getSlot0'
import {
  SUSHISWAP_V3_FACTORY_ADDRESS,
  type SushiSwapV3ChainId,
  type SushiSwapV3FeeAmount,
} from 'sushi/config'
import type { Token, Type } from 'sushi/currency'
import {
  type SushiSwapV3Pool,
  computeSushiSwapV3PoolAddress,
} from 'sushi/pool/sushiswap-v3'
import type { Address, ContractFunctionReturnType } from 'viem'
import type { PublicWagmiConfig } from '../../../config/public'

type Slot0 = ContractFunctionReturnType<
  typeof sushiswapV4CLPoolManagerAbi_getSlot0,
  'view',
  'getSlot0'
>
type Liquidity = ContractFunctionReturnType<
  typeof sushiswapV4CLPoolManagerAbi_getLiquidity,
  'view',
  'getLiquidity'
>

export const getConcentratedLiquidityPoolsV4 = async ({
  poolKeys,
  config,
}: {
  poolKeys: {
    chainId: SushiSwapV4ChainId
    currency0: Type
    currency1: Type
    feeAmount: number
    tickSpacing: number
    hooks?: HookData
  }[]
  config: PublicWagmiConfig
}): Promise<(SushiSwapV4Pool | null)[]> => {
  const pools = poolKeys.map((pool) => {
    const poolKey = getPoolKey(pool) // todo: maybe pass in as key
    const poolId = getPoolId(poolKey)

    return { ...pool, poolKey, poolId }
  })

  // Batching slot0 and liquidity multicalls into one
  const results = await readContracts(config, {
    contracts: pools.flatMap(({ poolId, chainId }) => [
      {
        chainId,
        address: SUSHISWAP_V4_CL_POOL_MANAGER[chainId],
        abi: sushiswapV4CLPoolManagerAbi_getSlot0,
        functionName: 'getSlot0',
        args: [poolId],
      } as const,
      {
        chainId,
        address: SUSHISWAP_V4_CL_POOL_MANAGER[chainId],
        abi: sushiswapV4CLPoolManagerAbi_getLiquidity,
        functionName: 'getLiquidity',
        args: [poolId],
      } as const,
    ]),
  })

  // Split results back into slot0s and liquidities arrays
  const slot0s = results.filter((_, i) => i % 2 === 0)
  const liquidities = results.filter((_, i) => i % 2 === 1)

  return pools.map((pool, index) => {
    const tokens = pools[index]
    const { currency0, currency1, feeAmount: fee, ...rest } = pool

    if (!slot0s[index]) return null
    const slot0 = slot0s[index].result as Slot0

    if (!liquidities[index]) return null
    const liquidity = liquidities[index].result as Liquidity

    if (!tokens || !slot0 || typeof liquidity === 'undefined') return null

    const sqrtPriceX96 = slot0[0]
    if (!sqrtPriceX96 || sqrtPriceX96 === 0n) return null

    const tick = slot0[1]
    if (typeof tick === 'undefined') return null

    return new SushiSwapV4Pool({
      ...rest,
      fee,
      protocolFee: 0, // TODO
      currencyA: currency0,
      currencyB: currency1,
      sqrtRatioX96: sqrtPriceX96,
      liquidity,
      tickCurrent: tick,
    })
  })
}

export const getConcentratedLiquidityPoolV4 = async ({
  chainId,
  currency0,
  currency1,
  feeAmount,
  tickSpacing,
  hooks,
  config,
}: {
  chainId: SushiSwapV4ChainId
  currency0: Type
  currency1: Type
  feeAmount: number
  tickSpacing: number
  hooks?: HookData
  config: PublicWagmiConfig
}): Promise<SushiSwapV4Pool | null> => {
  return (
    await getConcentratedLiquidityPoolsV4({
      poolKeys: [
        {
          chainId,
          currency0,
          currency1,
          feeAmount,
          tickSpacing,
          hooks,
        },
      ],
      config,
    })
  )[0]
}
