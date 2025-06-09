import type { VariablesOf } from 'gql.tada'

import { type RequestOptions, request } from 'src/lib/request.js'
import type { EvmChainId } from 'sushi/chain'
import { SUSHI_DATA_API_HOST } from '../../data-api-host.js'
import { graphql } from '../../graphql.js'
import { isSushiSwapV4ChainId } from '../../v4.js'

export const V4TokenIdsQuery = graphql(
  `
  query TokenIdsQuery($owner: Bytes!, $chainId: SushiSwapV4ChainId!) {
    v4TokenIds(owner: $owner, chainId: $chainId) {
      id
    }
  }
`,
)

export type GetV4TokenIdsQuerys = VariablesOf<typeof V4TokenIdsQuery>

export async function getV4TokenIdsQuery(
  variables: GetV4TokenIdsQuerys,
  options?: RequestOptions,
) {
  const url = `${SUSHI_DATA_API_HOST}/graphql`

  const chainId = variables.chainId as EvmChainId

  if (!isSushiSwapV4ChainId(chainId)) {
    throw new Error('Invalid chainId')
  }

  try {
    const result = await request(
      {
        url,
        document: V4TokenIdsQuery,
        variables: {
          ...variables,
          owner: variables.owner.toLowerCase(),
        },
      },
      options,
    )
    if (result.v4TokenIds) {
      const tokenIds = result.v4TokenIds
      return tokenIds.map(({ id }) => BigInt(id))
    }
  } catch (error) {
    console.error('getV4TokenIdsQuerys error', error)
  }
  return null
}

export type MaybeV4TokenIds = Awaited<ReturnType<typeof getV4TokenIdsQuery>>

export type V4TokenIds = NonNullable<
  Awaited<ReturnType<typeof getV4TokenIdsQuery>>
>
