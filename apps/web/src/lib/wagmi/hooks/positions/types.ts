import type { SushiSwapV3ChainId } from 'sushi/config'

import type { PoolKey, SushiSwapV4ChainId } from 'src/lib/pool/v4'
import type { Address } from 'viem'
import type { useConcentratedLiquidityPositionsV3 } from './hooks/useConcentratedLiquidityPositionsV3'
import type { useConcentratedLiquidityPositionsV4 } from './hooks/useConcentratedLiquidityPositionsV4'

export interface ConcentratedLiquidityPositionV3 {
  id: string
  address: string
  chainId: SushiSwapV3ChainId
  nonce: bigint
  tokenId: bigint
  operator: string
  token0: Address
  token1: Address
  fee: number
  fees: bigint[] | undefined
  tickLower: number
  tickUpper: number
  liquidity: bigint
  feeGrowthInside0LastX128: bigint
  feeGrowthInside1LastX128: bigint
  tokensOwed0: bigint
  tokensOwed1: bigint
}

export type ConcentratedLiquidityPositionWithV3Pool = NonNullable<
  ReturnType<typeof useConcentratedLiquidityPositionsV3>['data']
>[number]

export interface ConcentratedLiquidityPositionV4 {
  id: string
  poolKey: PoolKey
  chainId: SushiSwapV4ChainId
  tokenId: bigint
  currency0: Address
  currency1: Address
  fee: number
  fees?: [bigint, bigint]
  tickLower: number
  tickUpper: number
  liquidity: bigint
  feeGrowthInside0LastX128: bigint
  feeGrowthInside1LastX128: bigint
  subscriber: Address
  tokensOwed0?: bigint
  tokensOwed1?: bigint
}

export type ConcentratedLiquidityPositionWithV4Pool = NonNullable<
  ReturnType<typeof useConcentratedLiquidityPositionsV4>['data']
>[number]
