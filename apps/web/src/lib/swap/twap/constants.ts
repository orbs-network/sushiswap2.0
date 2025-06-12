import { type TimeDuration, TimeUnit } from '@orbs-network/twap-sdk'

export const TwapExpiryTimeDurations = {
  Day: {
    unit: TimeUnit.Days,
    value: 1,
  },
  Week: {
    unit: TimeUnit.Weeks,
    value: 1,
  },
  Month: {
    unit: TimeUnit.Months,
    value: 1,
  },
  Year: {
    unit: TimeUnit.Years,
    value: 1,
  },
} as const

export const TWAP_MIN_FILL_DELAY = {
  value: 5,
  unit: TimeUnit.Minutes,
} as const satisfies TimeDuration

export const TWAP_MAX_FILL_DELAY = {
  value: 365,
  unit: TimeUnit.Days,
} as const satisfies TimeDuration
