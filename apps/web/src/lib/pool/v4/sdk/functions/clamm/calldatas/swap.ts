import { type Hex, encodeFunctionData } from 'viem'
import type { PoolKey } from '../../../types'
import { encodePoolKey } from '../../../utils/encodePoolKey'

export const sushiswapV4CLPoolManagerAbi_swap = [
  {
    type: 'function',
    name: 'swap',
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
      {
        name: 'params',
        type: 'tuple',
        internalType: 'struct ICLPoolManager.SwapParams',
        components: [
          { name: 'zeroForOne', type: 'bool', internalType: 'bool' },
          { name: 'amountSpecified', type: 'int256', internalType: 'int256' },
          {
            name: 'sqrtPriceLimitX96',
            type: 'uint160',
            internalType: 'uint160',
          },
        ],
      },
      { name: 'hookData', type: 'bytes', internalType: 'bytes' },
    ],
    outputs: [{ name: 'delta', type: 'int256', internalType: 'BalanceDelta' }],
    stateMutability: 'nonpayable',
  },
] as const

export type CLPoolSwapParams = {
  zeroForOne: boolean
  amountSpecified: bigint
  sqrtPriceLimitX96: bigint
}

export const encodeCLPoolSwapCalldata = (
  poolKey: PoolKey<'CL'>,
  swapParams: CLPoolSwapParams,
  hookData: Hex = '0x',
) => {
  return encodeFunctionData({
    abi: sushiswapV4CLPoolManagerAbi_swap,
    functionName: 'swap',
    args: [encodePoolKey(poolKey), swapParams, hookData],
  })
}
