import { getV4Pool } from '@sushiswap/graph-client/v4'
import { unstable_cache } from 'next/cache'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next/types'
import { isSushiSwapV4ChainId } from 'src/lib/pool/v4'
import type { EvmChainId } from 'sushi/chain'
import { isHex } from 'viem'

export async function generateMetadata(props: {
  params: Promise<{ chainId: string; poolId: string }>
}): Promise<Metadata> {
  const params = await props.params
  const { chainId: _chainId, poolId } = params
  const chainId = +_chainId as EvmChainId

  if (!isSushiSwapV4ChainId(chainId) || !isHex(poolId, { strict: false })) {
    return {}
  }

  const pool = await unstable_cache(
    async () => getV4Pool({ id: poolId }),
    ['v4', 'pool', `${chainId}:${poolId}`],
    {
      revalidate: 60 * 15,
    },
  )()

  if (!pool) {
    return {}
  }

  return {
    title: `BUY & SELL ${pool.token0.symbol}/${pool.token1.symbol}`,
  }
}

export default async function Layout(props: {
  children: React.ReactNode
  params: Promise<{ chainId: string; poolId: string }>
}) {
  const params = await props.params

  const { children } = props

  const { chainId: _chainId, poolId } = params
  const chainId = +_chainId as EvmChainId

  if (!isSushiSwapV4ChainId(chainId) || !isHex(poolId, { strict: false })) {
    return notFound()
  }

  const pool = await unstable_cache(
    async () => getV4Pool({ id: poolId }),
    ['v4', 'pool', `${chainId}:${poolId}`],
    {
      revalidate: 60 * 15,
    },
  )()

  if (!pool) {
    return notFound()
  }

  return <>{children}</>
}
