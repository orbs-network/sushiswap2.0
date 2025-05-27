import type { Amount, Type } from 'sushi/currency'
import type { BigintIsh } from 'sushi/math'
import type { PermitSingle } from './allowanceTransfer'
import { PERMIT_EXPIRATION, PERMIT_SIG_EXPIRATION } from './constants'

export const toDeadline = (expiration: number): number => {
  return Math.floor((Date.now() + expiration) / 1000)
}

export const generatePermitTypedData = (
  amount: Amount<Type>,
  nonce: BigintIsh,
  spender: string,
): PermitSingle => {
  return {
    details: {
      token: amount.currency.wrapped.address,
      amount: amount.quotient.toString(),
      expiration: toDeadline(PERMIT_EXPIRATION).toString(),
      nonce: nonce.toString(),
    },
    spender,
    sigDeadline: toDeadline(PERMIT_SIG_EXPIRATION).toString(),
  }
}
