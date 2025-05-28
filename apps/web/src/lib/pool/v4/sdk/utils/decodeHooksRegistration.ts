import invariant from 'tiny-invariant'
import type { Hex } from 'viem'
import { HOOKS_REGISTRATION_OFFSET } from '../constants'
import type { HooksRegistration } from '../types'

export const decodeHooksRegistration = (
  encoded: Hex | number,
): HooksRegistration => {
  const registration =
    typeof encoded === 'number' ? encoded : Number.parseInt(encoded, 16)

  invariant(
    registration >= 0 && registration <= 0x3fff,
    'Invalid hooks registration',
  )

  const hooksRegistration: Partial<HooksRegistration> = {}

  for (const key in HOOKS_REGISTRATION_OFFSET) {
    if (
      registration &
      (1 << HOOKS_REGISTRATION_OFFSET[key as keyof HooksRegistration])
    ) {
      hooksRegistration[key as keyof HooksRegistration] = true
    }
  }

  return hooksRegistration as HooksRegistration
}
