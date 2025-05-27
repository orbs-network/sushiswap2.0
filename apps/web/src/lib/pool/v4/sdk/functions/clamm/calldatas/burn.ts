import { type Hex, encodeFunctionData } from 'viem'
import { ACTIONS } from '../../../constants'
import type { CLPositionConfig, EncodedCLPositionConfig } from '../../../types'
import { ActionsPlanner, encodePoolParameters } from '../../../utils'
import { sushiswapV4CLPositionManagerAbi_modifyLiquidities } from './modifyLiquidities'

export const encodeCLPositionManagerBurnCalldata = (
  tokenId: bigint,
  positionConfig: CLPositionConfig,
  amount0Min: bigint,
  amount1Min: bigint,
  // biome-ignore lint/style/useDefaultParameterLast: <explanation>
  hookData: Hex = '0x',
  deadline: bigint,
) => {
  const planner = new ActionsPlanner()
  const encodedPositionConfig: EncodedCLPositionConfig = {
    poolKey: {
      ...positionConfig.poolKey,
      parameters: encodePoolParameters(positionConfig.poolKey.parameters),
    },
    tickLower: positionConfig.tickLower,
    tickUpper: positionConfig.tickUpper,
  }

  planner.add(ACTIONS.CL_BURN_POSITION, [
    tokenId,
    encodedPositionConfig,
    amount0Min,
    amount1Min,
    hookData,
  ])
  const calls = planner.finalizeModifyLiquidityWithClose(positionConfig.poolKey)

  return encodeFunctionData({
    abi: sushiswapV4CLPositionManagerAbi_modifyLiquidities,
    functionName: 'modifyLiquidities',
    args: [calls, deadline],
  })
}
