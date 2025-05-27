import type { Permit2Signature } from 'src/lib/permit2/types'
import type { Address, Hex } from 'viem'
import type { CLPositionConfig } from '../../types'
import { encodeMulticall, encodePermit2 } from '../../utils'
import {
  encodeCLPositionManagerIncreaseLiquidityCalldata,
  encodeCLPositionManagerInitializePoolCalldata,
  encodeCLPositionManagerMintCalldata,
} from './calldatas'

export const addCLLiquidityMulticall = ({
  isInitialized,
  sqrtPriceX96,
  tokenId,
  positionConfig,
  liquidity,
  owner,
  recipient,
  amount0Max,
  amount1Max,
  deadline,
  modifyPositionHookData,
  token0Permit2Signature,
  token1Permit2Signature,
}: {
  isInitialized: boolean
  sqrtPriceX96: bigint
  tokenId?: bigint
  positionConfig: CLPositionConfig
  liquidity: bigint
  owner: Address
  recipient: Address
  amount0Max: bigint
  amount1Max: bigint
  deadline: bigint
  modifyPositionHookData: Hex
  token0Permit2Signature?: Permit2Signature
  token1Permit2Signature?: Permit2Signature
}) => {
  const calls: Hex[] = []

  if (!isInitialized) {
    calls.push(
      encodeCLPositionManagerInitializePoolCalldata(
        positionConfig.poolKey,
        sqrtPriceX96,
      ),
    )
  }
  if (token0Permit2Signature) {
    calls.push(encodePermit2(owner, token0Permit2Signature))
  }

  if (token1Permit2Signature) {
    calls.push(encodePermit2(owner, token1Permit2Signature))
  }

  // mint
  if (typeof tokenId === 'undefined') {
    calls.push(
      encodeCLPositionManagerMintCalldata(
        positionConfig,
        liquidity,
        recipient,
        amount0Max,
        amount1Max,
        deadline,
        modifyPositionHookData,
      ),
    )
  } else {
    // increase liquidity
    calls.push(
      encodeCLPositionManagerIncreaseLiquidityCalldata(
        tokenId,
        positionConfig,
        liquidity,
        amount0Max,
        amount1Max,
        modifyPositionHookData,
        deadline,
      ),
    )
  }

  return encodeMulticall(calls)
}
