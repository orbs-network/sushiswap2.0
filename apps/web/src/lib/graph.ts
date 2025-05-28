import { getV3BasePoolsByToken } from '@sushiswap/graph-client/data-api'
import { getV4BasePoolsByToken } from '@sushiswap/graph-client/v4'
import { isSushiSwapV3ChainId } from 'sushi/config'
import { Native } from 'sushi/currency'
import { getChainIdAddressFromId } from 'sushi/format'
import { zeroAddress } from 'viem'
import { type SushiSwapV4ChainId, isSushiSwapV4ChainId } from './pool/v4'

export const getV3PoolsByTokenPair = async (
  tokenId0: string,
  tokenId1: string,
) => {
  const { chainId: chainId0, address: address0 } =
    getChainIdAddressFromId(tokenId0)
  const { chainId: chainId1, address: address1 } =
    getChainIdAddressFromId(tokenId1)

  if (chainId0 !== chainId1) throw Error('Tokens must be on the same chain')

  if (!isSushiSwapV3ChainId(chainId0)) {
    throw Error('Invalid chain id')
  }

  const pools = await getV3BasePoolsByToken({
    chainId: chainId0,
    token0: address0,
    token1: address1,
  })

  return pools
}

export const getV4PoolsByTokenPair = async (
  chainId: SushiSwapV4ChainId,
  tokenId0: string,
  tokenId1: string,
) => {
  if (!isSushiSwapV4ChainId(chainId)) {
    throw Error('Invalid chain id')
  }

  const nativeId = Native.onChain(chainId).id

  const { chainId: chainId0, address: address0 } =
    tokenId0 === nativeId
      ? { chainId, address: zeroAddress }
      : getChainIdAddressFromId(tokenId0)
  const { chainId: chainId1, address: address1 } =
    tokenId1 === nativeId
      ? { chainId, address: zeroAddress }
      : getChainIdAddressFromId(tokenId1)

  if (chainId !== chainId0 || chainId !== chainId1)
    throw Error('Tokens must be on the same chain')

  const pools = await getV4BasePoolsByToken({
    token0: address0,
    token1: address1,
  })

  return pools
}
