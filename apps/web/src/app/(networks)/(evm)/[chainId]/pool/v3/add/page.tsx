'use client'

import { useRouter } from 'next/navigation'
import { type FC, use, useMemo, useState } from 'react'
import { useConcentratedPositionInfoV3 } from 'src/lib/wagmi/hooks/positions/hooks/useConcentratedPositionInfoV3'
import { ConcentratedLiquidityProvider } from 'src/ui/pool/ConcentratedLiquidityProvider'
import {
  ConcentratedLiquidityURLStateProvider,
  useConcentratedLiquidityURLState,
} from 'src/ui/pool/ConcentratedLiquidityURLStateProviderV3'
import { ConcentratedLiquidityWidgetV3 } from 'src/ui/pool/ConcentratedLiquidityWidgetV3'
import { SelectFeeConcentratedWidgetV3 } from 'src/ui/pool/SelectFeeConcentratedWidgetV3'
import { SelectNetworkWidget } from 'src/ui/pool/SelectNetworkWidget'
import { SelectPricesWidgetV3 } from 'src/ui/pool/SelectPricesWidgetV3'
import { SelectTokensWidget } from 'src/ui/pool/SelectTokensWidget'
import { ChainKey, computeSushiSwapV3PoolAddress } from 'sushi'
import {
  SUSHISWAP_V3_FACTORY_ADDRESS,
  SUSHISWAP_V3_SUPPORTED_CHAIN_IDS,
  type SushiSwapV3ChainId,
  isWNativeSupported,
} from 'sushi/config'
import { useAccount } from 'wagmi'

export default function Page(props: { params: Promise<{ chainId: string }> }) {
  const params = use(props.params)
  return (
    <ConcentratedLiquidityURLStateProvider
      chainId={+params.chainId as SushiSwapV3ChainId}
    >
      <ConcentratedLiquidityProvider>
        <_Add />
      </ConcentratedLiquidityProvider>
    </ConcentratedLiquidityURLStateProvider>
  )
}

const _Add: FC = () => {
  const { address } = useAccount()
  const {
    chainId,
    token0,
    token1,
    setToken1,
    setToken0,
    feeAmount,
    setFeeAmount,
    tokensLoading,
    tokenId,
    switchTokens,
  } = useConcentratedLiquidityURLState()

  const router = useRouter()

  const [_invert, _setInvert] = useState(false)
  const { data: position } = useConcentratedPositionInfoV3({
    chainId,
    token0,
    tokenId,
    token1,
  })

  const poolAddress = useMemo(
    () =>
      token0 && token1 && feeAmount && chainId
        ? computeSushiSwapV3PoolAddress({
            factoryAddress: SUSHISWAP_V3_FACTORY_ADDRESS[chainId],
            tokenA: token0.wrapped,
            tokenB: token1.wrapped,
            fee: feeAmount,
          })
        : undefined,
    [chainId, feeAmount, token0, token1],
  )

  return (
    <>
      <SelectNetworkWidget
        selectedNetwork={chainId}
        onSelect={(chainId) => router.push(`/${ChainKey[chainId]}/pool/v3/add`)}
        networks={SUSHISWAP_V3_SUPPORTED_CHAIN_IDS}
      />
      <SelectTokensWidget
        chainId={chainId}
        token0={token0}
        token1={token1}
        setToken0={setToken0}
        setToken1={setToken1}
        includeNative={isWNativeSupported(chainId)}
      />
      <SelectFeeConcentratedWidgetV3
        feeAmount={feeAmount}
        setFeeAmount={setFeeAmount}
        token1={token1}
        token0={token0}
      />
      <SelectPricesWidgetV3
        chainId={chainId}
        token0={token0}
        token1={token1}
        poolAddress={poolAddress}
        tokenId={tokenId}
        feeAmount={feeAmount}
        switchTokens={switchTokens}
      />
      <ConcentratedLiquidityWidgetV3
        chainId={chainId}
        account={address}
        token0={token0}
        token1={token1}
        setToken0={setToken0}
        setToken1={setToken1}
        feeAmount={feeAmount}
        tokensLoading={tokensLoading}
        existingPosition={position ?? undefined}
        tokenId={tokenId}
        successLink={`/${ChainKey[chainId]}/pool/v3/${poolAddress}/${tokenId}`}
      />
    </>
  )
}
