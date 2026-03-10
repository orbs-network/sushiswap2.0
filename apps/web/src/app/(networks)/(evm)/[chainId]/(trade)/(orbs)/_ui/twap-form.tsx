'use client'

// ============ Imports ============
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  Currency,
  TooltipProvider,
} from '@sushiswap/ui'
import { Loader } from '@sushiswap/ui'
import { useCallback, useMemo, type FC, type ReactNode } from 'react'
import { useParams } from 'next/navigation'
import { SpotProvider, Module, Partners } from '@orbs-network/spot-react'
import type {
  ButtonProps,
  TooltipProps,
  TokenLogoProps,
  Token,
  Translations,
} from '@orbs-network/spot-react'
import { useTokenWithCache } from 'src/lib/wagmi/hooks/tokens/useTokenWithCache'
import { useRefetchBalances } from '~evm/_common/ui/balance-provider/use-refetch-balances'
import { useAmountBalance } from '~evm/_common/ui/balance-provider/use-balance'
import { useConnection, useWalletClient } from 'wagmi'
import { type CurrencyMetadata } from 'sushi'
import { createErrorToast } from '@sushiswap/notifications'
import {
  useDerivedStateSimpleSwap,
  useSimpleSwapTradeQuote,
} from '../../swap/_ui/derivedstate-simple-swap-provider'
import type { EvmCurrency } from 'sushi/evm'
import { SvmCurrency } from 'sushi/svm'
import { usePriceProtection } from '@sushiswap/hooks'
import { zeroAddress } from 'viem'
import { usePrice } from '~evm/_common/ui/price-provider/price-provider/use-price'
import { InformationCircleIcon } from '@heroicons/react-v1/solid'
import { MIN_TRADE_SIZE_USD } from 'src/lib/swap/twap'
import { SwapModeButtons } from '../../_ui/swap-mode-buttons'
import { SpotSettingsOverlay } from './spot-settings-overlay'
import { TwapMaintenanceMessage } from './twap-maintenance-message'
import { TwapOrdersDialogTriggerButton } from './twap-orders-dialog'
import { OrbsBanner } from './orbs-banner'
import { SimpleSwapTokenNotFoundDialog } from '../../swap/_ui/simple-swap-token-not-found-dialog'
import { TwapToken0Input } from './twap-token0-input'
import { TwapSwitchTokensButton } from './twap-switch-tokens-button'
import { TwapToken1Input } from './twap-token1-input'
import { TwapTradeButton } from './twap-trade-button'

const CUSTOM_TRANSLATIONS: Partial<Translations> = {
  maxChunksError: 'Inadequate Trade Size, {maxChunks} is max',
  minChunksError: 'Place order',
  minFillDelayError: 'Trade Interval Below Limit',
  triggerLimitPriceError: 'Limit price must be lower than the trigger price',
  StopLossTriggerPriceError: 'Trigger price must be lower than market price',
}

// ============ SpotProvider component wrappers (DEX styles) ============
const SpotButton: FC<ButtonProps> = ({
  children,
  onClick,
  disabled,
  loading,
}) => (
  <Button
    onClick={onClick}
    disabled={disabled}
    loading={loading}
    size="xl"
    fullWidth
  >
    {children}
  </Button>
)

const SpotTooltip: FC<TooltipProps> = ({ children, tooltipText }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        {children ?? <InformationCircleIcon width={16} height={16} />}
      </TooltipTrigger>
      <TooltipContent>{tooltipText ?? ''}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
)

const SpotTokenLogo: FC<TokenLogoProps> = ({ token }) => {
  const { chainId } = useParams()
  const address = token?.address

  const { data: currency } = useTokenWithCache({
    chainId: chainId as any,
    address: address as any,
    enabled: Boolean(chainId && address),
  })

  if (!currency) return null

  return (
    <Currency.Icon disableLink currency={currency} width={28} height={28} />
  )
}

// ============ useToken by address (for SpotProvider) ============
function useSpotToken(address: string | undefined) {
  const params = useParams()
  const chainId = params?.chainId ? +(params.chainId as string) : undefined
  const { data } = useTokenWithCache({
    chainId: chainId as any,
    address: address as any,
    enabled: Boolean(chainId && address),
  })
  return useMemo((): Token | undefined => {
    if (!address || !data) return undefined
    const c = data as {
      address: string
      symbol: string
      decimals: number
      logoURI?: string
    }
    return {
      address: c.address,
      symbol: c.symbol,
      decimals: c.decimals,
      logoUrl: '',
    }
  }, [address, data])
}

// ============ Main export ============

const toSpotToken = (
  token:
    | EvmCurrency<CurrencyMetadata>
    | SvmCurrency<CurrencyMetadata>
    | undefined,
): Token | undefined => {
  if (!token) return undefined
  return {
    address: token.isNative ? zeroAddress : token.wrap().address,
    symbol: token.symbol,
    decimals: token.decimals,
    logoUrl: '',
  }
}

export function TwapForm({
  module,
  children,
}: {
  module: Module
  children: ReactNode
}) {
  const { chainId: _chainId } = useParams()
  const chainId = _chainId ? +_chainId : undefined
  const { address } = useConnection() as { address?: string }
  const { data: walletClient } = useWalletClient({ chainId })
  const { refetchChain } = useRefetchBalances()
  const [priceProtection] = usePriceProtection()

  const {
    state: { token0, token1, swapAmountString, chainId: stateChainId },
    mutate: { setSwapAmount },
  } = useDerivedStateSimpleSwap()

  const { data: quote, isInitialLoading: quoteLoading } =
    useSimpleSwapTradeQuote()

  const typedInputAmount = swapAmountString
  const resetTypedInputAmount = useCallback(
    () => setSwapAmount(''),
    [setSwapAmount],
  )

  const marketReferencePrice = useMemo(
    () => ({
      value: quote?.amountOut?.amount.toString(),
      isLoading: quoteLoading,
      noLiquidity:
        Boolean(swapAmountString) && !quoteLoading && !quote?.amountOut,
    }),
    [quote?.amountOut, quote, quoteLoading, swapAmountString],
  )

  const inputBalance = useAmountBalance(token0)
  const outputBalance = useAmountBalance(token1)
  const srcBalance = inputBalance?.data?.amount?.toString() ?? '0'
  const dstBalance = outputBalance?.data?.amount?.toString() ?? '0'

  const refetchBalances = useCallback(() => {
    if (stateChainId) refetchChain(stateChainId)
  }, [refetchChain, stateChainId])

  const callbacks = useMemo(
    () => ({
      onOrderCreated: () => {},
      onSubmitOrderFailed: ({ message }: { message: string }) => {
        createErrorToast(message, false)
      },
    }),
    [],
  )

  const components = useMemo(
    () => ({
      Button: SpotButton,
      Tooltip: SpotTooltip,
      TokenLogo: SpotTokenLogo,
      Spinner: <Loader className="h-5 w-5 animate-spin" />,
    }),
    [],
  )

  const { data: srcUsd1Token } = usePrice({
    chainId: token0?.chainId,
    address: token0?.wrap().address,
  })

  const { data: dstUsd1Token } = usePrice({
    chainId: token1?.chainId,
    address: token1?.wrap().address,
  })

  const overrides = useMemo(
    () => ({
      state: {
        isMarketOrder: module === Module.TWAP,
      },
    }),
    [module],
  )

  return (
    <SpotProvider
      partner={Partners.Sushiswap}
      module={module}
      priceProtection={Number(priceProtection) || 3}
      minChunkSizeUsd={MIN_TRADE_SIZE_USD}
      typedInputAmount={typedInputAmount}
      resetTypedInputAmount={resetTypedInputAmount}
      marketReferencePrice={marketReferencePrice}
      components={components}
      srcToken={useMemo(() => toSpotToken(token0), [token0])}
      dstToken={useMemo(() => toSpotToken(token1), [token1])}
      srcBalance={srcBalance}
      dstBalance={dstBalance}
      srcUsd1Token={srcUsd1Token?.toString()}
      dstUsd1Token={dstUsd1Token?.toString()}
      chainId={stateChainId}
      account={address ?? undefined}
      provider={walletClient?.transport}
      useToken={useSpotToken}
      refetchBalances={refetchBalances}
      translations={CUSTOM_TRANSLATIONS}
      callbacks={callbacks}
      overrides={overrides}
    >
      <div className="flex flex-col gap-4 p-4 md:p-6 bg-[rgba(255,255,255,0.8)] dark:bg-[rgba(25,32,49,0.8)] rounded-3xl backdrop-blur-2xl">
        <TwapMaintenanceMessage module={module} />

        <div className="flex items-center justify-between">
          <SwapModeButtons />
          <SpotSettingsOverlay />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-4">
            <TwapToken0Input />
            <TwapSwitchTokensButton />
            <TwapToken1Input />
          </div>
          {children}
          <TwapTradeButton module={module} />
        </div>
        <TwapOrdersDialogTriggerButton />
        <OrbsBanner />
        <SimpleSwapTokenNotFoundDialog />
      </div>
    </SpotProvider>
  )
}
