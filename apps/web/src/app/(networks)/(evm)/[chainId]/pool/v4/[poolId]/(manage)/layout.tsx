import { getV4Pool } from '@sushiswap/graph-client/v4'
import { Container } from '@sushiswap/ui'
import { unstable_cache } from 'next/cache'
import { notFound } from 'next/navigation'
import { isSushiSwapV4ChainId } from 'src/lib/pool/v4'
import type { EvmChainId } from 'sushi/chain'
import { isHex } from 'viem'

export default async function Layout(props: {
  children: React.ReactNode
  params: Promise<{ chainId: string; poolId: string }>
}) {
  const params = await props.params

  const { children } = props
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
    return notFound()
  }

  //   const headersList = await headers()
  //   const referer = headersList.get('referer')
  return (
    <>
      {/* <Container maxWidth="5xl" className="pt-10 px-4">
        <PoolHeader
          backUrl={
            referer?.includes('/pool')
              ? referer?.toString()
              : `/${ChainKey[chainId]}/explore/pools`
          }
          address={address}
          pool={pool}
          apy={{ rewards: pool.incentiveApr, fees: pool.feeApr1d }}
          showAddLiquidityButton
        />
      </Container> */}
      <section className="flex flex-col flex-1 mt-4">
        <div className="bg-gray-50 dark:bg-white/[0.02] border-t border-accent py-10 h-full">
          <Container maxWidth="5xl" className="px-4">
            {children}
          </Container>
        </div>
      </section>
    </>
  )
}
