import { type Hex, hexToNumber, sliceHex, trim } from 'viem'
import type { CLPoolParameters } from '../types'
import { decodeHooksRegistration } from './decodeHooksRegistration'

const decodeCLPoolParameters = (encoded: Hex): CLPoolParameters => {
  // 1. tickspacing is int24, the range is 0x7FFFFF-0x800000
  // 2. encode will pad it to byte32 format
  // 3. so we need to slice it by sliceHex(-3)
  // 4. the last 2 byte is hooks
  // 5. so the slice should be sliceHex(-5, -2)
  const tickSpacing = hexToNumber(sliceHex(encoded, -5, -2), { signed: true })
  const hooksRegistration = decodeHooksRegistration(sliceHex(trim(encoded), -2))
  return {
    tickSpacing,
    hooksRegistration,
  }
}

export const decodePoolParameters = (encoded: Hex): CLPoolParameters => {
  return decodeCLPoolParameters(encoded)
}
