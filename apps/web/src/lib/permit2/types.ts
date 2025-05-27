import type { Hex } from 'viem'
import type { PermitSingle } from './allowanceTransfer'

export type Permit2Signature = PermitSingle & {
  signature: Hex
}
