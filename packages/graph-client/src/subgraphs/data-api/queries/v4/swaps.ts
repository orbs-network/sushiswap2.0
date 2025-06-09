import type { VariablesOf } from 'gql.tada'

import { type RequestOptions, request } from 'src/lib/request.js'
import type { EvmChainId } from 'sushi/chain'
import { SUSHI_DATA_API_HOST } from 'sushi/config/subgraph'
import { graphql } from '../../graphql.js'
import { isSushiSwapV4ChainId } from '../../v4.js'

export const SushiV4SwapsQuery = graphql(`
  query V4Swaps($poolId: Bytes!, $chainId: SushiSwapV4ChainId!) {
    v4Swaps(id: $poolId, chainId: $chainId) {
      id
      logIndex
      amountUSD
      amount1
      amount0
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

export type GetSushiV4Swaps = VariablesOf<typeof SushiV4SwapsQuery>

export async function getSushiV4Swaps(
  { ...variables }: GetSushiV4Swaps,
  options?: RequestOptions,
) {
  const url = `${SUSHI_DATA_API_HOST}/graphql`
  const chainId = variables.chainId as EvmChainId

  if (!isSushiSwapV4ChainId(chainId)) {
    throw new Error('Invalid chainId')
  }

  const result = await request(
    { url, document: SushiV4SwapsQuery, variables },
    options,
  )

  if (result) {
    return result.v4Swaps
  }

  throw new Error(`Failed to fetch swaps for ${variables.chainId}`)
}

export type SushiV4Swaps = Awaited<ReturnType<typeof getSushiV4Swaps>>
