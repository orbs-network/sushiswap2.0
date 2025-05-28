import { type Address, zeroAddress } from 'viem'
import type { PoolKey } from '../types'
import { decodePoolParameters } from './decodePoolParameters'

export const decodePoolKey = (
  rawPoolKey: Omit<PoolKey, 'parameters'> & {
    parameters: Address
  },
) => {
  const { parameters } = rawPoolKey
  const decodeParameters = decodePoolParameters(parameters ?? zeroAddress)
  return {
    ...rawPoolKey,
    parameters: decodeParameters,
  }
}
