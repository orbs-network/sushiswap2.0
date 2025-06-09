import type { VariablesOf } from 'gql.tada'

import { type RequestOptions, request } from 'src/lib/request.js'
import type { EvmChainId } from 'sushi'
import { SUSHI_DATA_API_HOST } from 'sushi/config/subgraph'
import type { Address, Hex } from 'viem'
import { graphql } from '../../graphql.js'
import { SUSHI_REQUEST_HEADERS } from '../../request-headers.js'
import { isSushiSwapV4ChainId } from '../../v4.js'
import { type PoolBase, type PoolV4, SushiSwapV4Protocol } from './types.js'

export const V4PoolsQuery = graphql(
  `
    query V4Pools($chainId: SushiSwapV4ChainId!) {
    v4Pools(chainId: $chainId) {
      id
      chainId
      protocol
      name
      createdAt
      swapFee
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

export type GetV4BasePools = VariablesOf<typeof V4PoolsQuery>

export async function getV4BasePools(
  variables: GetV4BasePools,
  options?: RequestOptions,
): Promise<PoolV4<PoolBase>[]> {
  const url = `${SUSHI_DATA_API_HOST}/graphql`
  const chainId = variables.chainId as EvmChainId

  if (!isSushiSwapV4ChainId(chainId)) {
    throw new Error('Invalid chainId')
  }

  const result = await request(
    {
      url,
      document: V4PoolsQuery,
      variables: {
        chainId: chainId,
      },
      requestHeaders: SUSHI_REQUEST_HEADERS,
    },
    options,
  )

  if (result.v4Pools) {
    return result.v4Pools.map(
      (pool) =>
        ({
          id: pool.id as `${string}:0x${string}`,
          poolId: pool.id as Hex,
          chainId,
          name: pool.name,
          swapFee: pool.swapFee,
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
  return []
}

export type V4BasePool = NonNullable<
  Awaited<ReturnType<typeof getV4BasePools>>
>[0]
