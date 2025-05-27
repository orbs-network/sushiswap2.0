import { type Hex, encodeFunctionData } from 'viem'
import type { PoolKey } from '../../../types'
import { encodePoolKey } from '../../../utils/encodePoolKey'

export const sushiswapV4CLPoolManagerAbi_donate = [
  {
    type: 'function',
    name: 'donate',
    inputs: [
      {
        name: 'key',
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
      { name: 'amount0', type: 'uint256', internalType: 'uint256' },
      { name: 'amount1', type: 'uint256', internalType: 'uint256' },
      { name: 'hookData', type: 'bytes', internalType: 'bytes' },
    ],
    outputs: [{ name: 'delta', type: 'int256', internalType: 'BalanceDelta' }],
    stateMutability: 'nonpayable',
  },
] as const

export const encodeCLPoolDonateCalldata = (
  poolKey: PoolKey<'CL'>,
  amount0: bigint,
  amount1: bigint,
  hookData: Hex = '0x',
) => {
  return encodeFunctionData({
    abi: sushiswapV4CLPoolManagerAbi_donate,
    functionName: 'donate',
    args: [encodePoolKey(poolKey), amount0, amount1, hookData],
  })
}
