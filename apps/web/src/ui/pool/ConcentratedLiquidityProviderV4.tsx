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
import {
  type PoolKey,
  type SushiSwapV4ChainId,
  SushiSwapV4Pool,
  SushiSwapV4Position,
  getTickToPrice,
  priceToClosestTick,
  sortCurrencies,
  tickToPrice,
  tryParseTick,
} from 'src/lib/pool/v4'
import { useConcentratedLiquidityPoolV4 } from 'src/lib/wagmi/hooks/pools/hooks/useConcentratedLiquidityPoolV4'
import { Amount, Price, type Type, tryParseAmount } from 'sushi/currency'
import { withoutScientificNotation } from 'sushi/format'
import { Rounding } from 'sushi/math'
import {
  TickMath,
  encodeSqrtRatioX96,
  getPriceRangeWithTokenRatio,
  nearestUsableTick,
  priceToNumber,
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
  currency0: currencyA,
  currency1: currencyB,
  baseCurrency,
  chainId,
  poolKey,
  existingPosition,
}: {
  account: string | undefined
  currency0: Type | undefined
  currency1: Type | undefined
  baseCurrency: Type | undefined
  poolKey: PoolKey | undefined
  chainId: SushiSwapV4ChainId
  existingPosition?: SushiSwapV4Position
}): {
  pool?: SushiSwapV4Pool | null
  ticks: { [_bound in Bound]?: number | undefined }
  price?: Price<Type, Type>
  pricesAtTicks: {
    [_pricesAtTicksBound in Bound]?: Price<Type, Type> | undefined
  }
  pricesAtLimit: {
    [_pricesAtLimitBound in Bound]?: Price<Type, Type> | undefined
  }
  currencies: { [_field in Field]?: Type }
  dependentField: Field
  parsedAmounts: { [_parsedAmountsField in Field]?: Amount<Type> }
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
  const currencies: { [_field in Field]?: Type } = useMemo(
    () => ({
      [Field.CURRENCY_A]: currencyA,
      [Field.CURRENCY_B]: currencyB,
    }),
    [currencyA, currencyB],
  )

  const [currency0, currency1] = useMemo(
    () =>
      currencyA && currencyB
        ? sortCurrencies(currencyA, currencyB)
        : [undefined, undefined],
    [currencyA, currencyB],
  )

  // pool
  const usePool = useConcentratedLiquidityPoolV4({
    chainId,
    currency0: currencies[Field.CURRENCY_A],
    currency1: currencies[Field.CURRENCY_B],
    poolKey,
  })

  const { data: pool, isLoading, isError } = usePool
  const noLiquidity = !isLoading && !isError && !pool

  // note to parse inputs in reverse
  const invertPrice = Boolean(
    baseCurrency && currency0 && !baseCurrency.equals(currency0),
  )

  // always returns the price with 0 as base token
  const price: Price<Type, Type> | undefined = useMemo(() => {
    // if no liquidity use typed value
    if (noLiquidity) {
      const parsedQuoteAmount = tryParseAmount(
        startPriceTypedValue,
        invertPrice ? currency0 : currency1,
      )
      if (parsedQuoteAmount && currency0 && currency1) {
        const baseAmount = tryParseAmount(
          '1',
          invertPrice ? currency1 : currency0,
        )
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
      return pool && currency0 ? pool.priceOf(currency0) : undefined
    }
  }, [
    noLiquidity,
    startPriceTypedValue,
    invertPrice,
    currency1,
    currency0,
    pool,
  ])

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
    if (poolKey && currencyA && currencyB && price && !invalidPrice) {
      const currentTick = priceToClosestTick(price)
      const currentSqrt = TickMath.getSqrtRatioAtTick(currentTick)
      return new SushiSwapV4Pool({
        currencyA,
        currencyB,
        fee: poolKey.fee,
        sqrtRatioX96: currentSqrt,
        liquidity: 0n,
        tickCurrent: currentTick,
        tickSpacing: poolKey.parameters.tickSpacing,
      })
    } else {
      return undefined
    }
  }, [poolKey, invalidPrice, price, currencyA, currencyB])

  // if pool exists use it, if not use the mock pool
  const poolForPosition: SushiSwapV4Pool | undefined = pool ?? mockPool

  // lower and upper limits in the tick space for `feeAmoun<Trans>
  const tickSpaceLimits = useMemo(
    () => ({
      [Bound.LOWER]: poolKey
        ? nearestUsableTick(TickMath.MIN_TICK, poolKey.parameters.tickSpacing)
        : undefined,
      [Bound.UPPER]: poolKey
        ? nearestUsableTick(TickMath.MAX_TICK, poolKey.parameters.tickSpacing)
        : undefined,
    }),
    [poolKey],
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
                  currency1,
                  currency0,
                  poolKey?.fee,
                  poolKey?.parameters?.tickSpacing,
                  rightBoundInput.toString(),
                )
              : tryParseTick(
                  currency0,
                  currency1,
                  poolKey?.fee,
                  poolKey?.parameters?.tickSpacing,
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
                  currency1,
                  currency0,
                  poolKey?.fee,
                  poolKey?.parameters?.tickSpacing,
                  leftBoundInput.toString(),
                )
              : tryParseTick(
                  currency0,
                  currency1,
                  poolKey?.fee,
                  poolKey?.parameters?.tickSpacing,
                  rightBoundInput.toString(),
                ),
    }
  }, [
    existingPosition,
    poolKey,
    invertPrice,
    leftBoundInput,
    rightBoundInput,
    currency0,
    currency1,
    tickSpaceLimits,
  ])

  const { [Bound.LOWER]: tickLower, [Bound.UPPER]: tickUpper } = ticks || {}

  // specifies whether the lower and upper ticks is at the exteme bounds
  const ticksAtLimit = useMemo(
    () => ({
      [Bound.LOWER]:
        typeof poolKey?.fee !== 'undefined' &&
        tickLower === tickSpaceLimits.LOWER,
      [Bound.UPPER]:
        typeof poolKey?.fee !== 'undefined' &&
        tickUpper === tickSpaceLimits.UPPER,
    }),
    [tickSpaceLimits, tickLower, tickUpper, poolKey?.fee],
  )

  // mark invalid range
  const invalidRange = Boolean(
    typeof tickLower === 'number' &&
      typeof tickUpper === 'number' &&
      tickLower >= tickUpper,
  )

  const pricesAtLimit = useMemo(() => {
    return {
      [Bound.LOWER]: getTickToPrice(
        currency0,
        currency1,
        tickSpaceLimits.LOWER,
      ),
      [Bound.UPPER]: getTickToPrice(
        currency0,
        currency1,
        tickSpaceLimits.UPPER,
      ),
    }
  }, [currency0, currency1, tickSpaceLimits.LOWER, tickSpaceLimits.UPPER])

  // always returns the price with 0 as base token
  const pricesAtTicks = useMemo(() => {
    return {
      [Bound.LOWER]: getTickToPrice(currency0, currency1, ticks[Bound.LOWER]),
      [Bound.UPPER]: getTickToPrice(currency0, currency1, ticks[Bound.UPPER]),
    }
  }, [currency0, currency1, ticks])
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
  const independentAmount: Amount<Type> | undefined = tryParseAmount(
    typedValue,
    currencies[independentField],
  )

  const dependentAmount: Amount<Type> | undefined = useMemo(() => {
    // we wrap the currencies just to get the price in terms of the other token
    const dependentCurrency =
      dependentField === Field.CURRENCY_B ? currencyB : currencyA
    if (
      independentAmount &&
      typeof tickLower === 'number' &&
      typeof tickUpper === 'number' &&
      poolForPosition
    ) {
      // if price is out of range or invalid range - return 0 (single deposit will be independent)
      if (outOfRange || invalidRange) {
        return undefined
      }

      const position: SushiSwapV4Position | undefined =
        independentAmount.currency.equals(poolForPosition.currency0)
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

      const dependentTokenAmount = independentAmount.currency.equals(
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
    [_parsedAmountsField in Field]: Amount<Type> | undefined
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
        currencyA &&
        poolForPosition.currency0.equals(currencyA)) ||
        (deposit1Disabled &&
          poolForPosition &&
          currencyA &&
          poolForPosition.currency1.equals(currencyA)),
    )
  const depositBDisabled =
    invalidRange ||
    Boolean(
      (deposit0Disabled &&
        poolForPosition &&
        currencyB &&
        poolForPosition.currency0.equals(currencyB)) ||
        (deposit1Disabled &&
          poolForPosition &&
          currencyB &&
          poolForPosition.currency1.equals(currencyB)),
    )

  // create position entity based on users selection
  const position: SushiSwapV4Position | undefined = useMemo(() => {
    if (
      !poolForPosition ||
      !currencyA ||
      !currencyB ||
      typeof tickLower !== 'number' ||
      typeof tickUpper !== 'number' ||
      invalidRange
    ) {
      return undefined
    }

    // mark as 0 if disabled because out of range
    const amount0 = !deposit0Disabled
      ? parsedAmounts?.[
          currencyA.equals(poolForPosition.currency0)
            ? Field.CURRENCY_A
            : Field.CURRENCY_B
        ]?.quotient
      : 0n
    const amount1 = !deposit1Disabled
      ? parsedAmounts?.[
          currencyA.equals(poolForPosition.currency0)
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
    currencyA,
    currencyB,
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
  baseCurrency: Type | undefined,
  quoteCurrency: Type | undefined,
  tickSpacing: number | undefined,
  tickLower: number | undefined,
  tickUpper: number | undefined,
  pool?: SushiSwapV4Pool | undefined | null,
) {
  const { setFullRange, resetMintState } = useConcentratedMintActionHandlers()

  const getDecrementLower = useCallback(() => {
    if (
      baseCurrency &&
      quoteCurrency &&
      typeof tickLower === 'number' &&
      tickSpacing
    ) {
      const newPrice = tickToPrice(
        baseCurrency,
        quoteCurrency,
        tickLower - tickSpacing,
      )
      return newPrice.toSignificant(5, undefined, Rounding.ROUND_UP)
    }
    // use pool current tick as starting tick if we have pool but no tick input
    if (
      !(typeof tickLower === 'number') &&
      baseCurrency &&
      quoteCurrency &&
      tickSpacing &&
      pool
    ) {
      const newPrice = tickToPrice(
        baseCurrency,
        quoteCurrency,
        pool.tickCurrent - tickSpacing,
      )
      return newPrice.toSignificant(5, undefined, Rounding.ROUND_UP)
    }
    return ''
  }, [baseCurrency, quoteCurrency, tickLower, tickSpacing, pool])

  const getIncrementLower = useCallback(() => {
    if (
      baseCurrency &&
      quoteCurrency &&
      typeof tickLower === 'number' &&
      tickSpacing
    ) {
      const newPrice = tickToPrice(
        baseCurrency,
        quoteCurrency,
        tickLower + tickSpacing,
      )
      return newPrice.toSignificant(5, undefined, Rounding.ROUND_UP)
    }
    // use pool current tick as starting tick if we have pool but no tick input
    if (
      !(typeof tickLower === 'number') &&
      baseCurrency &&
      quoteCurrency &&
      tickSpacing &&
      pool
    ) {
      const newPrice = tickToPrice(
        baseCurrency,
        quoteCurrency,
        pool.tickCurrent + tickSpacing,
      )
      return newPrice.toSignificant(5, undefined, Rounding.ROUND_UP)
    }
    return ''
  }, [baseCurrency, quoteCurrency, tickLower, tickSpacing, pool])

  const getDecrementUpper = useCallback(() => {
    if (
      baseCurrency &&
      quoteCurrency &&
      typeof tickUpper === 'number' &&
      tickSpacing
    ) {
      const newPrice = tickToPrice(
        baseCurrency,
        quoteCurrency,
        tickUpper - tickSpacing,
      )
      return newPrice.toSignificant(5, undefined, Rounding.ROUND_UP)
    }
    // use pool current tick as starting tick if we have pool but no tick input
    if (
      !(typeof tickUpper === 'number') &&
      baseCurrency &&
      quoteCurrency &&
      tickSpacing &&
      pool
    ) {
      const newPrice = tickToPrice(
        baseCurrency,
        quoteCurrency,
        pool.tickCurrent - tickSpacing,
      )
      return newPrice.toSignificant(5, undefined, Rounding.ROUND_UP)
    }
    return ''
  }, [baseCurrency, quoteCurrency, tickUpper, tickSpacing, pool])

  const getIncrementUpper = useCallback(() => {
    if (
      baseCurrency &&
      quoteCurrency &&
      typeof tickUpper === 'number' &&
      tickSpacing
    ) {
      const newPrice = tickToPrice(
        baseCurrency,
        quoteCurrency,
        tickUpper + tickSpacing,
      )
      return newPrice.toSignificant(5, undefined, Rounding.ROUND_UP)
    }
    // use pool current tick as starting tick if we have pool but no tick input
    if (
      !(typeof tickUpper === 'number') &&
      baseCurrency &&
      quoteCurrency &&
      tickSpacing &&
      pool
    ) {
      const newPrice = tickToPrice(
        baseCurrency,
        quoteCurrency,
        pool.tickCurrent + tickSpacing,
      )
      return newPrice.toSignificant(5, undefined, Rounding.ROUND_UP)
    }
    return ''
  }, [baseCurrency, quoteCurrency, tickUpper, tickSpacing, pool])

  return {
    getDecrementLower,
    getIncrementLower,
    getDecrementUpper,
    getIncrementUpper,
    getSetFullRange: setFullRange,
    resetMintState,
  }
}
