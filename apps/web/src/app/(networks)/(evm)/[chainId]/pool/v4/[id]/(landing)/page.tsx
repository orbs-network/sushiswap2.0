import { getV4Pool } from '@sushiswap/graph-client/v4'
import { unstable_cache } from 'next/cache'
import { notFound } from 'next/navigation'
import { isSushiSwapV4ChainId } from 'src/lib/pool/v4'
import { PoolPageV4 } from 'src/ui/pool/PoolPageV4'
import type { EvmChainId } from 'sushi'
import { isHex } from 'viem'

export default async function PoolPage(props: {
  params: Promise<{ chainId: string; id: string }>
}) {
  const params = await props.params
  const { chainId: _chainId, id } = params
  const chainId = +_chainId as EvmChainId

  if (!isSushiSwapV4ChainId(chainId) || !isHex(id, { strict: false })) {
    return {}
  }

  const pool = await unstable_cache(
    async () => getV4Pool({ id }),
    ['v4', 'pool', `${chainId}:${id}`],
    {
      revalidate: 60 * 15,
    },
  )()

  if (!pool) {
    return notFound()
  }

  return <PoolPageV4 pool={pool} />
}
