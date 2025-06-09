import type { VariablesOf } from 'gql.tada'

import { type RequestOptions, request } from 'src/lib/request.js'
import { SUSHI_DATA_API_HOST } from '../../data-api-host.js'
import { graphql } from '../../graphql.js'

export const SushiV4MintsQuery = graphql(`
query V4Mints($poolId: Bytes!, $chainId: SushiSwapV4ChainId!) {
  v4Mints(id: $poolId, chainId: $chainId) {
    id
    logIndex
    amountUSD
    amount1
    amount0
    amount
    origin
    sender
    transaction {      
      id
      blockNumber
      timestamp
    }
  }
}
`)

export type GetSushiV4Mints = VariablesOf<typeof SushiV4MintsQuery>

export async function getSushiV4Mints(
  { ...variables }: GetSushiV4Mints,
  options?: RequestOptions,
) {
  const url = `${SUSHI_DATA_API_HOST}/graphql`

  const result = await request(
    { url, document: SushiV4MintsQuery, variables },
    options,
  )

  if (result) {
    return result.v4Mints
  }

  throw new Error(`Failed to fetch mints for ${variables.chainId}`)
}

export type SushiV4Mints = Awaited<ReturnType<typeof getSushiV4Mints>>
