import type { VariablesOf } from 'gql.tada'

import { type RequestOptions, request } from 'src/lib/request.js'
import { SUSHI_DATA_API_HOST } from 'sushi/config/subgraph'
import { graphql } from '../../graphql.js'

export const SushiV4BurnsQuery = graphql(`
query V4Burns($poolId: Bytes!, $chainId: SushiSwapV4ChainId!) {
  v4Burns(id: $poolId, chainId: $chainId) {
    id
    logIndex
    amountUSD
    amount1
    amount0
    amount
    origin
    transaction {
      id
      blockNumber
      timestamp
    }
  }
}
`)

export type GetSushiV4Burns = VariablesOf<typeof SushiV4BurnsQuery>

export async function getSushiV4Burns(
  { ...variables }: GetSushiV4Burns,
  options?: RequestOptions,
) {
  const url = `${SUSHI_DATA_API_HOST}/graphql`

  const result = await request(
    { url, document: SushiV4BurnsQuery, variables },
    options,
  )

  if (result) {
    return result.v4Burns
  }

  throw new Error(`Failed to fetch burns for ${variables.chainId}`)
}

export type SushiV4Burns = Awaited<ReturnType<typeof getSushiV4Burns>>
