import type { VariablesOf } from 'gql.tada'
import { type RequestOptions, request } from 'src/lib/request.js'
import { isEvmChainId } from 'sushi'
import { Token } from 'sushi/currency'
import { SUSHI_DATA_API_HOST } from '../../data-api-host.js'
import { graphql } from '../../graphql.js'
import { SUSHI_REQUEST_HEADERS } from '../../request-headers.js'

export const PoolsQuery = graphql(
  `
  query Pools($chainId: PoolChainId!, $page: Int, $search: [String], $orderBy: PoolsOrderBy, $orderDirection: OrderDirection, $protocols: [Protocol], $onlyIncentivized: Boolean) {
    pools(chainId: $chainId, page: $page, search: $search, protocols: $protocols, onlyIncentivized: $onlyIncentivized, orderBy: $orderBy, orderDirection: $orderDirection) {
      count
      data {
        __typename
        id
        chainId
        name
        swapFee
        protocol
        token0Address
        token1Address
        liquidityUSD
        liquidityUSDChange1d
        volumeUSD1d
        volumeUSD1w
        volumeUSDChange1d
        volumeUSDChange1w
        txCount1d
        txCountChange1d
        feeUSD1d
        feeApr1d
        totalApr1d
        incentiveApr
        isIncentivized
        wasIncentivized
        incentives {
          id
          chainId
          chefType
          apr
          rewardToken {
            id
            chainId
            address
            name
            symbol
            decimals
          }
          rewardPerDay
          poolAddress
          pid
          rewarderAddress
          rewarderType
        }
        source
        ... on Pool {
          address
        }
        ... on _V4Pool {
          poolId
        }
      }
    }
  }
`,
)

export type GetPools = VariablesOf<typeof PoolsQuery>

export async function getPools(variables: GetPools, options?: RequestOptions) {
  const url = `${SUSHI_DATA_API_HOST}/graphql`
  try {
    const result = await request(
      {
        url,
        document: PoolsQuery,
        variables,
        requestHeaders: SUSHI_REQUEST_HEADERS,
      },
      options,
    )
    if (result) {
      return {
        count: result.pools.count,
        data: result.pools.data.map((pool) => ({
          ...pool,
          chainId: variables.chainId,
          incentives: pool.incentives.map((incentive) => {
            // Shouldn't happen, just to make typescript happy
            if (!isEvmChainId(incentive.rewardToken.chainId)) {
              throw new Error('Invalid chainId')
            }

            return {
              ...incentive,
              rewardToken: new Token({
                ...incentive.rewardToken,
                chainId: incentive.rewardToken.chainId,
              }),
            }
          }),
        })),
      }
    }
  } catch (error) {
    console.error('getPools error', error)
  }
  return {
    count: 0,
    data: [],
  }
}

export type PoolsResponse = Awaited<ReturnType<typeof getPools>>
export type Pools = PoolsResponse['data']
export type Pool = Pools[number]
