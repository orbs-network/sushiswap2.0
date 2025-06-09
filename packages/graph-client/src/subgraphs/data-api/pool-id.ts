// TODO: use sushi pkg

import type { EvmChainId } from 'sushi/chain'
import type { Address, ID, SushiSwapProtocol } from 'sushi/types'

export type PoolId = {
  id: ID
  address: Address
  chainId: EvmChainId

  protocol: SushiSwapProtocol | 'SUSHISWAP_V4'
}
