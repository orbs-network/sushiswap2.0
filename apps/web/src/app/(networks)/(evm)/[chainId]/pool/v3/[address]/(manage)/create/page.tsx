import { notFound } from 'next/navigation'
import React from 'react'
import { ConcentratedLiquidityProvider } from 'src/ui/pool/ConcentratedLiquidityProvider'
import { NewPositionV3 } from 'src/ui/pool/NewPositionV3'
import type { EvmChainId } from 'sushi'
import { isSushiSwapV3ChainId } from 'sushi/config'
import { isAddress } from 'viem'

export default async function PositionsCreatePage(props: {
  params: Promise<{ address: string; chainId: string }>
}) {
  const params = await props.params
  const { chainId: _chainId, address } = params
  const chainId = +_chainId as EvmChainId

  if (
    !isSushiSwapV3ChainId(chainId) ||
    !isAddress(address, { strict: false })
  ) {
    return notFound()
  }

  return (
    <ConcentratedLiquidityProvider>
      <NewPositionV3 address={address} chainId={chainId} />
    </ConcentratedLiquidityProvider>
  )
}
