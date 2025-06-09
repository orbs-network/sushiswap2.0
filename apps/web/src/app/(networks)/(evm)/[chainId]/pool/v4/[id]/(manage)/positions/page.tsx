import { getV4Pool } from '@sushiswap/graph-client/data-api'
import { unstable_cache } from 'next/cache'
import { notFound } from 'next/navigation'
import { isSushiSwapV4ChainId } from 'src/lib/pool/v4'
import { PoolsFiltersProvider } from 'src/ui/pool'
import type { EvmChainId } from 'sushi/chain'
import { isHex } from 'viem'
import { ManageV4PoolPositionsTable } from './table'

export default async function ManageV4PoolPage(props: {
  params: Promise<{ chainId: string; id: string }>
}) {
  const params = await props.params
  const { chainId: _chainId, id } = params
  const chainId = +_chainId as EvmChainId

  if (!isSushiSwapV4ChainId(chainId) || !isHex(id, { strict: false })) {
    return {}
  }

  const pool = await unstable_cache(
    async () => getV4Pool({ id, chainId }),
    ['v4', 'pool', `${chainId}:${id}`],
    {
      revalidate: 60 * 15,
    },
  )()

  if (!pool) {
    return notFound()
  }

  return (
    <PoolsFiltersProvider>
      <ManageV4PoolPositionsTable pool={pool} />
    </PoolsFiltersProvider>
  )
}
