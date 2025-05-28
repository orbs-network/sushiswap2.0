import { MaxUint256 } from 'src/lib/permit2/constants'
import { Amount, type Price, type Type } from 'sushi/currency'
import { type BigintIsh, Percent } from 'sushi/math'
import {
  SqrtPriceMath,
  TickMath,
  encodeSqrtRatioX96,
  maxLiquidityForAmounts,
} from 'sushi/pool/sushiswap-v3'
import invariant from 'tiny-invariant'
import { tickToPrice } from '../utils/priceTickConversions'
import { SushiSwapV4Pool } from './SushiSwapV4Pool'

interface PositionConstructorArgs {
  pool: SushiSwapV4Pool
  liquidity: BigintIsh
  tickLower: number
  tickUpper: number
}

/**
 * Represents a position on a Uniswap V4 Pool
 * @dev Similar to the V3 implementation
 * - using Currency instead of Token
 * - keep in mind that Pool and liquidity must be fetched from the pool manager
 */
export class SushiSwapV4Position {
  public readonly pool: SushiSwapV4Pool
  public readonly tickLower: number
  public readonly tickUpper: number
  public readonly liquidity: bigint // TODO: needs to be fetched from pool manager

  // cached resuts for the getters
  private _token0Amount: Amount<Type> | null = null
  private _token1Amount: Amount<Type> | null = null
  private _mintAmounts: Readonly<{ amount0: bigint; amount1: bigint }> | null =
    null

  /**
   * Constructs a position for a given pool with the given liquidity
   * @param pool For which pool the liquidity is assigned
   * @param liquidity The amount of liquidity that is in the position
   * @param tickLower The lower tick of the position
   * @param tickUpper The upper tick of the position
   */
  public constructor({
    pool,
    liquidity,
    tickLower,
    tickUpper,
  }: PositionConstructorArgs) {
    invariant(tickLower < tickUpper, 'TICK_ORDER')
    invariant(
      tickLower >= TickMath.MIN_TICK && tickLower % pool.tickSpacing === 0,
      'TICK_LOWER',
    )
    invariant(
      tickUpper <= TickMath.MAX_TICK && tickUpper % pool.tickSpacing === 0,
      'TICK_UPPER',
    )

    this.pool = pool
    this.tickLower = tickLower
    this.tickUpper = tickUpper
    this.liquidity = BigInt(liquidity.toString())
  }

  /**
   * Returns the price of token0 at the lower tick
   */
  public get token0PriceLower(): Price<Type, Type> {
    return tickToPrice(this.pool.currency0, this.pool.currency1, this.tickLower)
  }

  /**
   * Returns the price of token0 at the upper tick
   */
  public get token0PriceUpper(): Price<Type, Type> {
    return tickToPrice(this.pool.currency0, this.pool.currency1, this.tickUpper)
  }

  /**
   * Returns the amount of token0 that this position's liquidity could be burned for at the current pool price
   */
  public get amount0(): Amount<Type> {
    if (!this._token0Amount) {
      if (this.pool.tickCurrent < this.tickLower) {
        this._token0Amount = Amount.fromRawAmount(
          this.pool.currency0,
          SqrtPriceMath.getAmount0Delta(
            TickMath.getSqrtRatioAtTick(this.tickLower),
            TickMath.getSqrtRatioAtTick(this.tickUpper),
            this.liquidity,
            false,
          ),
        )
      } else if (this.pool.tickCurrent < this.tickUpper) {
        this._token0Amount = Amount.fromRawAmount(
          this.pool.currency0,
          SqrtPriceMath.getAmount0Delta(
            this.pool.sqrtRatioX96,
            TickMath.getSqrtRatioAtTick(this.tickUpper),
            this.liquidity,
            false,
          ),
        )
      } else {
        this._token0Amount = Amount.fromRawAmount(this.pool.currency0, 0)
      }
    }
    return this._token0Amount
  }

  /**
   * Returns the amount of token1 that this position's liquidity could be burned for at the current pool price
   */
  public get amount1(): Amount<Type> {
    if (!this._token1Amount) {
      if (this.pool.tickCurrent < this.tickLower) {
        this._token1Amount = Amount.fromRawAmount(this.pool.currency1, 0)
      } else if (this.pool.tickCurrent < this.tickUpper) {
        this._token1Amount = Amount.fromRawAmount(
          this.pool.currency1,
          SqrtPriceMath.getAmount1Delta(
            TickMath.getSqrtRatioAtTick(this.tickLower),
            this.pool.sqrtRatioX96,
            this.liquidity,
            false,
          ),
        )
      } else {
        this._token1Amount = Amount.fromRawAmount(
          this.pool.currency1,
          SqrtPriceMath.getAmount1Delta(
            TickMath.getSqrtRatioAtTick(this.tickLower),
            TickMath.getSqrtRatioAtTick(this.tickUpper),
            this.liquidity,
            false,
          ),
        )
      }
    }
    return this._token1Amount
  }

  /**
   * Returns the lower and upper sqrt ratios if the price 'slips' up to slippage tolerance percentage
   * @param slippageTolerance The amount by which the price can 'slip' before the transaction will revert
   * @returns The sqrt ratios after slippage
   */
  private ratiosAfterSlippage(slippageTolerance: Percent): {
    sqrtRatioX96Lower: bigint
    sqrtRatioX96Upper: bigint
  } {
    const priceLower = this.pool.token0Price.asFraction.multiply(
      new Percent(1).subtract(slippageTolerance),
    )
    const priceUpper = this.pool.token0Price.asFraction.multiply(
      slippageTolerance.add(1),
    )
    let sqrtRatioX96Lower = encodeSqrtRatioX96(
      priceLower.numerator,
      priceLower.denominator,
    )
    if (sqrtRatioX96Lower <= TickMath.MIN_SQRT_RATIO) {
      sqrtRatioX96Lower = TickMath.MIN_SQRT_RATIO + 1n
    }
    let sqrtRatioX96Upper = encodeSqrtRatioX96(
      priceUpper.numerator,
      priceUpper.denominator,
    )
    if (sqrtRatioX96Upper >= TickMath.MAX_SQRT_RATIO) {
      sqrtRatioX96Upper = TickMath.MAX_SQRT_RATIO - 1n
    }
    return {
      sqrtRatioX96Lower,
      sqrtRatioX96Upper,
    }
  }

  /**
   * Returns the maximum amount of token0 and token1 that must be sent in order to safely mint the amount of liquidity held by the position
   * with the given slippage tolerance
   * @param slippageTolerance Tolerance of unfavorable slippage from the current price
   * @returns The amounts, with slippage
   * @dev In v4, minting and increasing is protected by maximum amounts of token0 and token1.
   */
  public mintAmountsWithSlippage(
    slippageTolerance: Percent,
  ): Readonly<{ amount0: bigint; amount1: bigint }> {
    // get lower/upper prices
    // these represent the lowest and highest prices that the pool is allowed to "slip" to
    const { sqrtRatioX96Upper, sqrtRatioX96Lower } =
      this.ratiosAfterSlippage(slippageTolerance)

    // construct counterfactual pools from the lower bounded price and the upper bounded price
    const poolLower = new SushiSwapV4Pool({
      currencyA: this.pool.currency0,
      currencyB: this.pool.currency1,
      fee: this.pool.fee,
      tickSpacing: this.pool.tickSpacing,
      hooks: this.pool.hooks,
      sqrtRatioX96: sqrtRatioX96Lower,
      liquidity: 0,
      tickCurrent: TickMath.getTickAtSqrtRatio(sqrtRatioX96Lower),
    })

    const poolUpper = new SushiSwapV4Pool({
      currencyA: this.pool.currency0,
      currencyB: this.pool.currency1,
      fee: this.pool.fee,
      tickSpacing: this.pool.tickSpacing,
      hooks: this.pool.hooks,
      sqrtRatioX96: sqrtRatioX96Upper,
      liquidity: 0,
      tickCurrent: TickMath.getTickAtSqrtRatio(sqrtRatioX96Upper),
    })

    // Note: Slippage derivation in v4 is different from v3.
    // When creating a position (minting) or adding to a position (increasing) slippage is bounded by the MAXIMUM amount in in token0 and token1.
    // The largest amount of token1 will happen when the price slips up, so we use the poolUpper to get amount1.
    // The largest amount of token0 will happen when the price slips down, so we use the poolLower to get amount0.
    // Ie...We want the larger amounts, which occurs at the upper price for amount1...
    const { amount1 } = new SushiSwapV4Position({
      pool: poolUpper,
      liquidity: this.liquidity, // The precise liquidity calculated offchain
      tickLower: this.tickLower,
      tickUpper: this.tickUpper,
    }).mintAmounts
    // ...and the lower for amount0
    const { amount0 } = new SushiSwapV4Position({
      pool: poolLower,
      liquidity: this.liquidity, // The precise liquidity calculated offchain
      tickLower: this.tickLower,
      tickUpper: this.tickUpper,
    }).mintAmounts

    return { amount0, amount1 }
  }

  /**
   * Returns the minimum amounts that should be requested in order to safely burn the amount of liquidity held by the
   * position with the given slippage tolerance
   * @param slippageTolerance tolerance of unfavorable slippage from the current price
   * @returns The amounts, with slippage
   */
  public burnAmountsWithSlippage(
    slippageTolerance: Percent,
  ): Readonly<{ amount0: bigint; amount1: bigint }> {
    // get lower/upper prices
    const { sqrtRatioX96Upper, sqrtRatioX96Lower } =
      this.ratiosAfterSlippage(slippageTolerance)

    // construct counterfactual pools
    const poolLower = new SushiSwapV4Pool({
      currencyA: this.pool.currency0,
      currencyB: this.pool.currency1,
      fee: this.pool.fee,
      tickSpacing: this.pool.tickSpacing,
      hooks: this.pool.hooks,
      sqrtRatioX96: sqrtRatioX96Lower,
      liquidity: 0,
      tickCurrent: TickMath.getTickAtSqrtRatio(sqrtRatioX96Lower),
    })
    const poolUpper = new SushiSwapV4Pool({
      currencyA: this.pool.currency0,
      currencyB: this.pool.currency1,
      fee: this.pool.fee,
      tickSpacing: this.pool.tickSpacing,
      hooks: this.pool.hooks,
      sqrtRatioX96: sqrtRatioX96Upper,
      liquidity: 0,
      tickCurrent: TickMath.getTickAtSqrtRatio(sqrtRatioX96Upper),
    })

    // we want the smaller amounts...
    // ...which occurs at the upper price for amount0...
    const amount0 = new SushiSwapV4Position({
      pool: poolUpper,
      liquidity: this.liquidity,
      tickLower: this.tickLower,
      tickUpper: this.tickUpper,
    }).amount0
    // ...and the lower for amount1
    const amount1 = new SushiSwapV4Position({
      pool: poolLower,
      liquidity: this.liquidity,
      tickLower: this.tickLower,
      tickUpper: this.tickUpper,
    }).amount1

    return { amount0: amount0.quotient, amount1: amount1.quotient }
  }

  /**
   * Returns the minimum amounts that must be sent in order to mint the amount of liquidity held by the position at
   * the current price for the pool
   */
  public get mintAmounts(): Readonly<{ amount0: bigint; amount1: bigint }> {
    if (this._mintAmounts === null) {
      if (this.pool.tickCurrent < this.tickLower) {
        return {
          amount0: SqrtPriceMath.getAmount0Delta(
            TickMath.getSqrtRatioAtTick(this.tickLower),
            TickMath.getSqrtRatioAtTick(this.tickUpper),
            this.liquidity,
            true,
          ),
          amount1: 0n,
        }
      } else if (this.pool.tickCurrent < this.tickUpper) {
        return {
          amount0: SqrtPriceMath.getAmount0Delta(
            this.pool.sqrtRatioX96,
            TickMath.getSqrtRatioAtTick(this.tickUpper),
            this.liquidity,
            true,
          ),
          amount1: SqrtPriceMath.getAmount1Delta(
            TickMath.getSqrtRatioAtTick(this.tickLower),
            this.pool.sqrtRatioX96,
            this.liquidity,
            true,
          ),
        }
      } else {
        return {
          amount0: 0n,
          amount1: SqrtPriceMath.getAmount1Delta(
            TickMath.getSqrtRatioAtTick(this.tickLower),
            TickMath.getSqrtRatioAtTick(this.tickUpper),
            this.liquidity,
            true,
          ),
        }
      }
    }
    return this._mintAmounts
  }

  //   /**
  //    * Returns the AllowanceTransferPermitBatch for adding liquidity to a position
  //    * @param slippageTolerance The amount by which the price can 'slip' before the transaction will revert
  //    * @param spender The spender of the permit (should usually be the PositionManager)
  //    * @param nonce A valid permit2 nonce
  //    * @param deadline The deadline for the permit
  //    */
  //   public permitBatchData(
  //     slippageTolerance: Percent,
  //     spender: string,
  //     nonce: BigintIsh,
  //     deadline: BigintIsh,
  //   ): AllowanceTransferPermitBatch {
  //     const { amount0, amount1 } = this.mintAmountsWithSlippage(slippageTolerance)
  //     return {
  //       details: [
  //         {
  //           token: this.pool.currency0.wrapped.address,
  //           amount: amount0,
  //           expiration: deadline,
  //           nonce: nonce,
  //         },
  //         {
  //           token: this.pool.currency1.wrapped.address,
  //           amount: amount1,
  //           expiration: deadline,
  //           nonce: nonce,
  //         },
  //       ],
  //       spender,
  //       sigDeadline: deadline,
  //     }
  //   }

  /**
   * Computes the maximum amount of liquidity received for a given amount of token0, token1,
   * and the prices at the tick boundaries.
   * @param pool The pool for which the position should be created
   * @param tickLower The lower tick of the position
   * @param tickUpper The upper tick of the position
   * @param amount0 token0 amountzw
   * @param amount1 token1 amount
   * @param useFullPrecision If false, liquidity will be maximized according to what the router can calculate,
   * not what core can theoretically support
   * @returns The amount of liquidity for the position
   */
  public static fromAmounts({
    pool,
    tickLower,
    tickUpper,
    amount0,
    amount1,
    useFullPrecision,
  }: {
    pool: SushiSwapV4Pool
    tickLower: number
    tickUpper: number
    amount0: BigintIsh
    amount1: BigintIsh
    useFullPrecision: boolean
  }) {
    const sqrtRatioAX96 = TickMath.getSqrtRatioAtTick(tickLower)
    const sqrtRatioBX96 = TickMath.getSqrtRatioAtTick(tickUpper)
    return new SushiSwapV4Position({
      pool,
      tickLower,
      tickUpper,
      liquidity: maxLiquidityForAmounts(
        pool.sqrtRatioX96,
        sqrtRatioAX96,
        sqrtRatioBX96,
        amount0,
        amount1,
        useFullPrecision,
      ),
    })
  }

  /**
   * Computes a position with the maximum amount of liquidity received for a given amount of token0, assuming an unlimited amount of token1
   * @param pool The pool for which the position is created
   * @param tickLower The lower tick
   * @param tickUpper The upper tick
   * @param amount0 The desired amount of token0
   * @param useFullPrecision If true, liquidity will be maximized according to what the router can calculate,
   * not what core can theoretically support
   * @returns The position
   */
  public static fromAmount0({
    pool,
    tickLower,
    tickUpper,
    amount0,
    useFullPrecision,
  }: {
    pool: SushiSwapV4Pool
    tickLower: number
    tickUpper: number
    amount0: BigintIsh
    useFullPrecision: boolean
  }) {
    return SushiSwapV4Position.fromAmounts({
      pool,
      tickLower,
      tickUpper,
      amount0,
      amount1: MaxUint256,
      useFullPrecision,
    })
  }

  /**
   * Computes a position with the maximum amount of liquidity received for a given amount of token1, assuming an unlimited amount of token0
   * @param pool The pool for which the position is created
   * @param tickLower The lower tick
   * @param tickUpper The upper tick
   * @param amount1 The desired amount of token1
   * @returns The position
   */
  public static fromAmount1({
    pool,
    tickLower,
    tickUpper,
    amount1,
  }: {
    pool: SushiSwapV4Pool
    tickLower: number
    tickUpper: number
    amount1: BigintIsh
  }) {
    // this function always uses full precision,
    return SushiSwapV4Position.fromAmounts({
      pool,
      tickLower,
      tickUpper,
      amount0: MaxUint256,
      amount1,
      useFullPrecision: true,
    })
  }
}
