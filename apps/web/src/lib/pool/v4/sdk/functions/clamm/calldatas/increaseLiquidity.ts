import type { Hex } from 'viem'
import { ACTIONS } from '../../../constants'
import type { CLPositionConfig } from '../../../types'
import { ActionsPlanner } from '../../../utils'
import { encodeCLPositionModifyLiquidities } from './modifyLiquidities'

export const encodeCLPositionManagerIncreaseLiquidityCalldata = (
  tokenId: bigint,
  positionConfig: CLPositionConfig,
  liquidity: bigint,
  amount0Max: bigint,
  amount1Max: bigint,
  // biome-ignore lint/style/useDefaultParameterLast: <explanation>
  hookData: Hex = '0x',
  deadline: bigint,
) => {
  const planner = new ActionsPlanner()
  planner.add(ACTIONS.CL_INCREASE_LIQUIDITY, [
    tokenId,
    liquidity,
    amount0Max,
    amount1Max,
    hookData,
  ])
  const calls = planner.finalizeModifyLiquidityWithClose(positionConfig.poolKey)
  return encodeCLPositionModifyLiquidities(calls, deadline)
}
