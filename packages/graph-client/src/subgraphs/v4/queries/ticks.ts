import type { VariablesOf } from 'gql.tada'

import { getSubgraphUrl } from 'src/lib/get-subgraph-url.js'
import { type RequestOptions, request } from 'src/lib/request.js'
import { EvmChainId } from 'sushi'
import { graphql } from '../graphql.js'

export const V4TicksQuery = graphql(
  `
  query V4Ticks($poolId: String!, $lastTick: BigInt) {
    ticks(
      first: 1000,
      where: { pool: $poolId, tickIdx_gt: $lastTick },
      orderBy: tickIdx,
      orderDirection: asc
    ) {
      id
      poolAddress
      tickIdx
      liquidityGross
      liquidityNet
      price0
      price1
      createdAtTimestamp
      createdAtBlockNumber
    }
  }
`,
)

export type GetV4Ticks = VariablesOf<typeof V4TicksQuery>

export async function getV4Ticks(
  variables: GetV4Ticks,
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
        document: V4TicksQuery,
        variables,
      },
      options,
    )
    if (result.ticks) {
      const ticks = result.ticks
      return ticks.map(({ poolAddress, ...tick }) => ({
        poolId: poolAddress,
        ...tick,
      }))
    }
  } catch (error) {
    console.error('getV4Ticks error', error)
  }
  return null
}

export type MaybeV4Ticks = Awaited<ReturnType<typeof getV4Ticks>>

export type V4Ticks = NonNullable<Awaited<ReturnType<typeof getV4Ticks>>>
