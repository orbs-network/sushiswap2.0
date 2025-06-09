import { EvmChainId } from 'sushi/chain'

export const SUSHISWAP_V4_SUPPORTED_CHAIN_IDS = [EvmChainId.POLYGON] as const

export const SushiSwapV4ChainIds = SUSHISWAP_V4_SUPPORTED_CHAIN_IDS

export type SushiSwapV4ChainId =
  (typeof SUSHISWAP_V4_SUPPORTED_CHAIN_IDS)[number]

export const isSushiSwapV4ChainId = (
  chainId: EvmChainId,
): chainId is SushiSwapV4ChainId =>
  SUSHISWAP_V4_SUPPORTED_CHAIN_IDS.includes(chainId as SushiSwapV4ChainId)
