import type { VariablesOf } from 'gql.tada'

import { getSubgraphUrl } from 'src/lib/get-subgraph-url.js'
import { type RequestOptions, request } from 'src/lib/request.js'
import { EvmChainId } from 'sushi'
import { graphql } from '../graphql.js'

export const V4UserTokenIdsQuery = graphql(
  `
  query UserTokenIdsQuery($account: String!) {
    positions(first: 1000, where: {owner: $account}) {
      id
    }
  }
`,
)

export type GetV4UserTokenIdsQuerys = VariablesOf<typeof V4UserTokenIdsQuery>

export async function getV4UserTokenIdsQuery(
  variables: GetV4UserTokenIdsQuerys,
  options?: RequestOptions,
) {
  const chainId = EvmChainId.POLYGON

  const url = getSubgraphUrl({
    chainId,
    getter: () => 'api.studio.thegraph.com/query/32073/v-4-polygon/v0.0.1',
  })

  // const chainId = Number(variables.chainId) as EvmChainId

  // if (!isSushiSwapV4hainId(chainId)) {
  //   throw new Error('Invalid chainId')
  // }
  try {
    const result = await request(
      {
        url,
        document: V4UserTokenIdsQuery,
        variables: {
          account: variables.account.toLowerCase(),
        },
      },
      options,
    )
    if (result.positions) {
      const positions = result.positions
      return positions.map(({ id }) => BigInt(id))
    }
  } catch (error) {
    console.error('getV4UserTokenIdsQuerys error', error)
  }
  return null
}

export type MaybeV4TokenIds = Awaited<ReturnType<typeof getV4UserTokenIdsQuery>>

export type V4TokenIds = NonNullable<
  Awaited<ReturnType<typeof getV4UserTokenIdsQuery>>
>
