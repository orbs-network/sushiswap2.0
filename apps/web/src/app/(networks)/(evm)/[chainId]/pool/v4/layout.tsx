import { notFound } from 'next/navigation'
import { isSushiSwapV4ChainId } from 'src/lib/pool/v4'
import type { EvmChainId } from 'sushi/chain'

export default async function Layout(props: {
  children: React.ReactNode
  params: Promise<{ chainId: string }>
}) {
  const params = await props.params

  const { children } = props

  const chainId = +params.chainId as EvmChainId
  if (!isSushiSwapV4ChainId(chainId)) {
    return notFound()
  }

  return <>{children}</>
}
