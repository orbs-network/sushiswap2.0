'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import React, {
  type FC,
  type ReactNode,
  createContext,
  useContext,
  useMemo,
} from 'react'
import {
  SUSHISWAP_V4_SUPPORTED_CHAIN_IDS,
  type SushiSwapV4ChainId,
} from 'src/lib/pool/v4'
import { getPoolKey } from 'src/lib/pool/v4/sdk/utils/getPoolKey'
import type { EvmChainId } from 'sushi/chain'
import {
  ConcentratedLiquidityURLStateProvider,
  useConcentratedLiquidityURLState,
} from './ConcentratedLiquidityURLStateProviderV3'

type State = Omit<
  ReturnType<typeof useConcentratedLiquidityURLState>,
  'chainId' | 'feeAmount' | 'setFeeAmount'
> & {
  chainId: SushiSwapV4ChainId
  feeAmount: number
  setFeeAmount: (value: number) => void
  tickSpacing: number
  setTickSpacing: (value: number) => void
}

export const ConcentratedLiquidityUrlStateContextV4 = createContext<State>(
  {} as State,
)

interface ConcentratedLiquidityURLStateProviderV4 {
  children: ReactNode | ((state: State) => ReactNode)
  chainId: SushiSwapV4ChainId
  supportedNetworks?: EvmChainId[]
}

export const ConcentratedLiquidityURLStateProviderV4: FC<
  ConcentratedLiquidityURLStateProviderV4
> = ({
  children,
  chainId,
  supportedNetworks = SUSHISWAP_V4_SUPPORTED_CHAIN_IDS,
}) => {
  return (
    <ConcentratedLiquidityURLStateProvider
      chainId={chainId}
      supportedNetworks={supportedNetworks as EvmChainId[]}
    >
      <_ConcentratedLiquidityURLStateProviderV4
        chainId={chainId}
        supportedNetworks={supportedNetworks as EvmChainId[]}
      >
        {children}
      </_ConcentratedLiquidityURLStateProviderV4>
    </ConcentratedLiquidityURLStateProvider>
  )
}

const _ConcentratedLiquidityURLStateProviderV4: FC<
  ConcentratedLiquidityURLStateProviderV4
> = ({ children }) => {
  const baseState = useConcentratedLiquidityURLState()
  const { push } = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const state = useMemo(() => {
    // todo: validate
    const tickSpacing = Number(searchParams.get('tickSpacing') ?? '0')

    const setTickSpacing = (tickSpacing: number) => {
      const _searchParams = new URLSearchParams(
        Array.from(searchParams.entries()),
      )
      console.log('_searchParams', _searchParams.toString())
      _searchParams.set('tickSpacing', tickSpacing.toString())
      void push(`${pathname}?${_searchParams.toString()}`, { scroll: false })
    }

    return {
      ...baseState,
      chainId: baseState.chainId as SushiSwapV4ChainId,
      feeAmount: baseState.feeAmount as number,
      setFeeAmount: baseState.setFeeAmount as (feeAmount: number) => void,
      tickSpacing,
      setTickSpacing,
    }
  }, [baseState, searchParams, push, pathname])

  return (
    <ConcentratedLiquidityUrlStateContextV4.Provider value={state}>
      {typeof children === 'function' ? children(state) : children}
    </ConcentratedLiquidityUrlStateContextV4.Provider>
  )
}

export const useConcentratedLiquidityURLStateV4 = () => {
  const context = useContext(ConcentratedLiquidityUrlStateContextV4)
  if (!context) {
    throw new Error(
      'Hook can only be used inside ConcentratedLiquidityUrlStateContextV4',
    )
  }

  return context
}

export const useDerivedPoolKey = () => {
  const { chainId, token0, token1, feeAmount, tickSpacing } =
    useConcentratedLiquidityURLStateV4()

  return useMemo(() => {
    if (!token0 || !token1) return undefined
    return getPoolKey({
      chainId,
      currency0: token0,
      currency1: token1,
      feeAmount,
      tickSpacing,
    })
  }, [chainId, token0, token1, feeAmount, tickSpacing])
}
