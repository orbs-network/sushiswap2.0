import type { VariablesOf } from 'gql.tada'

import { type RequestOptions, request } from 'src/lib/request.js'
import type { Address, Hex } from 'viem'
import { SUSHI_DATA_API_HOST } from '../../data-api-host.js'
import { graphql } from '../../graphql.js'
import { isSushiSwapV4ChainId } from '../../v4.js'
import { type PoolBase, type PoolV4, SushiSwapV4Protocol } from './types.js'

export const V4PoolsByTokensQuery = graphql(
  `
    query V4PoolsByTokens($token0: Bytes!, $token1: Bytes!, $chainId: SushiSwapV4ChainId!) {
    v4PoolsByTokens(token0: $token0, token1: $token1, chainId: $chainId) {
        id
        poolId 
        chainId
        protocol
        name
        createdAt
        swapFee
        lpFee
        protocolFee
        tickSpacing
        token0 {
        id
        chainId
        address
        name
        symbol
        decimals
        }
        token1 {
        id
        chainId
        address
        name
        symbol
        decimals
        }
        source
        reserve0
        reserve1
        liquidity
        token0Price
        token1Price
        sqrtPrice
        tick
        observationIndex
        volumeUSD
        liquidityUSD
        feesUSD
        txCount
    }
    }
`,
)

export type GetV4BasePoolsByTokens = VariablesOf<typeof V4PoolsByTokensQuery>

export async function getV4BasePoolsByToken(
  variables: GetV4BasePoolsByTokens,
  options?: RequestOptions,
): Promise<PoolV4<PoolBase>[]> {
  const url = `${SUSHI_DATA_API_HOST}/graphql`
  const chainId = variables.chainId

  if (!isSushiSwapV4ChainId(chainId)) {
    throw new Error('Invalid chainId')
  }

  const tokens = [variables.token0, variables.token1] as const

  const result = await request(
    {
      url,
      document: V4PoolsByTokensQuery,
      variables: {
        chainId: chainId,
        token0: tokens[0].toLowerCase(),
        token1: tokens[1].toLowerCase(),
      },
    },
    options,
  )

  if (result.v4PoolsByTokens) {
    return result.v4PoolsByTokens.map(
      (pool) =>
        ({
          id: pool.id as `${string}:0x${string}`,
          poolId: pool.poolId as Hex,
          chainId,
          name: pool.name,
          swapFee: pool.swapFee,
          lpFee: pool.lpFee,
          protocolFee: pool.protocolFee,
          tickSpacing: pool.tickSpacing,
          protocol: SushiSwapV4Protocol,
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

          reserve0: BigInt(pool.reserve0),
          reserve1: BigInt(pool.reserve1),
          liquidity: BigInt(pool.liquidity),
          token0Price: pool.token0Price,
          token1Price: pool.token1Price,

          sqrtPrice: BigInt(pool.sqrtPrice),
          tick: BigInt(pool.tick),
          observationIndex: BigInt(pool.observationIndex),

          liquidityUSD: pool.liquidityUSD,
          volumeUSD: pool.volumeUSD,
          feesUSD: pool.feesUSD,
          txCount: pool.txCount,
        }) satisfies PoolV4<PoolBase>,
    )
  }

  throw new Error('No pool found')
}
