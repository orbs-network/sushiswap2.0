'use client'

import {
  type FC,
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from 'react'
import { Bound, Field } from 'src/lib/constants'
import { getTickToPrice, tryParseTick } from 'src/lib/functions'
import {
  type SushiSwapV4ChainId,
  SushiSwapV4Pool,
  type SushiSwapV4PoolState,
  SushiSwapV4Position,
  getCLPool,
  priceToClosestTick,
} from 'src/lib/pool/v4'
import { useConcentratedLiquidityPoolV4 } from 'src/lib/wagmi/hooks/pools/hooks/useConcentratedLiquidityPoolV4'
import { TICK_SPACINGS } from 'sushi/config'
import {
  Amount,
  type Currency,
  Price,
  type Token,
  type Type,
  tryParseAmount,
} from 'sushi/currency'
import { withoutScientificNotation } from 'sushi/format'
import { Rounding } from 'sushi/math'
import {
  TickMath,
  encodeSqrtRatioX96,
  getPriceRangeWithTokenRatio,
  nearestUsableTick,
  priceToNumber,
  tickToPrice,
} from 'sushi/pool/sushiswap-v3'

type FullRange = true

interface State {
  independentField: Field
  independentRangeField: Bound
  typedValue: string
  startPriceTypedValue: string // for the case when there's no liquidity
  leftRangeTypedValue: string | FullRange
  rightRangeTypedValue: string | FullRange
  weightLockedCurrencyBase: number | undefined
}

type Api = {
  onFieldAInput(typedValue: string, noLiquidity: boolean | undefined): void
  onFieldBInput(typedValue: string, noLiquidity: boolean | undefined): void
  onLeftRangeInput(typedValue: string): void
  onRightRangeInput(typedValue: string): void
  onStartPriceInput(typedValue: string): void
  resetMintState(): void
  setFullRange(): void
  setWeightLockedCurrencyBase(value: number | undefined): void
  setIndependentRangeField(value: Bound): void
}

const initialState: State = {
  independentField: Field.CURRENCY_A,
  independentRangeField: Bound.LOWER,
  typedValue: '',
  startPriceTypedValue: '',
  leftRangeTypedValue: '',
  rightRangeTypedValue: '',
  weightLockedCurrencyBase: undefined,
}

type Actions =
  | { type: 'resetMintState' }
  | { type: 'typeLeftRangeInput'; typedValue: string }
  | {
      type: 'typeInput'
      field: Field
      typedValue: string
      noLiquidity: boolean
    }
  | { type: 'typeRightRangeInput'; typedValue: string }
  | { type: 'setFullRange' }
  | { type: 'typeStartPriceInput'; typedValue: string }
  | { type: 'setWeightLockedCurrencyBase'; value: number | undefined }
  | { type: 'setIndependentRangeField'; value: Bound }

const ConcentratedLiquidityStateContext = createContext<State>(initialState)
const ConcentratedLiquidityActionsContext = createContext<Api>({} as Api)

const reducer = (state: State, action: Actions): State => {
  switch (action.type) {
    case 'resetMintState':
      return initialState
    case 'setFullRange':
      return { ...state, leftRangeTypedValue: true, rightRangeTypedValue: true }
    case 'typeStartPriceInput':
      return { ...state, startPriceTypedValue: action.typedValue }
    case 'typeLeftRangeInput':
      return { ...state, leftRangeTypedValue: action.typedValue }
    case 'typeRightRangeInput':
      return { ...state, rightRangeTypedValue: action.typedValue }
    case 'typeInput': {
      return {
        ...state,
        independentField: action.field,
        typedValue: action.typedValue,
      }
    }
    case 'setWeightLockedCurrencyBase': {
      return { ...state, weightLockedCurrencyBase: action.value }
    }
    case 'setIndependentRangeField': {
      return { ...state, independentRangeField: action.value }
    }
  }
}

/*
  Provider only used whenever a user selects Concentrated Liquidity
 */
export const ConcentratedLiquidityProviderV4: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(reducer, initialState)

  const api = useMemo(() => {
    const onFieldAInput = (
      typedValue: string,
      noLiquidity: boolean | undefined,
    ) =>
      dispatch({
        type: 'typeInput',
        field: Field.CURRENCY_A,
        typedValue,
        noLiquidity: noLiquidity === true,
      })

    const onFieldBInput = (
      typedValue: string,
      noLiquidity: boolean | undefined,
    ) =>
      dispatch({
        type: 'typeInput',
        field: Field.CURRENCY_B,
        typedValue,
        noLiquidity: noLiquidity === true,
      })

    const onLeftRangeInput = (typedValue: string) => {
      dispatch({ type: 'typeLeftRangeInput', typedValue })
      // TODO searchParams
      // const paramMinPrice = searchParams.get('minPrice')
      // if (!paramMinPrice || (paramMinPrice && paramMinPrice !== typedValue)) {
      //   searchParams.set('minPrice', typedValue)
      //   setSearchParams(searchParams)
      // }
    }

    const onRightRangeInput = (typedValue: string) => {
      dispatch({ type: 'typeRightRangeInput', typedValue })
      // TODO searchParams
      // const paramMaxPrice = searchParams.get('maxPrice')
      // if (!paramMaxPrice || (paramMaxPrice && paramMaxPrice !== typedValue)) {
      //   searchParams.set('maxPrice', typedValue)
      //   setSearchParams(searchParams)
      // }
    }

    const onStartPriceInput = (typedValue: string) =>
      dispatch({ type: 'typeStartPriceInput', typedValue })
    const resetMintState = () => dispatch({ type: 'resetMintState' })
    const setFullRange = () => dispatch({ type: 'setFullRange' })
    const setWeightLockedCurrencyBase = (value: number | undefined) =>
      dispatch({ type: 'setWeightLockedCurrencyBase', value })
    const setIndependentRangeField = (value: Bound) =>
      dispatch({ type: 'setIndependentRangeField', value })

    return {
      resetMintState,
      setFullRange,
      onFieldAInput,
      onFieldBInput,
      onLeftRangeInput,
      onRightRangeInput,
      onStartPriceInput,
      setWeightLockedCurrencyBase,
      setIndependentRangeField,
    }
  }, [])

  return (
    <ConcentratedLiquidityActionsContext.Provider value={api}>
      <ConcentratedLiquidityStateContext.Provider value={state}>
        {children}
      </ConcentratedLiquidityStateContext.Provider>
    </ConcentratedLiquidityActionsContext.Provider>
  )
}

export const useConcentratedMintState = () => {
  const context = useContext(ConcentratedLiquidityStateContext)
  if (!context) {
    throw new Error(
      'Hook can only be used Concentrated Liquidity Provider State Context',
    )
  }

  return context
}

export const useConcentratedMintActionHandlers = () => {
  const context = useContext(ConcentratedLiquidityActionsContext)

  if (!context) {
    throw new Error(
      'Hook can only be used Concentrated Liquidity Provider Actions Context',
    )
  }

  return context
}

export function useConcentratedDerivedMintInfoV4({
  account,
  token0: currencyA,
  token1: currencyB,
  baseToken: baseCurrency,
  chainId,
  feeAmount,
  tickSpacing,
  existingPosition,
}: {
  account: string | undefined
  token0: Type | undefined
  token1: Type | undefined
  baseToken: Type | undefined
  chainId: SushiSwapV4ChainId
  feeAmount: number | undefined
  tickSpacing: number | undefined
  existingPosition?: SushiSwapV4Position
}): {
  pool?: SushiSwapV4Pool | null
  ticks: { [_bound in Bound]?: number | undefined }
  price?: Price<Type, Type>
  pricesAtTicks: {
    [_pricesAtTicksBound in Bound]?: Price<Token, Token> | undefined
  }
  pricesAtLimit: {
    [_pricesAtLimitBound in Bound]?: Price<Token, Token> | undefined
  }
  currencies: { [_field in Field]?: Currency }
  dependentField: Field
  parsedAmounts: { [_parsedAmountsField in Field]?: Amount<Currency> }
  position: SushiSwapV4Position | undefined
  noLiquidity?: boolean
  errorMessage?: ReactNode
  invalidPool: boolean
  outOfRange: boolean
  invalidRange: boolean
  depositADisabled: boolean
  depositBDisabled: boolean
  invertPrice: boolean
  ticksAtLimit: { [_ticksAtLimitBound in Bound]?: boolean | undefined }
  isLoading: boolean
  isInitialLoading: boolean
  leftBoundInput: string | true
  rightBoundInput: string | true
} {
  const {
    independentField,
    independentRangeField,
    typedValue,
    leftRangeTypedValue,
    rightRangeTypedValue,
    startPriceTypedValue,
    weightLockedCurrencyBase,
  } = useConcentratedMintState()

  const dependentField =
    independentField === Field.CURRENCY_A ? Field.CURRENCY_B : Field.CURRENCY_A

  // currencies
  const currencies: { [_field in Field]?: Currency } = useMemo(
    () => ({
      [Field.CURRENCY_A]: currencyA,
      [Field.CURRENCY_B]: currencyB,
    }),
    [currencyA, currencyB],
  )

  // formatted with tokens
  const [tokenA, tokenB, baseToken] = useMemo(
    () => [currencyA?.wrapped, currencyB?.wrapped, baseCurrency?.wrapped],
    [currencyA, currencyB, baseCurrency],
  )

  const [token0, token1] = useMemo(
    () =>
      tokenA && tokenB
        ? tokenA.sortsBefore(tokenB)
          ? [tokenA, tokenB]
          : [tokenB, tokenA]
        : [undefined, undefined],
    [tokenA, tokenB],
  )

  // pool
  const usePool = useConcentratedLiquidityPoolV4({
    chainId,
    currency0: currencies[Field.CURRENCY_A],
    currency1: currencies[Field.CURRENCY_B],
    feeAmount,
    tickSpacing,
    enabled: false,
  })

  const { data: pool, isLoading, isError } = usePool
  const noLiquidity = !isLoading && !isError && !pool

  // note to parse inputs in reverse
  const invertPrice = Boolean(baseToken && token0 && !baseToken.equals(token0))

  // always returns the price with 0 as base token
  const price: Price<Type, Type> | undefined = useMemo(() => {
    // if no liquidity use typed value
    if (noLiquidity) {
      const parsedQuoteAmount = tryParseAmount(
        startPriceTypedValue,
        invertPrice ? token0 : token1,
      )
      if (parsedQuoteAmount && token0 && token1) {
        const baseAmount = tryParseAmount('1', invertPrice ? token1 : token0)
        const price =
          baseAmount && parsedQuoteAmount
            ? new Price(
                baseAmount.currency,
                parsedQuoteAmount.currency,
                baseAmount.quotient,
                parsedQuoteAmount.quotient,
              )
            : undefined
        return (invertPrice ? price?.invert() : price) ?? undefined
      }
      return undefined
    } else {
      // get the amount of quote currency
      return pool && token0 ? pool.priceOf(token0) : undefined
    }
  }, [noLiquidity, startPriceTypedValue, invertPrice, token1, token0, pool])

  // check for invalid price input (converts to invalid ratio)
  const invalidPrice = useMemo(() => {
    const sqrtRatioX96 = price
      ? encodeSqrtRatioX96(price.numerator, price.denominator)
      : undefined
    return (
      price &&
      sqrtRatioX96 &&
      !(
        sqrtRatioX96 >= TickMath.MIN_SQRT_RATIO &&
        sqrtRatioX96 < TickMath.MAX_SQRT_RATIO
      )
    )
  }, [price])

  // used for ratio calculation when pool not initialized
  const mockPool = useMemo(() => {
    if (
      tokenA &&
      tokenB &&
      feeAmount &&
      tickSpacing &&
      price &&
      !invalidPrice
    ) {
      const currentTick = priceToClosestTick(price)
      const currentSqrt = TickMath.getSqrtRatioAtTick(currentTick)
      return new SushiSwapV4Pool({
        currencyA: tokenA,
        currencyB: tokenB,
        fee: feeAmount,
        protocolFee: 0,
        sqrtRatioX96: currentSqrt,
        liquidity: 0n,
        tickCurrent: currentTick,
        tickSpacing,
      })
    } else {
      return undefined
    }
  }, [feeAmount, tickSpacing, invalidPrice, price, tokenA, tokenB])

  // if pool exists use it, if not use the mock pool
  const poolForPosition: SushiSwapV4Pool | undefined = pool ?? mockPool

  // lower and upper limits in the tick space for `feeAmoun<Trans>
  const tickSpaceLimits = useMemo(
    () => ({
      [Bound.LOWER]: tickSpacing
        ? nearestUsableTick(TickMath.MIN_TICK, tickSpacing)
        : undefined,
      [Bound.UPPER]: tickSpacing
        ? nearestUsableTick(TickMath.MAX_TICK, tickSpacing)
        : undefined,
    }),
    [tickSpacing],
  )

  const [leftBoundInput, rightBoundInput] = useMemo((): [
    string | true,
    string | true,
  ] => {
    if (
      typeof weightLockedCurrencyBase === 'number' &&
      price &&
      leftRangeTypedValue !== '' &&
      rightRangeTypedValue !== ''
    ) {
      const newRange = getPriceRangeWithTokenRatio(
        priceToNumber(invertPrice ? price.invert() : price),
        leftRangeTypedValue === true ? 2 ** -112 : Number(leftRangeTypedValue),
        rightRangeTypedValue === true ? 2 ** 112 : Number(rightRangeTypedValue),
        independentRangeField,
        weightLockedCurrencyBase,
      )?.map((x) => withoutScientificNotation(x.toString()))

      if (
        newRange &&
        typeof newRange[0] === 'string' &&
        typeof newRange[1] === 'string'
      ) {
        return [newRange[0], newRange[1]]
      }
    }
    return [leftRangeTypedValue, rightRangeTypedValue]
  }, [
    weightLockedCurrencyBase,
    leftRangeTypedValue,
    rightRangeTypedValue,
    independentRangeField,
    price,
    invertPrice,
  ])

  // parse typed range values and determine closest ticks
  // lower should always be a smaller tick
  const ticks = useMemo(() => {
    return {
      [Bound.LOWER]:
        typeof existingPosition?.tickLower === 'number'
          ? existingPosition.tickLower
          : (invertPrice && rightBoundInput === true) ||
              (!invertPrice && leftBoundInput === true)
            ? tickSpaceLimits[Bound.LOWER]
            : invertPrice
              ? tryParseTick(
                  token1,
                  token0,
                  feeAmount,
                  rightBoundInput.toString(),
                )
              : tryParseTick(
                  token0,
                  token1,
                  feeAmount,
                  leftBoundInput.toString(),
                ),
      [Bound.UPPER]:
        typeof existingPosition?.tickUpper === 'number'
          ? existingPosition.tickUpper
          : (invertPrice && leftBoundInput === true) ||
              (!invertPrice && rightBoundInput === true)
            ? tickSpaceLimits[Bound.UPPER]
            : invertPrice
              ? tryParseTick(
                  token1,
                  token0,
                  feeAmount,
                  leftBoundInput.toString(),
                )
              : tryParseTick(
                  token0,
                  token1,
                  feeAmount,
                  rightBoundInput.toString(),
                ),
    }
  }, [
    existingPosition,
    feeAmount,
    invertPrice,
    leftBoundInput,
    rightBoundInput,
    token0,
    token1,
    tickSpaceLimits,
  ])

  const { [Bound.LOWER]: tickLower, [Bound.UPPER]: tickUpper } = ticks || {}

  // specifies whether the lower and upper ticks is at the exteme bounds
  const ticksAtLimit = useMemo(
    () => ({
      [Bound.LOWER]:
        typeof feeAmount !== 'undefined' && tickLower === tickSpaceLimits.LOWER,
      [Bound.UPPER]:
        typeof feeAmount !== 'undefined' && tickUpper === tickSpaceLimits.UPPER,
    }),
    [tickSpaceLimits, tickLower, tickUpper, feeAmount],
  )

  // mark invalid range
  const invalidRange = Boolean(
    typeof tickLower === 'number' &&
      typeof tickUpper === 'number' &&
      tickLower >= tickUpper,
  )

  const pricesAtLimit = useMemo(() => {
    return {
      [Bound.LOWER]: getTickToPrice(token0, token1, tickSpaceLimits.LOWER),
      [Bound.UPPER]: getTickToPrice(token0, token1, tickSpaceLimits.UPPER),
    }
  }, [token0, token1, tickSpaceLimits.LOWER, tickSpaceLimits.UPPER])

  // always returns the price with 0 as base token
  const pricesAtTicks = useMemo(() => {
    return {
      [Bound.LOWER]: getTickToPrice(token0, token1, ticks[Bound.LOWER]),
      [Bound.UPPER]: getTickToPrice(token0, token1, ticks[Bound.UPPER]),
    }
  }, [token0, token1, ticks])
  const { [Bound.LOWER]: lowerPrice, [Bound.UPPER]: upperPrice } = pricesAtTicks

  // liquidity range warning
  const outOfRange = Boolean(
    !invalidRange &&
      price &&
      lowerPrice &&
      upperPrice &&
      (price.lessThan(lowerPrice) || price.greaterThan(upperPrice)),
  )

  // amounts
  const independentAmount: Amount<Currency> | undefined = tryParseAmount(
    typedValue,
    currencies[independentField],
  )

  const dependentAmount: Amount<Currency> | undefined = useMemo(() => {
    // we wrap the currencies just to get the price in terms of the other token
    const wrappedIndependentAmount = independentAmount?.wrapped
    const dependentCurrency =
      dependentField === Field.CURRENCY_B ? currencyB : currencyA
    if (
      independentAmount &&
      wrappedIndependentAmount &&
      typeof tickLower === 'number' &&
      typeof tickUpper === 'number' &&
      poolForPosition
    ) {
      // if price is out of range or invalid range - return 0 (single deposit will be independent)
      if (outOfRange || invalidRange) {
        return undefined
      }

      const position: SushiSwapV4Position | undefined =
        wrappedIndependentAmount.currency.equals(poolForPosition.currency0)
          ? SushiSwapV4Position.fromAmount0({
              pool: poolForPosition,
              tickLower,
              tickUpper,
              amount0: independentAmount.quotient,
              useFullPrecision: true, // we want full precision for the theoretical position
            })
          : SushiSwapV4Position.fromAmount1({
              pool: poolForPosition,
              tickLower,
              tickUpper,
              amount1: independentAmount.quotient,
            })

      const dependentTokenAmount = wrappedIndependentAmount.currency.equals(
        poolForPosition.currency0,
      )
        ? position.amount1
        : position.amount0
      return (
        dependentCurrency &&
        Amount.fromRawAmount(dependentCurrency, dependentTokenAmount.quotient)
      )
    }

    return undefined
  }, [
    independentAmount,
    outOfRange,
    dependentField,
    currencyB,
    currencyA,
    tickLower,
    tickUpper,
    poolForPosition,
    invalidRange,
  ])

  const parsedAmounts: {
    [_parsedAmountsField in Field]: Amount<Currency> | undefined
  } = useMemo(() => {
    return {
      [Field.CURRENCY_A]:
        independentField === Field.CURRENCY_A
          ? independentAmount
          : dependentAmount,
      [Field.CURRENCY_B]:
        independentField === Field.CURRENCY_A
          ? dependentAmount
          : independentAmount,
    }
  }, [dependentAmount, independentAmount, independentField])

  // single deposit only if price is out of range
  const deposit0Disabled = Boolean(
    typeof tickUpper === 'number' &&
      poolForPosition &&
      poolForPosition.tickCurrent >= tickUpper,
  )
  const deposit1Disabled = Boolean(
    typeof tickLower === 'number' &&
      poolForPosition &&
      poolForPosition.tickCurrent <= tickLower,
  )

  // sorted for token order
  const depositADisabled =
    invalidRange ||
    Boolean(
      (deposit0Disabled &&
        poolForPosition &&
        tokenA &&
        poolForPosition.currency0.equals(tokenA)) ||
        (deposit1Disabled &&
          poolForPosition &&
          tokenA &&
          poolForPosition.currency1.equals(tokenA)),
    )
  const depositBDisabled =
    invalidRange ||
    Boolean(
      (deposit0Disabled &&
        poolForPosition &&
        tokenB &&
        poolForPosition.currency0.equals(tokenB)) ||
        (deposit1Disabled &&
          poolForPosition &&
          tokenB &&
          poolForPosition.currency1.equals(tokenB)),
    )

  // create position entity based on users selection
  const position: SushiSwapV4Position | undefined = useMemo(() => {
    if (
      !poolForPosition ||
      !tokenA ||
      !tokenB ||
      typeof tickLower !== 'number' ||
      typeof tickUpper !== 'number' ||
      invalidRange
    ) {
      return undefined
    }

    // mark as 0 if disabled because out of range
    const amount0 = !deposit0Disabled
      ? parsedAmounts?.[
          tokenA.equals(poolForPosition.currency0)
            ? Field.CURRENCY_A
            : Field.CURRENCY_B
        ]?.quotient
      : 0n
    const amount1 = !deposit1Disabled
      ? parsedAmounts?.[
          tokenA.equals(poolForPosition.currency0)
            ? Field.CURRENCY_B
            : Field.CURRENCY_A
        ]?.quotient
      : 0n

    if (amount0 !== undefined && amount1 !== undefined) {
      return SushiSwapV4Position.fromAmounts({
        pool: poolForPosition,
        tickLower,
        tickUpper,
        amount0,
        amount1,
        useFullPrecision: true, // we want full precision for the theoretical position
      })
    } else {
      return undefined
    }
  }, [
    parsedAmounts,
    poolForPosition,
    tokenA,
    tokenB,
    deposit0Disabled,
    deposit1Disabled,
    invalidRange,
    tickLower,
    tickUpper,
  ])

  let errorMessage: ReactNode | undefined
  if (!account) {
    errorMessage = 'Connect Wallet'
  }

  if (isError) {
    errorMessage = errorMessage ?? 'Invalid pair'
  }

  if (invalidPrice) {
    errorMessage = errorMessage ?? 'Invalid price input'
  }

  if (
    (!parsedAmounts[Field.CURRENCY_A] && !depositADisabled) ||
    (!parsedAmounts[Field.CURRENCY_B] && !depositBDisabled)
  ) {
    errorMessage = errorMessage ?? 'Enter an amount'
  }

  const invalidPool = isError

  return useMemo(
    () => ({
      dependentField,
      currencies,
      pool,
      parsedAmounts,
      leftBoundInput,
      rightBoundInput,
      ticks,
      price,
      pricesAtTicks,
      pricesAtLimit,
      position,
      noLiquidity,
      errorMessage,
      invalidPool,
      invalidRange,
      outOfRange,
      depositADisabled,
      depositBDisabled,
      invertPrice,
      ticksAtLimit,
      ...usePool,
    }),
    [
      currencies,
      dependentField,
      depositADisabled,
      depositBDisabled,
      errorMessage,
      invalidPool,
      invalidRange,
      invertPrice,
      leftBoundInput,
      noLiquidity,
      outOfRange,
      parsedAmounts,
      pool,
      position,
      price,
      pricesAtLimit,
      pricesAtTicks,
      rightBoundInput,
      ticks,
      ticksAtLimit,
      usePool,
    ],
  )
}

export function useRangeHopCallbacks(
  baseCurrency: Currency | undefined,
  quoteCurrency: Currency | undefined,
  tickSpacing: number | undefined,
  tickLower: number | undefined,
  tickUpper: number | undefined,
  pool?: SushiSwapV4Pool | undefined | null,
) {
  const { setFullRange, resetMintState } = useConcentratedMintActionHandlers()
  const baseToken = useMemo(() => baseCurrency?.wrapped, [baseCurrency])
  const quoteToken = useMemo(() => quoteCurrency?.wrapped, [quoteCurrency])

  const getDecrementLower = useCallback(() => {
    if (
      baseToken &&
      quoteToken &&
      typeof tickLower === 'number' &&
      tickSpacing
    ) {
      const newPrice = tickToPrice(
        baseToken,
        quoteToken,
        tickLower - tickSpacing,
      )
      return newPrice.toSignificant(5, undefined, Rounding.ROUND_UP)
    }
    // use pool current tick as starting tick if we have pool but no tick input
    if (
      !(typeof tickLower === 'number') &&
      baseToken &&
      quoteToken &&
      tickSpacing &&
      pool
    ) {
      const newPrice = tickToPrice(
        baseToken,
        quoteToken,
        pool.tickCurrent - tickSpacing,
      )
      return newPrice.toSignificant(5, undefined, Rounding.ROUND_UP)
    }
    return ''
  }, [baseToken, quoteToken, tickLower, tickSpacing, pool])

  const getIncrementLower = useCallback(() => {
    if (
      baseToken &&
      quoteToken &&
      typeof tickLower === 'number' &&
      tickSpacing
    ) {
      const newPrice = tickToPrice(
        baseToken,
        quoteToken,
        tickLower + tickSpacing,
      )
      return newPrice.toSignificant(5, undefined, Rounding.ROUND_UP)
    }
    // use pool current tick as starting tick if we have pool but no tick input
    if (
      !(typeof tickLower === 'number') &&
      baseToken &&
      quoteToken &&
      tickSpacing &&
      pool
    ) {
      const newPrice = tickToPrice(
        baseToken,
        quoteToken,
        pool.tickCurrent + tickSpacing,
      )
      return newPrice.toSignificant(5, undefined, Rounding.ROUND_UP)
    }
    return ''
  }, [baseToken, quoteToken, tickLower, tickSpacing, pool])

  const getDecrementUpper = useCallback(() => {
    if (
      baseToken &&
      quoteToken &&
      typeof tickUpper === 'number' &&
      tickSpacing
    ) {
      const newPrice = tickToPrice(
        baseToken,
        quoteToken,
        tickUpper - tickSpacing,
      )
      return newPrice.toSignificant(5, undefined, Rounding.ROUND_UP)
    }
    // use pool current tick as starting tick if we have pool but no tick input
    if (
      !(typeof tickUpper === 'number') &&
      baseToken &&
      quoteToken &&
      tickSpacing &&
      pool
    ) {
      const newPrice = tickToPrice(
        baseToken,
        quoteToken,
        pool.tickCurrent - tickSpacing,
      )
      return newPrice.toSignificant(5, undefined, Rounding.ROUND_UP)
    }
    return ''
  }, [baseToken, quoteToken, tickUpper, tickSpacing, pool])

  const getIncrementUpper = useCallback(() => {
    if (
      baseToken &&
      quoteToken &&
      typeof tickUpper === 'number' &&
      tickSpacing
    ) {
      const newPrice = tickToPrice(
        baseToken,
        quoteToken,
        tickUpper + tickSpacing,
      )
      return newPrice.toSignificant(5, undefined, Rounding.ROUND_UP)
    }
    // use pool current tick as starting tick if we have pool but no tick input
    if (
      !(typeof tickUpper === 'number') &&
      baseToken &&
      quoteToken &&
      tickSpacing &&
      pool
    ) {
      const newPrice = tickToPrice(
        baseToken,
        quoteToken,
        pool.tickCurrent + tickSpacing,
      )
      return newPrice.toSignificant(5, undefined, Rounding.ROUND_UP)
    }
    return ''
  }, [baseToken, quoteToken, tickUpper, tickSpacing, pool])

  return {
    getDecrementLower,
    getIncrementLower,
    getDecrementUpper,
    getIncrementUpper,
    getSetFullRange: setFullRange,
    resetMintState,
  }
}
