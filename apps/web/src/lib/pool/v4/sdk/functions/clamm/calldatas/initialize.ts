import { encodeFunctionData } from 'viem'
import type { PoolKey } from '../../../types'
import { encodePoolKey } from '../../../utils'

export const sushiswapV4CLPoolManagerAbi_initialize = [
  {
    type: 'function',
    name: 'initialize',
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
      { name: 'sqrtPriceX96', type: 'uint160', internalType: 'uint160' },
    ],
    outputs: [{ name: 'tick', type: 'int24', internalType: 'int24' }],
    stateMutability: 'nonpayable',
  },
] as const

export const encodeCLPoolInitializeCalldata = (
  poolKey: PoolKey<'CL'>,
  sqrtPriceX96: bigint,
) => {
  return encodeFunctionData({
    abi: sushiswapV4CLPoolManagerAbi_initialize,
    functionName: 'initialize',
    args: [encodePoolKey(poolKey), sqrtPriceX96],
  })
}
