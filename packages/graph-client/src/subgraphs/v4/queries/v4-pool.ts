import type { VariablesOf } from 'gql.tada'

import { getSubgraphUrl } from 'src/lib/get-subgraph-url.js'
import { type RequestOptions, request } from 'src/lib/request.js'
import { EvmChainId } from 'sushi'
import type { Address, Hex } from 'viem'
import { graphql } from '../graphql.js'

export const V4PoolQuery = graphql(
  `
  query V4Pool($id: ID!) {
    pool(id: $id) {
      id
      createdAtBlockNumber
      createdAtTimestamp
      feeTier
      tickSpacing
      hooks
      hooksRegistration
      token0 {
        id
        name
        symbol
        decimals
      }
      token1 {
        id
        name
        symbol
        decimals
      }
      liquidity
      sqrtPrice
      tick
      observationIndex
      volumeUSD
      totalValueLockedUSD
      totalValueLockedToken0
      totalValueLockedToken1
      token0Price
      token1Price
      txCount
    }
  }
`,
)

export type GetV4Pool = VariablesOf<typeof V4PoolQuery>

export async function getV4Pool(
  variables: GetV4Pool,
  options?: RequestOptions,
) {
  const chainId = EvmChainId.POLYGON

  const url = getSubgraphUrl({
    chainId,
    getter: () => 'api.studio.thegraph.com/query/32073/v-4-polygon/v0.0.1',
  })

  // const chainId = Number(variables.chainId) as EvmChainId

  // if (!isSushiSwapV3ChainId(chainId)) {
  //   throw new Error('Invalid chainId')
  // }
  try {
    const result = await request(
      {
        url,
        document: V4PoolQuery,
        variables,
      },
      options,
    )
    if (result.pool) {
      const pool = result.pool
      return {
        id: pool.id as Hex,
        chainId,
        name: `${pool.token0.symbol}-${pool.token1.symbol}`,
        swapFee: +pool.feeTier,
        tickSpacing: +pool.tickSpacing,
        protocol: 'SUSHISWAP_V4',
        // reserve0: BigInt(pool.reserve0),
        // reserve1: BigInt(pool.reserve1),
        liquidity: BigInt(pool.liquidity),

        sqrtPrice: BigInt(pool.sqrtPrice),
        tick: typeof pool.tick === 'string' ? BigInt(pool.tick) : pool.tick,
        observationIndex: BigInt(pool.observationIndex),
        // feeGrowthGlobal0X128: BigInt(pool.feeGrowthGlobal0X128),
        // feeGrowthGlobal1X128: BigInt(pool.feeGrowthGlobal1X128),

        liquidityUSD: pool.totalValueLockedUSD,
        volumeUSD: pool.volumeUSD,
        feesUSD: +pool.volumeUSD * +pool.feeTier,

        reserve0: pool.totalValueLockedToken0,
        reserve1: pool.totalValueLockedToken1,

        token0: {
          id: `${chainId}:${pool.token0.id}` as `${string}:0x${string}`,
          address: pool.token0.id as Address,
          chainId,
          decimals: pool.token0.decimals,
          name: pool.token0.name,
          symbol: pool.token0.symbol,
        },
        token1: {
          id: `${chainId}:${pool.token1.id}` as `${string}:0x${string}`,
          address: pool.token1.id as Address,
          chainId,
          decimals: pool.token1.decimals,
          name: pool.token1.name,
          symbol: pool.token1.symbol,
        },
        token0Price: pool.token0Price,
        token1Price: pool.token1Price,
        txCount: pool.txCount,

        // volumeUSD1d: pool.volumeUSD1d,
        // feesUSD1d: pool.feeUSD1d,
        // txCount1d: pool.txCount1d,
        // liquidityUSD1dChange: pool.liquidityUSD1dChange,
        // volumeUSD1dChange: pool.volumeUSD1dChange,
        // feesUSD1dChange: pool.feeUSD1dChange,
        // txCount1dChange: pool.txCount1dChange,

        // feeApr1d: pool.feeApr1d,
        // totalApr1d: pool.totalApr1d,
        // incentiveApr: pool.incentiveApr,
        // isIncentivized: pool.isIncentivized,
        // wasIncentivized: pool.wasIncentivized,

        // incentives: incentives.map((incentive) => ({
        //   id: incentive.id as `${string}:0x${string}`,
        //   chainId,
        //   chefType: incentive.chefType as ChefType,
        //   apr: incentive.apr,
        //   rewardToken: {
        //     id: incentive.rewardToken.id as `${string}:0x${string}`,
        //     address: incentive.rewardToken.address as Address,
        //     chainId,
        //     decimals: incentive.rewardToken.decimals,
        //     name: incentive.rewardToken.name,
        //     symbol: incentive.rewardToken.symbol,
        //   },
        //   rewardPerDay: incentive.rewardPerDay,
        //   poolAddress: incentive.poolAddress as Address,
        //   pid: incentive.pid,
        //   rewarderAddress: incentive.rewarderAddress as Address,
        //   rewarderType: incentive.rewarderType as RewarderType,
        // })),
      }
    }
  } catch (error) {
    console.error('getV4Pool error', error)
  }
  return null
}

export type MaybeV4Pool = Awaited<ReturnType<typeof getV4Pool>>

export type V4Pool = NonNullable<Awaited<ReturnType<typeof getV4Pool>>>
