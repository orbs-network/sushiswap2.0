'use client'

import { RadioGroup } from '@headlessui/react'
import {
  MinusIcon,
  PlusIcon,
  SwitchHorizontalIcon,
} from '@heroicons/react-v1/solid'
import { LockClosedIcon, LockOpenIcon } from '@heroicons/react/24/solid'
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid'
import { useIsMounted } from '@sushiswap/hooks'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Explainer,
  FormSection,
  Label,
  Message,
  TextField,
  TextFieldDescription,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  classNames,
} from '@sushiswap/ui'
import { SkeletonText } from '@sushiswap/ui'
import { Toggle } from '@sushiswap/ui'
import React, {
  type FC,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { Bound, Field } from 'src/lib/constants'
import { useTokenAmountDollarValues } from 'src/lib/hooks'
import { useConcentratedLiquidityPoolStats } from 'src/lib/hooks/react-query'
import {
  type PoolKey,
  type SushiSwapV4ChainId,
  isCurrencySorted,
  tickToPrice,
} from 'src/lib/pool/v4'
import { useConcentratedLiquidityPositionsFromTokenIdV4 } from 'src/lib/wagmi/hooks/positions/hooks/useConcentratedPositionsFromTokenIdV4'
import { type Type, tryParseAmount } from 'sushi/currency'
import { formatPercent } from 'sushi/format'
import { Fraction } from 'sushi/math'
import { getCapitalEfficiency, getTokenRatio } from 'sushi/pool/sushiswap-v3'
import { useAccount } from 'wagmi'
import {
  useConcentratedDerivedMintInfoV4,
  useConcentratedMintActionHandlers,
  useConcentratedMintState,
  useRangeHopCallbacks,
} from './ConcentratedLiquidityProviderV4'
import {
  LiquidityChartRangeInputV3,
  LiquidityChartRangeInputV4,
} from './LiquidityChartRangeInput'

enum PriceRange {
  FULL_RANGE = 0,
  BPS_20000 = 1,
  BPS_12000 = 2,
  BPS_10100 = 3,
  LEFT_SIDE = 4,
  RIGHT_SIDE = 5,
}

enum YieldRatePeriod {
  ANNUALLY = 0,
  MONTHLY = 1,
  DAILY = 2,
}

const YIELD_RATE_OPTIONS = [
  {
    value: YieldRatePeriod.ANNUALLY,
    label: 'Annually',
  },
  {
    value: YieldRatePeriod.MONTHLY,
    label: 'Monthly',
  },
  {
    value: YieldRatePeriod.DAILY,
    label: 'Daily',
  },
]

interface SelectPricesWidgetV4 {
  chainId: SushiSwapV4ChainId
  token0: Type | undefined
  token1: Type | undefined
  poolKey: PoolKey | undefined
  switchTokens?(): void
  tokenId: string | undefined
  children?: ReactNode
  showStartPrice?: boolean
}

export const SelectPricesWidgetV4: FC<SelectPricesWidgetV4> = ({
  chainId,
  token0: currency0,
  token1: currency1,
  poolKey,
  switchTokens,
  tokenId,
  children,
  showStartPrice = true,
}) => {
  const isMounted = useIsMounted()
  const { address } = useAccount()
  const [invert, setInvert] = useState(false)
  const [yieldRate, setYieldRate] = useState<YieldRatePeriod>(
    YieldRatePeriod.ANNUALLY,
  )
  const [priceRange, setPriceRangeSelector] = useState<PriceRange | undefined>(
    undefined,
  )
  const {
    price,
    invertPrice,
    pricesAtTicks,
    ticks,
    ticksAtLimit,
    pool,
    noLiquidity,
    isLoading,
    leftBoundInput,
    rightBoundInput,
    parsedAmounts,
    dependentField,
  } = useConcentratedDerivedMintInfoV4({
    chainId,
    account: address,
    currency0,
    currency1,
    baseCurrency: currency0,
    existingPosition: undefined,
    poolKey,
  })

  const {
    onLeftRangeInput,
    onRightRangeInput,
    onStartPriceInput,
    onFieldAInput,
    onFieldBInput,
    setWeightLockedCurrencyBase,
    setIndependentRangeField,
  } = useConcentratedMintActionHandlers()

  const {
    startPriceTypedValue,
    independentField,
    independentRangeField,
    typedValue,
    weightLockedCurrencyBase,
  } = useConcentratedMintState()

  const { data: existingPosition, isLoading: positionLoading } =
    useConcentratedLiquidityPositionsFromTokenIdV4({
      chainId,
      tokenId,
    })
  const hasExistingPosition = !!existingPosition && !positionLoading

  const { [Bound.LOWER]: tickLower, [Bound.UPPER]: tickUpper } = ticks
  const { [Bound.LOWER]: priceLower, [Bound.UPPER]: priceUpper } = pricesAtTicks

  const {
    getDecrementLower,
    getIncrementLower,
    getDecrementUpper,
    getIncrementUpper,
    getSetFullRange,
    resetMintState,
  } = useRangeHopCallbacks(
    currency0,
    currency1,
    poolKey?.parameters.tickSpacing,
    tickLower,
    tickUpper,
    pool,
  )

  const setPriceRange = useCallback(
    (multiplier: Fraction) => {
      if (!price) return
      const newPriceLower = price.asFraction
        .multiply(price.scalar)
        .divide(multiplier)
      const newPriceUpper = price.asFraction
        .multiply(price.scalar)
        .multiply(multiplier)
      setWeightLockedCurrencyBase(undefined)
      if (invertPrice) {
        onLeftRangeInput(newPriceUpper.invert().toFixed(6))
        onRightRangeInput(newPriceLower.invert().toFixed(6))
      } else {
        onLeftRangeInput(newPriceLower.toFixed(6))
        onRightRangeInput(newPriceUpper.toFixed(6))
      }
    },
    [
      onLeftRangeInput,
      onRightRangeInput,
      price,
      invertPrice,
      setWeightLockedCurrencyBase,
    ],
  )

  const setSingleSided = useCallback(
    (side: 'left' | 'right') => {
      if (!currency0 || !currency1 || !price || !poolKey || !pool) return

      getSetFullRange()

      const tickSpacing = poolKey.parameters.tickSpacing

      switch (side) {
        case 'left': {
          const current =
            Math.floor(pool.tickCurrent / tickSpacing) * tickSpacing

          const newRightPrice = tickToPrice(
            currency0,
            currency1,
            current + (invertPrice ? 1 : 0) * tickSpacing,
          )
          onRightRangeInput(newRightPrice.toFixed(18))
          break
        }
        case 'right': {
          const current =
            Math.ceil(pool.tickCurrent / tickSpacing) * tickSpacing

          const newLeftPrice = tickToPrice(
            currency0,
            currency1,
            current + (invertPrice ? -1 : 0) * tickSpacing,
          )
          onLeftRangeInput(newLeftPrice.toFixed(18))
          break
        }
      }
    },
    [
      currency0,
      currency1,
      price,
      poolKey,
      pool,
      getSetFullRange,
      invertPrice,
      onRightRangeInput,
      onLeftRangeInput,
    ],
  )

  const formattedAmounts: {
    [_formattedAmountsField in Field]: string
  } = useMemo(
    () => ({
      [Field.CURRENCY_A]:
        independentField === Field.CURRENCY_A
          ? typedValue
          : (parsedAmounts[dependentField]?.toSignificant(6) ?? ''),
      [Field.CURRENCY_B]:
        independentField === Field.CURRENCY_A
          ? (parsedAmounts[dependentField]?.toSignificant(6) ?? '')
          : typedValue,
    }),
    [typedValue, dependentField, independentField, parsedAmounts],
  )

  const handleSwitchTokens = useCallback(() => {
    switchTokens?.()

    if (!ticksAtLimit[Bound.LOWER] && !ticksAtLimit[Bound.UPPER]) {
      // switch price
      if (typeof weightLockedCurrencyBase === 'number')
        setWeightLockedCurrencyBase(1 - weightLockedCurrencyBase)
      setIndependentRangeField(
        independentRangeField === Bound.LOWER ? Bound.UPPER : Bound.LOWER,
      )
      onLeftRangeInput(
        (invertPrice ? priceLower : priceUpper?.invert())?.toSignificant(6) ??
          '',
      )
      onRightRangeInput(
        (invertPrice ? priceUpper : priceLower?.invert())?.toSignificant(6) ??
          '',
      )
      if (independentField === Field.CURRENCY_A) {
        onFieldBInput(formattedAmounts[Field.CURRENCY_A] ?? '', noLiquidity)
      } else {
        onFieldAInput(formattedAmounts[Field.CURRENCY_B] ?? '', noLiquidity)
      }
    }
  }, [
    switchTokens,
    ticksAtLimit,
    setWeightLockedCurrencyBase,
    setIndependentRangeField,
    onLeftRangeInput,
    onRightRangeInput,
    weightLockedCurrencyBase,
    invertPrice,
    priceUpper,
    priceLower,
    noLiquidity,
    independentField,
    onFieldAInput,
    onFieldBInput,
    formattedAmounts,
    independentRangeField,
  ])

  const PRICE_RANGE_OPTIONS = useMemo(
    () => [
      {
        label: 'Full Range',
        value: PriceRange.FULL_RANGE,
        onClick: () => {
          setWeightLockedCurrencyBase(undefined)
          getSetFullRange()
        },
      },
      {
        label: '×÷2',
        value: PriceRange.BPS_20000,
        onClick: () => setPriceRange(new Fraction(20000, 10000)),
      },
      {
        label: '×÷1.2',
        value: PriceRange.BPS_12000,
        onClick: () => setPriceRange(new Fraction(12000, 10000)),
      },
      {
        label: '×÷1.01',
        value: PriceRange.BPS_10100,
        onClick: () => setPriceRange(new Fraction(10100, 10000)),
      },
      {
        label: 'Single Sided (Left)',
        value: PriceRange.LEFT_SIDE,
        onClick: () => setSingleSided('left'),
      },
      {
        label: 'Single Sided (Right)',
        value: PriceRange.RIGHT_SIDE,
        onClick: () => setSingleSided('right'),
      },
    ],
    [
      getSetFullRange,
      setPriceRange,
      setWeightLockedCurrencyBase,
      setSingleSided,
    ],
  )

  const isSorted =
    currency0 && currency1 && isCurrencySorted(currency0, currency1)
  const leftPrice = useMemo(
    () => (isSorted ? priceLower : priceUpper?.invert()),
    [isSorted, priceLower, priceUpper],
  )
  const rightPrice = useMemo(
    () => (isSorted ? priceUpper : priceLower?.invert()),
    [isSorted, priceLower, priceUpper],
  )

  const fiatAmounts = useMemo(
    () => [tryParseAmount('1', currency0), tryParseAmount('1', currency1)],
    [currency0, currency1],
  )
  const fiatAmountsAsNumber = useTokenAmountDollarValues({
    chainId,
    amounts: fiatAmounts,
  })

  // TODO
  const { data: poolStats } = useConcentratedLiquidityPoolStats({
    chainId,
    address: undefined,
    // address: poolAddress,
    // enabled: Boolean(chainId && poolAddress),
    enabled: false,
  })

  const [valueRatio, capitalEfficiency, apr, sanitizedCE] = useMemo(() => {
    if (!price || !priceLower || !priceUpper) return [undefined, undefined]

    const capitalEfficiency = getCapitalEfficiency(
      price,
      priceLower,
      priceUpper,
    )
    const _ratio = getTokenRatio(price, priceLower, priceUpper)
    const ratio: [number, number] = invertPrice
      ? [_ratio[1], _ratio[0]]
      : _ratio

    const apr =
      (poolStats?.feeApr1d ?? 0) /
      (yieldRate === YieldRatePeriod.MONTHLY
        ? 12
        : yieldRate === YieldRatePeriod.DAILY
          ? 365
          : 1)

    // make sure capitial efficiency is valid
    const sanitizedCE =
      capitalEfficiency != null &&
      Number.isFinite(capitalEfficiency) &&
      capitalEfficiency > 0
        ? capitalEfficiency
        : undefined

    return [ratio, capitalEfficiency, apr, sanitizedCE]
  }, [price, priceLower, priceUpper, invertPrice, poolStats, yieldRate])

  const currentWeight0 = valueRatio?.[0]
  const handleToggleWeightLock = useCallback(() => {
    if (typeof weightLockedCurrencyBase !== 'number') {
      setWeightLockedCurrencyBase(currentWeight0)
    } else {
      if (typeof leftBoundInput === 'string') onLeftRangeInput(leftBoundInput)
      if (typeof rightBoundInput === 'string')
        onRightRangeInput(rightBoundInput)
      setWeightLockedCurrencyBase(undefined)
    }
  }, [
    leftBoundInput,
    rightBoundInput,
    onLeftRangeInput,
    onRightRangeInput,
    currentWeight0,
    weightLockedCurrencyBase,
    setWeightLockedCurrencyBase,
  ])

  const isTokenWeightUnmatched = useMemo(() => {
    if (
      typeof weightLockedCurrencyBase !== 'number' ||
      typeof currentWeight0 !== 'number'
    )
      return false
    const absDiff = Math.abs(currentWeight0 - weightLockedCurrencyBase)
    const pctDiff = Math.abs(currentWeight0 / weightLockedCurrencyBase - 1)
    return absDiff > 0.01 && pctDiff > 0.03 // threshold: 1% abs diff and 3% pct diff
  }, [weightLockedCurrencyBase, currentWeight0])

  const tokenToggle = useMemo(
    () =>
      switchTokens ? (
        <div className="flex gap-1">
          <Toggle
            variant="outline"
            onPressedChange={handleSwitchTokens}
            pressed={isSorted}
            size="sm"
          >
            {isSorted ? currency0?.symbol : currency1?.symbol}
          </Toggle>
          <Toggle
            variant="outline"
            onPressedChange={handleSwitchTokens}
            pressed={!isSorted}
            size="sm"
          >
            {isSorted ? currency1?.symbol : currency0?.symbol}
          </Toggle>
        </div>
      ) : undefined,
    [switchTokens, handleSwitchTokens, isSorted, currency0, currency1],
  )

  return (
    <FormSection
      title="Range"
      description={
        <>
          Select a price range to provide liquidity. You will not earn any fees
          when prices move outside of this range.{' '}
          <a
            target="_blank"
            className="text-blue"
            rel="noopener noreferrer"
            href="https://docs.uniswap.org/concepts/protocol/concentrated-liquidity"
          >
            Learn more.
          </a>
        </>
      }
    >
      <div
        className={classNames(
          'flex flex-col gap-6',
          !currency0 || !currency1 ? 'opacity-40' : '',
        )}
      >
        {noLiquidity ? (
          <div className="flex flex-col gap-2">
            {tokenToggle}
            <Message size="sm" variant="muted" className="text-center">
              This pool must be initialized before you can add liquidity.{' '}
              {showStartPrice
                ? 'To initialize, select a starting price for the pool. Then, enter your liquidity price range and deposit amount. '
                : ''}
              Gas fees will be higher than usual due to the initialization
              transaction.
            </Message>
          </div>
        ) : null}
        {children ? children : null}
        <div className="rounded-xl flex flex-col gap-8">
          {isMounted && showStartPrice && (
            <div className="flex flex-col gap-3">
              {noLiquidity && (
                <div className="flex flex-col gap-2">
                  <Label>Start price</Label>
                  <TextField
                    variant="outline"
                    value={startPriceTypedValue}
                    onValueChange={onStartPriceInput}
                    testdata-id="start-price-input"
                    type="number"
                    unit={`${currency1?.symbol} per ${currency0?.symbol}`}
                  />
                  <TextFieldDescription>
                    Your pool needs a starting price somewhere between the min.
                    and max. price
                  </TextFieldDescription>
                </div>
              )}
              {poolKey && !noLiquidity ? (
                <LiquidityChartRangeInputV4
                  chainId={chainId}
                  currencyA={currency0}
                  currencyB={currency1}
                  poolKey={poolKey}
                  ticksAtLimit={ticksAtLimit}
                  priceRange={priceRange}
                  price={
                    price
                      ? Number.parseFloat(
                          (invertPrice ? price.invert() : price).toSignificant(
                            8,
                          ),
                        )
                      : undefined
                  }
                  priceLower={priceLower}
                  priceUpper={priceUpper}
                  weightLockedCurrencyBase={weightLockedCurrencyBase}
                  onLeftRangeInput={(input) => {
                    setPriceRangeSelector(undefined)
                    onLeftRangeInput(input)
                  }}
                  onRightRangeInput={(input) => {
                    setPriceRangeSelector(undefined)
                    onRightRangeInput(input)
                  }}
                  interactive={!hasExistingPosition}
                  tokenToggle={tokenToggle}
                />
              ) : null}
            </div>
          )}
          <div className="flex flex-col gap-3">
            <div className="flex lg:hidden">
              {isLoading || !pool || !currency0 || !currency1 ? (
                <SkeletonText fontSize="xs" />
              ) : (
                <div
                  onClick={() => setInvert((prev) => !prev)}
                  onKeyDown={() => setInvert((prev) => !prev)}
                  className="text-xs flex items-center font-semibold gap-1.5 rounded-xl text-blue hover:text-blue-600"
                >
                  <SwitchHorizontalIcon width={16} height={16} />
                  <div className="flex items-baseline gap-1.5">
                    {invert ? currency1.symbol : currency0.symbol} ={' '}
                    {pool
                      .priceOf(invert ? currency1 : currency0)
                      ?.toSignificant(4)}{' '}
                    {invert ? currency0.symbol : currency1.symbol}
                    <span className="text-xs font-normal">
                      ${fiatAmountsAsNumber[invert ? 1 : 0].toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-4 justify-between">
              <RadioGroup value={priceRange} className="gap-2 flex flex-wrap">
                {PRICE_RANGE_OPTIONS.map(({ value, label, onClick }) => (
                  <RadioGroup.Option value={value} key={value}>
                    <Toggle
                      disabled={typeof poolKey?.fee === 'undefined'}
                      size="sm"
                      variant="outline"
                      className="whitespace-nowrap"
                      onClick={
                        priceRange === value
                          ? () => {
                              setPriceRangeSelector(undefined)
                              resetMintState()
                            }
                          : () => {
                              setPriceRangeSelector(value)
                              onClick()
                            }
                      }
                      pressed={priceRange === value}
                    >
                      {label}
                    </Toggle>
                  </RadioGroup.Option>
                ))}
              </RadioGroup>
            </div>
            <Card>
              <CardHeader>
                <CardDescription className="flex flex-col gap-3 !text-accent-foreground">
                  <div className="flex flex-wrap items-start justify-between gap-1 flex-col sm:flex-row sm:items-center">
                    <span>
                      <span className="mr-1">{`Token Ratio (${currency0?.symbol} : ${currency1?.symbol})`}</span>
                      <Explainer iconProps={{ className: 'inline mb-0.5' }}>
                        This is the ratio of the cash values of the two
                        underlying tokens in this position.
                      </Explainer>
                    </span>
                    <div className="flex flex-grow gap-1 items-center justify-end">
                      {valueRatio
                        ? `${(valueRatio[0] * 100).toFixed(0)}% : ${(
                            valueRatio[1] * 100
                          ).toFixed(0)}%`
                        : '-'}
                      {typeof weightLockedCurrencyBase === 'number' &&
                      isTokenWeightUnmatched ? (
                        <TooltipProvider>
                          <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                              <ExclamationTriangleIcon
                                width={24}
                                height={24}
                                className="dark:text-yellow text-amber-900 p-0.5"
                              />
                            </TooltipTrigger>
                            <TooltipContent className="w-80">
                              {`We failed to adjust the price range to your wanted
                            token ratio (${(
                              weightLockedCurrencyBase * 100
                            ).toFixed(0)}%:
                            ${((1 - weightLockedCurrencyBase) * 100).toFixed(0)}%
                            ). Maybe because the price range
                            is too narrow or too wide.`}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : null}
                      <TooltipProvider>
                        <Tooltip delayDuration={0}>
                          <TooltipTrigger asChild>
                            <Button
                              size="xs"
                              variant={
                                typeof weightLockedCurrencyBase !== 'number'
                                  ? 'outline'
                                  : 'destructive'
                              }
                              onClick={handleToggleWeightLock}
                            >
                              {typeof weightLockedCurrencyBase !== 'number' ? (
                                <LockOpenIcon width={10} height={10} />
                              ) : (
                                <LockClosedIcon width={10} height={10} />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="w-80">
                            Lock the token ratio such that your price range
                            automatically adjusts when changing price boundary.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-start justify-between gap-1 flex-col sm:flex-row sm:items-center">
                    <span>
                      <span className="mr-1">Capital Efficiency</span>
                      <Explainer iconProps={{ className: 'inline mb-0.5' }}>
                        For example, 2x capital efficiency means one unit of
                        liquidity in a concentrated liquidity position would
                        require a 2x capital in a full range position.
                        <br />
                        <br />
                        The narrower the price range, the higher the capital
                        efficiency.
                      </Explainer>
                    </span>
                    <div className="flex flex-grow items-center justify-end">
                      {capitalEfficiency &&
                      Number.isFinite(capitalEfficiency) &&
                      capitalEfficiency >= 0 ? (
                        <>{capitalEfficiency.toFixed(2)}x</>
                      ) : (
                        '-'
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-start justify-between gap-1 flex-col  sm:flex-row sm:items-center">
                    <span>
                      <TooltipProvider>
                        <Tooltip delayDuration={0}>
                          <TooltipTrigger asChild>
                            <span className="mr-1">
                              <span className="underline decoration-dotted">
                                {yieldRate === YieldRatePeriod.DAILY
                                  ? 'Daily Rate'
                                  : yieldRate === YieldRatePeriod.MONTHLY
                                    ? 'Monthly Rate'
                                    : 'APR'}
                              </span>{' '}
                              (when in-range, excl. IL)
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="!bg-secondary !p-0.5">
                            <RadioGroup
                              value={yieldRate}
                              onChange={setYieldRate}
                            >
                              <div className="flex gap-1 items-center">
                                {YIELD_RATE_OPTIONS.map(({ value, label }) => (
                                  <RadioGroup.Option
                                    value={value}
                                    key={value}
                                    as={Toggle}
                                    size="sm"
                                    pressed={yieldRate === value}
                                  >
                                    {label}
                                  </RadioGroup.Option>
                                ))}
                              </div>
                            </RadioGroup>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Explainer iconProps={{ className: 'inline mb-0.5' }}>
                        Estimated returns based on yesterday 24hr trade fees.
                        <br />
                        <br />
                        This value does not include the risk of divergence loss
                        (IL), and assumes the position is “in-range” all the
                        time.
                      </Explainer>
                    </span>
                    <div className="flex flex-grow items-center justify-end">
                      {!apr || !sanitizedCE ? (
                        <span className="text-muted-foreground">
                          Not enough data
                        </span>
                      ) : (
                        <span>
                          <span className="text-muted-foreground">
                            {formatPercent(apr)} * {sanitizedCE.toFixed(2)} =
                          </span>{' '}
                          {formatPercent(apr * sanitizedCE)}
                        </span>
                      )}
                    </div>
                  </div>
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <PriceBlock
              id={'min-price'}
              currency0={currency0}
              currency1={currency1}
              label="Min Price"
              value={
                ticksAtLimit[isSorted ? Bound.LOWER : Bound.UPPER]
                  ? '0'
                  : (leftPrice?.toSignificant(5) ?? '')
              }
              onUserInput={(input) => {
                setIndependentRangeField(Bound.LOWER)
                setPriceRangeSelector(undefined)
                onLeftRangeInput(input)
              }}
              decrement={isSorted ? getDecrementLower : getIncrementUpper}
              increment={isSorted ? getIncrementLower : getDecrementUpper}
              decrementDisabled={
                ticksAtLimit[isSorted ? Bound.LOWER : Bound.UPPER]
              }
              incrementDisabled={
                ticksAtLimit[isSorted ? Bound.LOWER : Bound.UPPER]
              }
            />
            <PriceBlock
              id={'max-price'}
              currency0={currency0}
              currency1={currency1}
              label="Max Price"
              value={
                ticksAtLimit[isSorted ? Bound.UPPER : Bound.LOWER]
                  ? '∞'
                  : (rightPrice?.toSignificant(5) ?? '')
              }
              onUserInput={(input) => {
                setIndependentRangeField(Bound.UPPER)
                setPriceRangeSelector(undefined)
                onRightRangeInput(input)
              }}
              decrement={isSorted ? getDecrementUpper : getIncrementLower}
              increment={isSorted ? getIncrementUpper : getDecrementLower}
              incrementDisabled={
                ticksAtLimit[isSorted ? Bound.UPPER : Bound.LOWER]
              }
              decrementDisabled={
                ticksAtLimit[isSorted ? Bound.UPPER : Bound.LOWER]
              }
            />
          </div>
        </div>
      </div>
    </FormSection>
  )
}

interface PriceBlockProps {
  id?: string
  currency0: Type | undefined
  currency1: Type | undefined
  label: string
  value: string
  decrement(): string
  increment(): string
  onUserInput(val: string): void
  decrementDisabled?: boolean
  incrementDisabled?: boolean
  locked?: boolean
  focus?: boolean
}

export const PriceBlock: FC<PriceBlockProps> = ({
  id,
  locked,
  onUserInput,
  decrement,
  increment,
  decrementDisabled,
  incrementDisabled,
  currency0,
  currency1,
  label,
  value,
  focus = false,
}) => {
  // let user type value and only update parent value on blur
  const [localValue, setLocalValue] = useState('')
  const [useLocalValue, setUseLocalValue] = useState(false)

  const handleOnFocus = () => {
    setUseLocalValue(true)
  }

  const handleOnBlur = useCallback(() => {
    setUseLocalValue(false)
    onUserInput(localValue) // trigger update on parent value
  }, [localValue, onUserInput])

  // for button clicks
  const handleDecrement = useCallback(() => {
    setUseLocalValue(false)
    onUserInput(decrement())
  }, [decrement, onUserInput])

  const handleIncrement = useCallback(() => {
    setUseLocalValue(false)
    onUserInput(increment())
  }, [increment, onUserInput])

  useEffect(() => {
    if (localValue !== value && !useLocalValue) {
      setTimeout(() => {
        setLocalValue(value) // reset local value to match parent
      }, 0)
    }
  }, [localValue, useLocalValue, value])

  return (
    <Card
      className="bg-transparent shadow-none"
      onBlur={handleOnBlur}
      onFocus={handleOnFocus}
    >
      <CardHeader>
        <CardTitle>{label}</CardTitle>
        <CardDescription>
          {currency1?.symbol} per {currency0?.symbol}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <TextField
            autoFocus={focus}
            variant="naked"
            testdata-id={`${id}-input`}
            type="number"
            value={localValue}
            onValueChange={setLocalValue}
            disabled={locked}
            tabIndex={0}
            className="text-3xl font-medium pt-1 pb-2"
          />
          <div className="flex gap-1">
            <button
              type="button"
              disabled={decrementDisabled}
              onClick={handleDecrement}
              className={classNames(
                decrementDisabled
                  ? 'opacity-40'
                  : 'hover:bg-gray-300 dark:hover:bg-slate-600',
                'flex items-center justify-center w-5 h-5 bg-gray-200 dark:bg-slate-700 rounded-full',
              )}
              tabIndex={-1}
            >
              <MinusIcon width={12} height={12} />
            </button>
            <button
              type="button"
              disabled={incrementDisabled}
              onClick={handleIncrement}
              onKeyDown={handleIncrement}
              className={classNames(
                incrementDisabled
                  ? 'opacity-40'
                  : 'hover:bg-gray-300 dark:hover:bg-slate-600',
                'flex items-center justify-center w-5 h-5 bg-gray-200 dark:bg-slate-700 rounded-full',
              )}
              tabIndex={-1}
            >
              <PlusIcon width={12} height={12} />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
