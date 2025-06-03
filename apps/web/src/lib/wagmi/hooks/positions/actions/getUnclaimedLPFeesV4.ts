import { readContracts } from '@wagmi/core/actions'
import {
  SUSHISWAP_V4_CL_LP_FEES_HELPER,
  SUSHISWAP_V4_CL_POOL_MANAGER,
  SUSHISWAP_V4_CL_POSITION_MANAGER,
  getPoolId,
} from 'src/lib/pool/v4'
import { toHex } from 'sushi'
import { pad } from 'viem'
import type { PublicWagmiConfig } from '../../../config/public'
import type { ConcentratedLiquidityPositionV4 } from '../types'

const abiShard = [
  {
    inputs: [
      {
        internalType: 'contract ICLPoolManager',
        name: 'poolManager',
        type: 'address',
      },
      { internalType: 'PoolId', name: 'id', type: 'bytes32' },
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'int24', name: 'tickLower', type: 'int24' },
      { internalType: 'int24', name: 'tickUpper', type: 'int24' },
      { internalType: 'bytes32', name: 'salt', type: 'bytes32' },
    ],
    name: 'getLPFees',
    outputs: [
      { internalType: 'uint256', name: 'feesOwed0', type: 'uint256' },
      { internalType: 'uint256', name: 'feesOwed1', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const

interface UnclaimedLPFeesV4 {
  currencyOwed0: bigint
  currencyOwed1: bigint
}

export const getUnclaimedLPFeesV4 = async ({
  positionData,
  config,
}: {
  positionData: Pick<
    ConcentratedLiquidityPositionV4,
    'chainId' | 'poolKey' | 'tickLower' | 'tickUpper' | 'id'
  >[]
  config: PublicWagmiConfig
}): Promise<Array<UnclaimedLPFeesV4 | undefined>> => {
  const results = await readContracts(config, {
    contracts: positionData.map(
      ({ chainId, poolKey, tickLower, tickUpper, id }) => ({
        address: SUSHISWAP_V4_CL_LP_FEES_HELPER[chainId],
        abi: abiShard,
        chainId,
        functionName: 'getLPFees',
        args: [
          SUSHISWAP_V4_CL_POOL_MANAGER[chainId],
          getPoolId(poolKey),
          SUSHISWAP_V4_CL_POSITION_MANAGER[chainId], // owner
          tickLower,
          tickUpper,
          pad(toHex(id), { size: 32 }),
        ],
      }),
    ),
  })

  return results.map((result) => {
    const lpFees = result.result
    if (!lpFees) {
      return undefined
    }
    return {
      fees: lpFees,
      currencyOwed0: lpFees[0],
      currencyOwed1: lpFees[1],
    }
  })
}
