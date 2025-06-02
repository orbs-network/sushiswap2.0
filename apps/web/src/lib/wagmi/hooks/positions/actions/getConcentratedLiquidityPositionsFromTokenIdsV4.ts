import { readContracts } from '@wagmi/core/actions'
import {
  SUSHISWAP_V4_CL_POSITION_MANAGER,
  type SushiSwapV4ChainId,
} from 'src/lib/pool/v4'
import { decodePoolKey } from 'src/lib/pool/v4/sdk/utils/decodePoolKey'
import type { PublicWagmiConfig } from '../../../config/public'
import type { ConcentratedLiquidityPositionV4 } from '../types'

const abiShard = [
  {
    type: 'function',
    name: 'positions',
    inputs: [{ name: 'tokenId', type: 'uint256', internalType: 'uint256' }],
    outputs: [
      {
        name: 'poolKey',
        type: 'tuple',
        internalType: 'struct PoolKey',
        components: [
          { name: 'currency0', type: 'address', internalType: 'Currency' },
          { name: 'currency1', type: 'address', internalType: 'Currency' },
          { name: 'hooks', type: 'address', internalType: 'contract IHooks' },
          {
            name: 'poolManager',
            type: 'address',
            internalType: 'contract IPoolManager',
          },
          { name: 'fee', type: 'uint24', internalType: 'uint24' },
          { name: 'parameters', type: 'bytes32', internalType: 'bytes32' },
        ],
      },
      { name: 'tickLower', type: 'int24', internalType: 'int24' },
      { name: 'tickUpper', type: 'int24', internalType: 'int24' },
      { name: 'liquidity', type: 'uint128', internalType: 'uint128' },
      {
        name: 'feeGrowthInside0LastX128',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'feeGrowthInside1LastX128',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_subscriber',
        type: 'address',
        internalType: 'contract ICLSubscriber',
      },
    ],
    stateMutability: 'view',
  },
] as const

export const getConcentratedLiquidityPositionsV3FromTokenIdsV4 = async ({
  tokenIds,
  config,
}: {
  tokenIds: { chainId: SushiSwapV4ChainId; tokenId: bigint }[]
  config: PublicWagmiConfig
}): Promise<ConcentratedLiquidityPositionV4[]> => {
  const results = await readContracts(config, {
    contracts: tokenIds.map(({ chainId, tokenId }) => ({
      address: SUSHISWAP_V4_CL_POSITION_MANAGER[chainId],
      abi: abiShard,
      chainId,
      functionName: 'positions',
      args: [tokenId],
    })),
  })

  return results
    .map((result, i) => {
      if (result.status !== 'success' || !result.result) return undefined

      const { tokenId, chainId } = tokenIds[i]

      const [
        encodedPoolKey,
        tickLower,
        tickUpper,
        liquidity,
        feeGrowthInside0LastX128,
        feeGrowthInside1LastX128,
        subscriber,
      ] = result.result

      const poolKey = decodePoolKey(encodedPoolKey)
      return {
        id: tokenId.toString(),
        poolKey,
        chainId,
        tokenId,
        fee: poolKey.fee,
        feeGrowthInside0LastX128,
        feeGrowthInside1LastX128,
        liquidity: liquidity,
        tickLower: tickLower,
        tickUpper: tickUpper,
        currency0: poolKey.currency0,
        currency1: poolKey.currency1,
        subscriber,
      }
    })
    .filter((el): el is NonNullable<typeof el> => el !== undefined)
}
