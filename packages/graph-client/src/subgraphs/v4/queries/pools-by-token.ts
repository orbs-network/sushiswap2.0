import type { VariablesOf } from 'gql.tada'

import { getSubgraphUrl } from 'src/lib/get-subgraph-url.js'
import { type RequestOptions, request } from 'src/lib/request.js'
import { EvmChainId } from 'sushi'
import type { Address, Hex } from 'viem'
import { graphql } from '../graphql.js'

// TODO: migrate from subgraph to data api & add support for multiple chains

export const V4PoolsByTokensQuery = graphql(
  `
    query V4PoolsByTokens($token0: String!, $token1: String!) {
      pools(
        where: {token0: $token0, token1: $token1}
      ) {
        id
        token0 {
          decimals
          id
          name
          symbol
        }
        token1 {
          id
          name
          symbol
          decimals
        }
        tickSpacing
        tick
        sqrtPrice
        observationIndex
        liquidity
        feesUSD
        feeTier
        createdAtBlockNumber
        createdAtTimestamp
        hooks
        hooksRegistration
        token0Price
        token1Price
        txCount
        volumeUSD
        totalValueLockedUSD
      }
    }
`,
)

export type GetV4BasePoolsByTokens = VariablesOf<typeof V4PoolsByTokensQuery>

export async function getV4BasePoolsByToken(
  variables: GetV4BasePoolsByTokens,
  options?: RequestOptions,
) {
  const chainId = EvmChainId.POLYGON

  const url = getSubgraphUrl({
    chainId,
    getter: () => 'api.studio.thegraph.com/query/32073/v-4-polygon/v0.0.1',
  })

  // const chainId = variables.chainId

  // if (!isSushiSwapV4ChainId(chainId)) {
  //   throw new Error('Invalid chainId')
  // }

  const tokens = [variables.token0, variables.token1] as const

  const result = await request(
    {
      url,
      document: V4PoolsByTokensQuery,
      variables: {
        token0: tokens[0].toLowerCase(),
        token1: tokens[1].toLowerCase(),
      },
    },
    options,
  )

  if (result.pools) {
    return result.pools.map(
      (pool) => ({
        id: pool.id as Hex,
        chainId,
        name: `${pool.token0.symbol} / ${pool.token1.symbol}`,
        protocol: 'SUSHISWAP_V4',
        swapFee: +pool.feeTier,
        tickSpacing: +pool.tickSpacing,
        hooks: pool.hooks,
        hooksRegistration: pool.hooksRegistration,
        // isProtocolFeeEnabled: pool.isProtocolFeeEnabled,
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

        // reserve0: BigInt(pool.reserve0),
        // reserve1: BigInt(pool.reserve1),
        liquidity: BigInt(pool.liquidity),
        token0Price: pool.token0Price,
        token1Price: pool.token1Price,
        sqrtPrice: BigInt(pool.sqrtPrice),
        tick: typeof pool.tick === 'string' ? BigInt(pool.tick) : pool.tick,
        observationIndex: BigInt(pool.observationIndex),
        // feeGrowthGlobal0X128: BigInt(pool.feeGrowthGlobal0X128),
        // feeGrowthGlobal1X128: BigInt(pool.feeGrowthGlobal1X128),
        liquidityUSD: +pool.totalValueLockedUSD,
        volumeUSD: pool.volumeUSD,
        feesUSD: pool.feesUSD,
        txCount: pool.txCount,
      }), //satisfies PoolV3<PoolBase>,
    )
  }

  throw new Error('No pool found')
}

export type SushiSwapV4BasePool = Awaited<
  ReturnType<typeof getV4BasePoolsByToken>
>
