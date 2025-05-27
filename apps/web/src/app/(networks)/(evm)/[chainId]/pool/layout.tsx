import { isPoolChainId } from '@sushiswap/graph-client/data-api'
import { notFound } from 'next/navigation'
import { POOL_SUPPORTED_NETWORKS } from 'src/config'
import { isSushiSwapV4ChainId } from 'src/lib/pool/v4'
import type { EvmChainId } from 'sushi/chain'
import { Header } from '../header'

export default async function PoolLayout(props: {
  children: React.ReactNode
  params: Promise<{ chainId: string }>
}) {
  const params = await props.params

  const { children } = props

  const chainId = +params.chainId as EvmChainId
  if (!isPoolChainId(chainId) && !isSushiSwapV4ChainId(chainId)) {
    return notFound()
  }

  return (
    <>
      <Header chainId={chainId} supportedNetworks={POOL_SUPPORTED_NETWORKS} />
      <main className="flex flex-col h-full flex-1 animate-slide">
        {children}
      </main>
    </>
  )
}
