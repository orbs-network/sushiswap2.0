import type { VariablesOf } from 'gql.tada'

import { type RequestOptions, request } from 'src/lib/request.js'
import type { ChefType, EvmChainId, RewarderType } from 'sushi'
import type { Address, Hex } from 'viem'
import { SUSHI_DATA_API_HOST } from '../../data-api-host.js'
import { graphql } from '../../graphql.js'
import { isSushiSwapV4ChainId } from '../../v4.js'
import {
  type PoolBase,
  type PoolHistory1D,
  type PoolV4,
  type PoolWithAprs,
  type PoolWithIncentives,
  SushiSwapV4Protocol,
} from '../v4/types.js'

export const V4PoolQuery = graphql(
  `
  query V4Pool($id: Bytes!, $chainId: SushiSwapV4ChainId!) {
    v4Pool(id: $id, chainId: $chainId) {
      id
      chainId
      name
      poolId
      createdAt
      swapFee
      tickSpacing
      protocol
      token0 {
        id
        address
        name
        symbol
        decimals
      }
      token1 {
        id
        address
        name
        symbol
        decimals
      }
      source
      reserve0
      reserve1
      liquidity
      sqrtPrice
      tick
      observationIndex
      volumeUSD
      liquidityUSD
      token0Price
      token1Price
      volumeUSD1d
      feeUSD1d
      txCount1d
      feeApr1d
      totalApr1d
      volumeUSD1dChange
      feeUSD1dChange
      txCount1dChange
      liquidityUSD1dChange
      incentiveApr
      isIncentivized
      wasIncentivized
      incentives {
        id
        chainId
        chefType
        apr
        rewardToken {
          id
          address
          name
          symbol
          decimals
        }
        rewardPerDay
        poolAddress
        pid
        rewarderAddress
        rewarderType
      }
    }
  }
`,
)

export type GetV4Pool = VariablesOf<typeof V4PoolQuery>

export async function getV4Pool(
  variables: GetV4Pool,
  options?: RequestOptions,
) {
  const url = `${SUSHI_DATA_API_HOST}/graphql`
  const chainId = Number(variables.chainId) as EvmChainId

  if (!isSushiSwapV4ChainId(chainId)) {
    throw new Error('Invalid chainId')
  }
  try {
    const result = await request(
      {
        url,
        document: V4PoolQuery,
        variables,
      },
      options,
    )
    if (result.v4Pool) {
      const incentives = result.v4Pool.incentives.filter((i) => i !== null)
      const pool = result.v4Pool
      return {
        id: pool.id as `${string}:0x${string}`,
        poolId: pool.poolId as Hex,
        chainId,
        name: `${pool.token0.symbol}-${pool.token1.symbol}`,
        swapFee: pool.swapFee,
        tickSpacing: pool.tickSpacing,
        protocol: SushiSwapV4Protocol,
        reserve0: BigInt(pool.reserve0),
        reserve1: BigInt(pool.reserve1),
        liquidity: BigInt(pool.liquidity),

        sqrtPrice: BigInt(pool.sqrtPrice),
        tick: BigInt(pool.tick),
        observationIndex: BigInt(pool.observationIndex),

        liquidityUSD: pool.liquidityUSD,
        volumeUSD: pool.volumeUSD,
        feesUSD: pool.volumeUSD * pool.swapFee,

        token0: {
          id: pool.token0.id as `${string}:0x${string}`,
          address: pool.token0.address as Address,
          chainId,
          decimals: pool.token0.decimals,
          name: pool.token0.name,
          symbol: pool.token0.symbol,
        },
        token1: {
          id: pool.token1.id as `${string}:0x${string}`,
          address: pool.token1.address as Address,
          chainId,
          decimals: pool.token1.decimals,
          name: pool.token1.name,
          symbol: pool.token1.symbol,
        },
        token0Price: pool.token0Price,
        token1Price: pool.token1Price,
        txCount: pool.txCount1d,

        volumeUSD1d: pool.volumeUSD1d,
        feesUSD1d: pool.feeUSD1d,
        txCount1d: pool.txCount1d,
        liquidityUSD1dChange: pool.liquidityUSD1dChange,
        volumeUSD1dChange: pool.volumeUSD1dChange,
        feesUSD1dChange: pool.feeUSD1dChange,
        txCount1dChange: pool.txCount1dChange,

        feeApr1d: pool.feeApr1d,
        totalApr1d: pool.totalApr1d,
        incentiveApr: pool.incentiveApr,
        isIncentivized: pool.isIncentivized,
        wasIncentivized: pool.wasIncentivized,

        incentives: incentives.map((incentive) => ({
          id: incentive.id as `${string}:0x${string}`,
          chainId,
          chefType: incentive.chefType as ChefType,
          apr: incentive.apr,
          rewardToken: {
            id: incentive.rewardToken.id as `${string}:0x${string}`,
            address: incentive.rewardToken.address as Address,
            chainId,
            decimals: incentive.rewardToken.decimals,
            name: incentive.rewardToken.name,
            symbol: incentive.rewardToken.symbol,
          },
          rewardPerDay: incentive.rewardPerDay,
          poolAddress: incentive.poolAddress as Address,
          pid: incentive.pid,
          rewarderAddress: incentive.rewarderAddress as Address,
          rewarderType: incentive.rewarderType as RewarderType,
        })),
      } satisfies PoolWithAprs<
        PoolWithIncentives<PoolHistory1D<PoolV4<PoolBase>>>
      >
    }
  } catch (error) {
    console.error('getV4Pool error', error)
  }
  return null
}

export type MaybeV4Pool = Awaited<ReturnType<typeof getV4Pool>>

export type V4Pool = NonNullable<Awaited<ReturnType<typeof getV4Pool>>>
