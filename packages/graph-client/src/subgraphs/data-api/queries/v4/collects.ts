import type { VariablesOf } from 'gql.tada'

import { type RequestOptions, request } from 'src/lib/request.js'
import { SUSHI_DATA_API_HOST } from '../../data-api-host.js'
import { graphql } from '../../graphql.js'

export const SushiV4CollectsQuery = graphql(`
query V4Collects($poolId: Bytes!, $chainId: SushiSwapV4ChainId!) {
  v4Collects(id: $poolId, chainId: $chainId) {
    id
    logIndex
    amountUSD
    amount1
    amount0
    origin
    transaction {
      id
      blockNumber
      timestamp
    }
  }
}
`)

export type GetSushiV4Collects = VariablesOf<typeof SushiV4CollectsQuery>

export async function getSushiV4Collects(
  { ...variables }: GetSushiV4Collects,
  options?: RequestOptions,
) {
  const url = `${SUSHI_DATA_API_HOST}/graphql`

  const result = await request(
    { url, document: SushiV4CollectsQuery, variables },
    options,
  )

  if (result) {
    return result.v4Collects
  }

  throw new Error(`Failed to fetch collects for ${variables.chainId}`)
}

export type SushiV4Collects = Awaited<ReturnType<typeof getSushiV4Collects>>
