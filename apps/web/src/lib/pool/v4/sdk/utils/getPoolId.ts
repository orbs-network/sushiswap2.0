import {
  type Hex,
  encodeAbiParameters,
  keccak256,
  parseAbiParameters,
  zeroAddress,
} from 'viem'
import type { PoolKey } from '../types'
import { encodePoolParameters } from './encodePoolParameters'

/**
 * `PoolId` is a bytes32 of `keccak256(abi.encode(poolKey))`
 * @see {@link PoolKey}
 * @see {@link https://github.com/pancakeswap/infinity-core/blob/main/src/types/PoolId.sol|infinity-core}
 * @param param0
 * @returns
 */
export const getPoolId = ({
  currency0,
  currency1,
  hooks = zeroAddress,
  poolManager,
  fee,
  parameters,
}: PoolKey): Hex => {
  const poolParameter = encodePoolParameters(parameters)

  return keccak256(
    encodeAbiParameters(
      parseAbiParameters('address, address, address, address, uint24, bytes32'),
      [currency0, currency1, hooks, poolManager, fee, poolParameter],
    ),
  )
}
