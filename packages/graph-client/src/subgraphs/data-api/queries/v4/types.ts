// TODO: use sushi pkg

import type { EvmChainId } from 'sushi/chain'
import type { ID, Incentive, SushiSwapProtocol, Token } from 'sushi/types'
import type { Address, Hex } from 'viem'
import type { SushiSwapV4ChainId } from '../../v4.js'

export const SushiSwapV4Protocol = 'SUSHISWAP_V4'
export type SushiSwapV4Protocol = typeof SushiSwapV4Protocol

export type PoolId = {
  id: ID
  poolId: Hex
  chainId: EvmChainId

  protocol: SushiSwapProtocol | SushiSwapV4Protocol
}

type PoolWithFeeAprs<T extends PoolId = PoolId> = T & {
  feeApr1d: number
}

type PoolWithTotalAprs<T extends PoolId = PoolId> = T & {
  totalApr1d: number
}

export type PoolWithAprs<T extends PoolId = PoolId> = T &
  PoolWithIncentiveApr<T> &
  PoolWithFeeAprs<T> &
  PoolWithTotalAprs<T>

type PoolIfIncentivizedRequired = {
  isIncentivized: boolean
  wasIncentivized: boolean
}

type PoolIfIncentivizedOptional =
  | PoolIfIncentivizedRequired
  | {
      isIncentivized?: undefined
      wasIncentivized?: undefined
    }

type PoolIfIncentivized<
  T extends PoolId = PoolId,
  Optional extends boolean = false,
> = T &
  (Optional extends true
    ? PoolIfIncentivizedOptional
    : PoolIfIncentivizedRequired)

type PoolWithIncentiveApr<T extends PoolId = PoolId> = T & {
  incentiveApr: number
}

export type PoolWithIncentives<T extends PoolId = PoolId> = T &
  PoolIfIncentivized<T> &
  PoolWithIncentiveApr<T> & {
    incentives: Incentive[]
  }

export type PoolHistory1D<T extends PoolId = PoolId> = T & {
  liquidityUSD1dChange: number

  volumeUSD1d: number
  volumeUSD1dChange: number

  feesUSD1d: number
  feesUSD1dChange: number

  txCount1d: number
  txCount1dChange: number
}

type PoolSwapFee<T extends PoolId = PoolId> = T & {
  swapFee: number
}

export type PoolBase<T extends PoolId = PoolId> = PoolSwapFee<T> & {
  name: string

  token0: Token
  token1: Token

  reserve0: bigint
  reserve1: bigint
  liquidity: bigint

  liquidityUSD: number

  volumeUSD: number

  feesUSD: number

  token0Price: number
  token1Price: number

  txCount: number
}

type Extension = {
  lpFee: number
  protocolFee: number
  tickSpacing: number
  hooks: Address
  hooksRegistration: Hex
  sqrtPrice: bigint
  tick: bigint
  observationIndex: bigint
}

export type PoolV4<T extends PoolId = PoolId> = T &
  Omit<PoolId, 'chainId' | 'protocol'> & {
    chainId: SushiSwapV4ChainId
    protocol: typeof SushiSwapV4Protocol
  } & Extension

export function isPoolV4<T extends PoolV4>(pool: PoolId): pool is T {
  return (pool.protocol as string) === 'SUSHISWAP_V4'
}
