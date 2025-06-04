'use client'

import { Cog6ToothIcon } from '@heroicons/react/24/outline'
import { SlippageToleranceStorageKey, TTLStorageKey } from '@sushiswap/hooks'
import {
  Card,
  CardContent,
  CardCurrencyAmountItem,
  CardDescription,
  CardGroup,
  CardHeader,
  CardItem,
  CardLabel,
  CardTitle,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  IconButton,
  Separator,
  SettingsModule,
  SettingsOverlay,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Toggle,
  WidgetAction,
  classNames,
} from '@sushiswap/ui'
import { FormattedNumber } from '@sushiswap/ui'
import { SkeletonText } from '@sushiswap/ui'
import { type FC, useMemo, useState } from 'react'
import type { SushiSwapV4ChainId } from 'src/lib/pool/v4'
import { useConcentratedPositionInfoV4 } from 'src/lib/wagmi/hooks/positions/hooks/useConcentratedPositionInfoV4'
import { useConcentratedLiquidityPositionsFromTokenIdV4 } from 'src/lib/wagmi/hooks/positions/hooks/useConcentratedPositionsFromTokenIdV4'
import { useTokenWithCache } from 'src/lib/wagmi/hooks/tokens/useTokenWithCache'
import { getDefaultTTL } from 'src/lib/wagmi/hooks/utils/hooks/useTransactionDeadline'
import { Amount, Native, unwrapToken } from 'sushi/currency'
import { formatPercent, formatUSD } from 'sushi/format'
import { zeroAddress } from 'viem'
import { useAccount } from 'wagmi'
import { Bound } from '../../lib/constants'
import {
  formatTickPrice,
  getPriceOrderingFromPositionForUI,
} from '../../lib/functions'
import { usePriceInverter, useTokenAmountDollarValues } from '../../lib/hooks'
import { useIsTickAtLimit } from '../../lib/pool/v4'
import { ConcentratedLiquidityCollectWidgetV4 } from './ConcentratedLiquidityCollectWidgetV4'
import {
  ConcentratedLiquidityProviderV4,
  useConcentratedDerivedMintInfoV4,
} from './ConcentratedLiquidityProviderV4'
import { ConcentratedLiquidityRemoveWidgetV4 } from './ConcentratedLiquidityRemoveWidgetV4'
import { ConcentratedLiquidityWidgetV4 } from './ConcentratedLiquidityWidgetV4'

const Component: FC<{ chainId: string; id: string; position: string }> = ({
  chainId: _chainId,
  position: tokenId,
}) => {
  const { address } = useAccount()
  const chainId = Number(_chainId) as SushiSwapV4ChainId
  const [invert, setInvert] = useState(false)

  const { data: positionDetails, isLoading: _isPositionDetailsLoading } =
    useConcentratedLiquidityPositionsFromTokenIdV4({
      chainId,
      tokenId,
    })

  const { data: _token0, isLoading: _isToken0Loading } = useTokenWithCache({
    chainId,
    address: positionDetails?.currency0,
    enabled: positionDetails?.currency0 !== zeroAddress,
  })
  const { data: _token1, isLoading: _isToken1Loading } = useTokenWithCache({
    chainId,
    address: positionDetails?.currency1,
    enabled: positionDetails?.currency1 !== zeroAddress,
  })

  const currency0 = useMemo(() => {
    return positionDetails?.currency0 === zeroAddress
      ? Native.onChain(chainId)
      : _token0
  }, [chainId, positionDetails?.currency0, _token0])

  const currency1 = useMemo(() => {
    return positionDetails?.currency1 === zeroAddress
      ? Native.onChain(chainId)
      : _token1
  }, [chainId, positionDetails?.currency1, _token1])

  const isCurrency0Loading =
    positionDetails?.currency0 !== zeroAddress && _isToken0Loading
  const isCurrency1Loading =
    positionDetails?.currency1 !== zeroAddress && _isToken1Loading

  const { data: position, isInitialLoading: isPositionLoading } =
    useConcentratedPositionInfoV4({
      chainId,
      token0: currency0,
      token1: currency1,
      tokenId,
    })

  const pricesFromPosition = position
    ? getPriceOrderingFromPositionForUI(position)
    : undefined

  const { pool, outOfRange } = useConcentratedDerivedMintInfoV4({
    chainId,
    account: address,
    currency0,
    currency1,
    baseCurrency: currency0,
    poolKey: positionDetails?.poolKey,
    existingPosition: position ?? undefined,
  })

  const [_currency0, _currency1] = useMemo(
    () => [
      currency0 ? unwrapToken(currency0) : undefined,
      currency1 ? unwrapToken(currency1) : undefined,
    ],
    [currency0, currency1],
  )

  const amounts = useMemo(() => {
    if (positionDetails?.fees && _token0 && _token1)
      return [
        Amount.fromRawAmount(_token0, BigInt(positionDetails.fees[0])),
        Amount.fromRawAmount(_token1, BigInt(positionDetails.fees[1])),
      ]

    return [undefined, undefined]
  }, [_token0, _token1, positionDetails])

  const { priceLower, priceUpper, base } = usePriceInverter({
    priceLower: pricesFromPosition?.priceLower,
    priceUpper: pricesFromPosition?.priceUpper,
    quote: pricesFromPosition?.quote,
    base: pricesFromPosition?.base,
    invert,
  })

  const tickAtLimit = useIsTickAtLimit(
    positionDetails?.poolKey.parameters.tickSpacing,
    position?.tickLower,
    position?.tickUpper,
  )

  const inverted = currency1 ? base?.equals(currency1) : undefined
  const currencyQuote = inverted ? currency0 : currency1
  const currencyBase = inverted ? currency1 : currency0
  const below =
    pool && position && true ? pool.tickCurrent < position.tickLower : undefined
  const above =
    pool && position && true
      ? pool.tickCurrent >= position.tickUpper
      : undefined
  const inRange =
    typeof below === 'boolean' && typeof above === 'boolean'
      ? !below && !above
      : false
  const fullRange = Boolean(
    tickAtLimit[Bound.LOWER] && tickAtLimit[Bound.UPPER],
  )

  // const { data: owner } = useConcentratedPositionOwnerV3({ chainId, tokenId })

  // const { data: rewardsData, isLoading: isRewardsLoading } =
  //   useClaimableRewards({
  //     chainIds: isMerklChainId(chainId) ? [chainId] : [],
  //     account: owner,
  //     enabled: isMerklChainId(chainId),
  //   })
  // const { data: campaignsData, isLoading: isCampaignsLoading } =
  //   useRewardCampaigns({
  //     // pool: pooAlAddress as Address,
  //     pool: undefined,
  //     chainId,
  //     enabled: isMerklChainId(chainId),
  //   })

  // const [activeCampaigns, inactiveCampaigns] = useMemo(() => {
  //   const activeCampaigns: typeof campaignsData = []
  //   const inactiveCampaigns: typeof campaignsData = []

  //   campaignsData?.forEach((campaign) => {
  //     if (campaign.isLive) activeCampaigns.push(campaign)
  //     else inactiveCampaigns.push(campaign)
  //   })

  //   return [activeCampaigns, inactiveCampaigns]
  // }, [campaignsData])

  const fiatValuesAmounts = useTokenAmountDollarValues({ chainId, amounts })
  const positionAmounts = useMemo(
    () => [position?.amount0, position?.amount1],
    [position],
  )
  const fiatValuesPosition = useTokenAmountDollarValues({
    chainId,
    amounts: positionAmounts,
  })

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Manage</CardTitle>
                <CardDescription>
                  Manage your concentrated liquidity position.
                </CardDescription>
              </CardHeader>
              <Tabs className="w-full" defaultValue="add">
                <CardContent>
                  <TabsList className="!flex">
                    <TabsTrigger
                      testdata-id="add-tab"
                      value="add"
                      className="flex flex-1"
                    >
                      Add
                    </TabsTrigger>
                    <TabsTrigger
                      testdata-id="remove-tab"
                      value="remove"
                      className="flex flex-1"
                    >
                      Remove
                    </TabsTrigger>
                    <TabsTrigger
                      testdata-id="fees-tab"
                      value="fees"
                      className="flex flex-1"
                    >
                      Fees
                    </TabsTrigger>
                    {/* {isMerklChainId(chainId) ? (
                      <TabsTrigger
                        testdata-id="rewards-tab"
                        value="rewards"
                        className="flex flex-1"
                      >
                        Rewards
                      </TabsTrigger>
                    ) : null} */}
                  </TabsList>
                </CardContent>
                <div className="px-6">
                  <Separator />
                </div>
                <TabsContent value="add">
                  <CardContent className="relative">
                    <CardHeader className="px-0 pb-0">
                      <CardTitle>Add liquidity</CardTitle>
                      <CardDescription>
                        Provide liquidity to earn fees & rewards.
                      </CardDescription>
                      <WidgetAction>
                        <SettingsOverlay
                          options={{
                            slippageTolerance: {
                              storageKey:
                                SlippageToleranceStorageKey.AddLiquidity,
                              title: 'Add Liquidity Slippage',
                            },
                            transactionDeadline: {
                              storageKey: TTLStorageKey.AddLiquidity,
                              defaultValue: getDefaultTTL(chainId).toString(),
                            },
                          }}
                          modules={[
                            SettingsModule.CustomTokens,
                            SettingsModule.SlippageTolerance,
                            SettingsModule.TransactionDeadline,
                          ]}
                        >
                          <IconButton
                            size="sm"
                            name="Settings"
                            icon={Cog6ToothIcon}
                            variant="secondary"
                          />
                        </SettingsOverlay>
                      </WidgetAction>
                    </CardHeader>
                    <ConcentratedLiquidityWidgetV4
                      withTitleAndDescription={false}
                      chainId={chainId}
                      account={address}
                      token0={_currency0}
                      token1={_currency1}
                      poolKey={positionDetails?.poolKey}
                      tokensLoading={isCurrency0Loading || isCurrency1Loading}
                      existingPosition={position ?? undefined}
                      tokenId={tokenId}
                    />
                  </CardContent>
                </TabsContent>
                <TabsContent value="remove">
                  <CardHeader>
                    <CardTitle>Remove liquidity</CardTitle>
                    <CardDescription>
                      Please enter how much of the position you want to remove.
                    </CardDescription>
                  </CardHeader>
                  <ConcentratedLiquidityRemoveWidgetV4
                    token0={_currency0}
                    token1={_currency1}
                    account={address}
                    chainId={chainId}
                    position={position ?? undefined}
                    positionDetails={positionDetails}
                  />
                </TabsContent>
                <TabsContent value="fees">
                  <CardHeader>
                    <CardTitle>Unclaimed fees</CardTitle>
                    <CardDescription>
                      {formatUSD(fiatValuesAmounts[0] + fiatValuesAmounts[1])}
                    </CardDescription>
                  </CardHeader>
                  <ConcentratedLiquidityCollectWidgetV4
                    position={position ?? undefined}
                    positionDetails={positionDetails}
                    token0={_currency0}
                    token1={_currency1}
                    chainId={chainId}
                    isLoading={isPositionLoading}
                    address={address}
                    amounts={amounts}
                    fiatValuesAmounts={fiatValuesAmounts}
                  />
                </TabsContent>
                {/* {isMerklChainId(chainId) ? (
                  <TabsContent value="rewards">
                    <CardHeader>
                      <CardTitle>Unclaimed rewards</CardTitle>
                      <CardDescription>
                        This will claim your rewards for <b>every</b> V3
                        liquidity position on {EvmChain.from(chainId)?.name}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <CardGroup>
                        <CardLabel>
                          Tokens (accrued over all positions)
                        </CardLabel>
                        {isRewardsLoading || isPositionLoading ? (
                          <CardItem skeleton />
                        ) : rewardsData?.[chainId] &&
                          positionDetails &&
                          Object.values(rewardsData[chainId].rewardAmounts)
                            .length > 0 ? (
                          Object.values(rewardsData[chainId].rewardAmounts).map(
                            (el) => (
                              <CardCurrencyAmountItem
                                key={el.currency.id}
                                amount={el}
                              />
                            ),
                          )
                        ) : (
                          <CardItem title="No rewards found" />
                        )}
                      </CardGroup>
                    </CardContent>
                    <CardFooter>
                      {rewardsData?.[chainId] ? (
                        <Checker.Connect size="default" fullWidth>
                          <Checker.Network
                            size="default"
                            fullWidth
                            chainId={chainId}
                          >
                            <ClaimRewardsButton
                              rewards={rewardsData[chainId]}
                            />
                          </Checker.Network>
                        </Checker.Connect>
                      ) : (
                        <Button
                          size="default"
                          fullWidth
                          loading={isRewardsLoading}
                          disabled={!isRewardsLoading}
                        >
                          Claim
                        </Button>
                      )}
                    </CardFooter>
                  </TabsContent>
                ) : null} */}
              </Tabs>
            </Card>
          </div>
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  Position Details
                  <div
                    className={classNames(
                      !inRange ? 'bg-yellow/10' : 'bg-green/10',
                      'px-2 py-1 flex items-center gap-1 rounded-full',
                    )}
                  >
                    <div
                      className={classNames(
                        outOfRange ? 'bg-yellow' : 'bg-green',
                        'w-3 h-3 rounded-full',
                      )}
                    />
                    {outOfRange ? (
                      <span className="text-xs font-medium text-yellow-900 dark:text-yellow">
                        Out of Range
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-green">
                        In Range
                      </span>
                    )}
                  </div>
                </CardTitle>
                <CardDescription>
                  {formatUSD(
                    fiatValuesPosition.reduce((acc, cur) => acc + cur, 0),
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CardGroup>
                  <CardLabel>Tokens</CardLabel>
                  <CardCurrencyAmountItem
                    isLoading={isPositionLoading}
                    amount={position?.amount0}
                    fiatValue={formatUSD(fiatValuesPosition[0])}
                  />
                  <CardCurrencyAmountItem
                    isLoading={isPositionLoading}
                    amount={position?.amount1}
                    fiatValue={formatUSD(fiatValuesPosition[1])}
                  />
                </CardGroup>
                <CardGroup>
                  <CardLabel>Current price</CardLabel>
                  {pool && currencyBase && currencyQuote ? (
                    <CardItem
                      title={
                        <>
                          1 {unwrapToken(currencyBase)?.symbol} ={' '}
                          <FormattedNumber
                            number={(inverted
                              ? pool?.token1Price
                              : pool?.token0Price
                            )?.toSignificant(6)}
                          />{' '}
                          {unwrapToken(currencyQuote)?.symbol}
                        </>
                      }
                    >
                      <div className="flex items-center gap-1">
                        <Toggle
                          pressed={invert}
                          onClick={() => setInvert(true)}
                          size="xs"
                          variant="outline"
                        >
                          {_token0?.symbol}
                        </Toggle>
                        <Toggle
                          pressed={!invert}
                          onClick={() => setInvert(false)}
                          size="xs"
                          variant="outline"
                        >
                          {_token1?.symbol}
                        </Toggle>
                      </div>
                    </CardItem>
                  ) : (
                    <SkeletonText fontSize="sm" />
                  )}
                </CardGroup>
                <div className="grid grid-cols-2 gap-3">
                  <div className="border border-accent p-4 flex flex-col gap-3 rounded-xl">
                    <div className="flex">
                      <div className="gap-1 px-2 py-1 text-xs font-medium rounded-full bg-pink/10 text-pink">
                        Min Price
                      </div>
                    </div>
                    <div className="flex flex-col">
                      {pool && currencyBase && currencyQuote ? (
                        <span className="font-medium">
                          {fullRange ? (
                            '0'
                          ) : (
                            <>
                              <FormattedNumber
                                number={formatTickPrice({
                                  price: priceLower,
                                  atLimit: tickAtLimit,
                                  direction: Bound.LOWER,
                                })}
                              />{' '}
                              {unwrapToken(currencyQuote)?.symbol}{' '}
                              <HoverCard closeDelay={0} openDelay={0}>
                                <HoverCardTrigger asChild>
                                  <span className="text-sm underline decoration-dotted underline-offset-2 text-muted-foreground font-normal">
                                    (
                                    {formatPercent(
                                      priceLower
                                        ?.subtract(
                                          inverted
                                            ? pool.token1Price
                                            : pool.token0Price,
                                        )
                                        .divide(
                                          inverted
                                            ? pool.token1Price
                                            : pool.token0Price,
                                        )
                                        .toSignificant(4),
                                    )}
                                    )
                                  </span>
                                </HoverCardTrigger>
                                <HoverCardContent className="!p-0 max-w-[320px]">
                                  <CardHeader>
                                    <CardTitle>Min. Price</CardTitle>
                                    <CardDescription>
                                      If the current price moves down{' '}
                                      {formatPercent(
                                        priceLower
                                          ?.subtract(
                                            inverted
                                              ? pool.token1Price
                                              : pool.token0Price,
                                          )
                                          .divide(
                                            inverted
                                              ? pool.token1Price
                                              : pool.token0Price,
                                          )
                                          .toSignificant(4),
                                      )}{' '}
                                      from the current price, your position will
                                      be 100% {unwrapToken(currencyBase).symbol}
                                    </CardDescription>
                                  </CardHeader>
                                </HoverCardContent>
                              </HoverCard>
                            </>
                          )}
                        </span>
                      ) : (
                        <SkeletonText />
                      )}
                    </div>
                    {currencyBase && (
                      <span className="text-xs text-slate-500">
                        Your position will be 100%{' '}
                        {unwrapToken(currencyBase).symbol} at this price.
                      </span>
                    )}
                  </div>
                  <div className="border border-accent p-4 flex flex-col gap-3 rounded-xl">
                    <div className="flex">
                      <div className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-blue/10 text-blue">
                        Max Price
                      </div>
                    </div>
                    <div className="flex flex-col">
                      {priceUpper && pool && currencyQuote && currencyBase ? (
                        <span className="font-medium">
                          {fullRange ? (
                            '∞'
                          ) : (
                            <>
                              <FormattedNumber
                                number={formatTickPrice({
                                  price: priceUpper,
                                  atLimit: tickAtLimit,
                                  direction: Bound.UPPER,
                                })}
                              />{' '}
                              {unwrapToken(currencyQuote)?.symbol}{' '}
                              <HoverCard closeDelay={0} openDelay={0}>
                                <HoverCardTrigger asChild>
                                  <span className="text-sm underline decoration-dotted underline-offset-2 text-muted-foreground font-normal">
                                    (
                                    {formatPercent(
                                      priceUpper
                                        ?.subtract(
                                          inverted
                                            ? pool.token1Price
                                            : pool.token0Price,
                                        )
                                        .divide(
                                          inverted
                                            ? pool.token1Price
                                            : pool.token0Price,
                                        )
                                        .toSignificant(4),
                                    )}
                                    )
                                  </span>
                                </HoverCardTrigger>
                                <HoverCardContent className="!p-0 max-w-[320px]">
                                  <CardHeader>
                                    <CardTitle>Max. Price</CardTitle>
                                    <CardDescription>
                                      If the current price moves up +
                                      {formatPercent(
                                        priceUpper
                                          ?.subtract(
                                            inverted
                                              ? pool.token1Price
                                              : pool.token0Price,
                                          )
                                          .divide(
                                            inverted
                                              ? pool.token1Price
                                              : pool.token0Price,
                                          )
                                          .toSignificant(4),
                                      )}{' '}
                                      from the current price, your position will
                                      be 100%{' '}
                                      {unwrapToken(currencyQuote).symbol}
                                    </CardDescription>
                                  </CardHeader>
                                </HoverCardContent>
                              </HoverCard>
                            </>
                          )}
                        </span>
                      ) : (
                        <SkeletonText />
                      )}
                    </div>
                    {currencyQuote && (
                      <span className="text-xs text-slate-500">
                        Your position will be 100%{' '}
                        {unwrapToken(currencyQuote).symbol} at this price.
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        {/* {isMerklChainId(chainId) ? (
          <>
            <div className="py-4">
              <Separator />
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Reward distributions</CardTitle>
                <CardDescription>
                  Anyone can add distributions to this pool.{' '}
                  {_token0 && _token1 ? (
                    <LinkInternal
                      href={`/${
                        EvmChainKey[chainId]
                      }/pool/incentivize?fromCurrency=${
                        _token0.isNative ? 'NATIVE' : _token0.address
                      }&toCurrency=${
                        _token1.isNative ? 'NATIVE' : _token1.address
                      }&feeAmount=${positionDetails?.fee}`}
                    >
                      <Button asChild variant="link">
                        Want to add one?
                      </Button>
                    </LinkInternal>
                  ) : null}
                </CardDescription>
              </CardHeader>
              <Tabs className="w-full" defaultValue="active">
                <CardContent>
                  <TabsList className="!flex">
                    <TabsTrigger value="active" className="flex flex-1">
                      Active
                    </TabsTrigger>
                    <TabsTrigger value="inactive" className="flex flex-1">
                      Upcoming & Expired
                    </TabsTrigger>
                  </TabsList>
                </CardContent>
                <TabsContent value="active">
                  <DistributionDataTable
                    isLoading={isCampaignsLoading}
                    data={activeCampaigns}
                  />
                </TabsContent>
                <TabsContent value="inactive">
                  <DistributionDataTable
                    isLoading={isCampaignsLoading}
                    data={inactiveCampaigns}
                  />
                </TabsContent>
              </Tabs>
            </Card>
          </>
        ) : null} */}
      </div>
    </>
  )
}

export const V4PositionView = ({
  params: { chainId, id, position },
}: { params: { chainId: string; id: string; position: string } }) => {
  return (
    <ConcentratedLiquidityProviderV4>
      <Component chainId={chainId} id={id} position={position} />
    </ConcentratedLiquidityProviderV4>
  )
}
