import { type Hex, concat, encodePacked, pad } from 'viem'
import type { CLPoolParameters } from '../types'
import { encodeHooksRegistration } from './encodeHooksRegistration'

const encodeCLPoolParameters = (params: CLPoolParameters): Hex => {
  const hooks = encodeHooksRegistration(params?.hooksRegistration)
  const tickSpacing = encodePacked(['int24'], [params.tickSpacing])

  return pad(concat([tickSpacing, hooks]))
}

export const encodePoolParameters = (params: CLPoolParameters): Hex => {
  return encodeCLPoolParameters(params)
}
