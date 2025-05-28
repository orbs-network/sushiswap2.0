import type { BigintIsh } from 'sushi/math'

// adapted from ProtocolFeeController.getLpFeeFromTotalFee

// 100% in hundredths of a bip (1 unit = 0.0001 %)
const ONE_HUNDRED_PERCENT_RATIO = 1_000_000n

// Max protocol fee is 0.4% (4000 pips)
const MAX_PROTOCOL_FEE = 4_000n

// 33%
const DEFAULT_PROTOCOL_FEE_SPLIT = 330_000n

/**
 * Derive lpFee from a front-end “total fee”.
 *
 * @param totalFee                total fee (LP + protocol) in 0.0001 % units
 * @param protocolFeeSplitRatio   controller setting, parts-per-million (e.g. 330 000 = 33 %)
 * @returns                       lpFee to put in poolKey.fee (same units)
 */
export function getLpFeeFromTotalFee(
  _totalFee: BigintIsh,
  protocolFeeSplitRatio: bigint = DEFAULT_PROTOCOL_FEE_SPLIT,
): bigint {
  const totalFee = BigInt(_totalFee)
  // the formula is derived from the following equation:
  // poolKey.fee = lpFee = (totalFee - protocolFee) / (1 - protocolFee)
  let oneDirectionProtocolFee =
    (totalFee * protocolFeeSplitRatio) / ONE_HUNDRED_PERCENT_RATIO
  if (oneDirectionProtocolFee > MAX_PROTOCOL_FEE) {
    oneDirectionProtocolFee = MAX_PROTOCOL_FEE
  }

  return (
    ((totalFee - oneDirectionProtocolFee) * ONE_HUNDRED_PERCENT_RATIO) /
    (ONE_HUNDRED_PERCENT_RATIO - oneDirectionProtocolFee)
  )
}

/**
 * Calculate the *per-direction* protocol fee that should be stored
 * in `slot0.protocolFee` for a static-fee pool.
 *
 * @param lpFee                 poolKey.fee (LP fee) in 0.0001 % units
 * @param protocolFeeSplitRatio controller setting, ppm (e.g. 330 000 = 33 %)
 * @returns                     protocol fee per leg, same units (cap = 4 000)
 */
export function getProtocolFeeFromLpFee(
  _lpFee: BigintIsh,
  protocolFeeSplitRatio: bigint = DEFAULT_PROTOCOL_FEE_SPLIT,
): bigint {
  const lpFee = BigInt(_lpFee)
  /// the formula is derived from the following equation:
  /// totalSwapFee = protocolFee + (1 - protocolFee) * lpFee = protocolFee / protocolFeeSplitRatio
  let oneDirectionProtocolFee =
    (lpFee * ONE_HUNDRED_PERCENT_RATIO) /
    (lpFee +
      (ONE_HUNDRED_PERCENT_RATIO * ONE_HUNDRED_PERCENT_RATIO) /
        protocolFeeSplitRatio -
      ONE_HUNDRED_PERCENT_RATIO)

  // cap the protocol fee at 0.4%, if it's over the limit we set it to the max
  if (oneDirectionProtocolFee > MAX_PROTOCOL_FEE) {
    oneDirectionProtocolFee = MAX_PROTOCOL_FEE
  }

  return oneDirectionProtocolFee
}
