'use client'

import { RadioGroup } from '@headlessui/react'
import { ChevronRightIcon } from '@heroicons/react-v1/solid'
import {
  Button,
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Chip,
  FormSection,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  LinkInternal,
  Switch,
  TextField,
  Toggle,
  classNames,
} from '@sushiswap/ui'
import { Dots } from '@sushiswap/ui'
import React, { type FC, memo, useMemo, useState } from 'react'
import { useV4PoolsByTokenPair } from 'src/lib/hooks/react-query/pools/useV4PoolsByTokenPair'
import { DYNAMIC_FEE_FLAG, type SushiSwapV4ChainId } from 'src/lib/pool/v4'
import { SushiSwapV3FeeAmount } from 'sushi/config'
import type { Type } from 'sushi/currency'

export const FEE_OPTIONS = [
  {
    value: SushiSwapV3FeeAmount.LOWEST,
    subtitle: 'Best for very stable pairs.',
  },
  {
    value: SushiSwapV3FeeAmount.LOW,
    subtitle: 'Best for less volatile pairs.',
  },
  {
    value: SushiSwapV3FeeAmount.MEDIUM,
    subtitle: 'Best for most pairs.',
  },
  {
    value: SushiSwapV3FeeAmount.HIGH,
    subtitle: 'Best for volatile pairs.',
  },
]

interface SelectFeeConcentratedWidgetV4 {
  feeAmount: number | undefined
  setFeeAmount: (fee: number) => void
  tickSpacing: number | undefined
  setTickSpacing: (tickSpacing: number) => void
  chainId: SushiSwapV4ChainId
  token0: Type | undefined
  token1: Type | undefined
  title?: string
  disableIfNotExists?: boolean
}

export const SelectFeeConcentratedWidgetV4: FC<SelectFeeConcentratedWidgetV4> =
  memo(function SelectFeeWidget({
    feeAmount,
    setFeeAmount,
    tickSpacing,
    setTickSpacing,
    chainId,
    token0,
    token1,
    disableIfNotExists = false,
  }) {
    const [customFeeEnabled, setCustomFeeEnabled] = useState<boolean>(
      Boolean(
        feeAmount && !Object.values(SushiSwapV3FeeAmount).includes(feeAmount),
      ),
    )

    const { data: pools, isLoading } = useV4PoolsByTokenPair(
      chainId,
      token0?.id,
      token1?.id,
    )

    const tvlDistribution = useMemo(() => {
      const tvlDistribution = new Map<
        (typeof FEE_OPTIONS)[number]['value'],
        number
      >()

      if (!pools) return tvlDistribution

      const totalTvl = pools?.reduce(
        (acc, pool) => acc + Number(pool.liquidityUSD),
        0,
      )

      pools?.forEach((pool) => {
        const feeOption = FEE_OPTIONS.find(
          (option) => option.value / 1_000_000 === pool.swapFee,
        )
        if (!feeOption) return

        const tvlShare = pool.liquidityUSD / totalTvl
        if (Number.isNaN(tvlShare)) return
        tvlDistribution.set(feeOption.value, tvlShare)
      })

      return tvlDistribution
    }, [pools])

    return (
      <FormSection
        title="Fee tier"
        description="Some fee tiers work better than others depending on the volatility of your pair. Lower fee tiers generally work better when pairing stable coins. Higher fee tiers generally work better when pairing exotic coins."
      >
        <div
          className={classNames(
            !token0 || !token1 ? 'opacity-40' : '',
            'flex flex-col gap-4',
          )}
        >
          <RadioGroup
            value={feeAmount}
            onChange={setFeeAmount}
            className="grid grid-cols-2 gap-4"
            disabled={!token0 || !token1}
          >
            {FEE_OPTIONS.map((option, i) =>
              disableIfNotExists && !tvlDistribution.get(option.value) ? (
                <HoverCard key={i} openDelay={0} closeDelay={0}>
                  <HoverCardTrigger>
                    <Card className="opacity-40">
                      <CardHeader>
                        <CardTitle>
                          <span className="flex flex-wrap items-center gap-2">
                            <span>{option.value / 10000}% Fees</span>
                            {tvlDistribution.get(option.value) && (
                              <Chip variant="secondary">
                                {isLoading ? (
                                  <Dots />
                                ) : (
                                  `${(
                                    tvlDistribution.get(option.value)! * 100
                                  )?.toFixed(0)}% Selected`
                                )}
                              </Chip>
                            )}
                          </span>
                        </CardTitle>
                        <CardDescription>{option.subtitle}</CardDescription>
                      </CardHeader>
                    </Card>
                  </HoverCardTrigger>
                  <HoverCardContent className="!p-0">
                    <CardHeader>
                      <CardTitle>Pool doesnt exist yet.</CardTitle>
                      <CardDescription>
                        A pool for this fee tier {`doesn't`} exist yet. <br />{' '}
                        Anyone can create a pool. Want to
                        <br />
                        create this pool first?
                      </CardDescription>
                    </CardHeader>
                    {token0 && token1 ? (
                      <CardFooter>
                        <Button
                          asChild
                          icon={ChevronRightIcon}
                          size="sm"
                          variant="secondary"
                        >
                          <LinkInternal
                            href={`/pool/add?chainId=${
                              token0.chainId
                            }&feeAmount=${option.value}&fromCurrency=${
                              token0.isNative
                                ? 'NATIVE'
                                : token0.wrapped.address
                            }&toCurrency=${
                              token1.isNative
                                ? 'NATIVE'
                                : token1.wrapped.address
                            }`}
                          >
                            Create Pool
                          </LinkInternal>
                        </Button>
                      </CardFooter>
                    ) : null}
                  </HoverCardContent>
                </HoverCard>
              ) : (
                <Toggle
                  pressed={!customFeeEnabled && feeAmount === option.value}
                  onClick={() => setFeeAmount(option.value)}
                  asChild
                  key={i}
                  testdata-id={`fee-option-${option.value}`}
                  className="!h-[unset] !w-[unset] !p-0 !text-left !justify-start cursor-pointer dark:data-[state=on]:bg-secondary"
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        <span className="flex flex-wrap items-center gap-2">
                          <span>{option.value / 10000}% Fees</span>
                          {tvlDistribution.get(option.value) && (
                            <Chip variant="secondary">
                              {isLoading ? (
                                <Dots />
                              ) : (
                                `${(
                                  tvlDistribution.get(option.value)! * 100
                                )?.toFixed(0)}% Selected`
                              )}
                            </Chip>
                          )}
                        </span>
                      </CardTitle>
                      <CardDescription>{option.subtitle}</CardDescription>
                    </CardHeader>
                  </Card>
                </Toggle>
              ),
            )}
          </RadioGroup>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Switch
                testdata-id="toggle-zap-enabled"
                checked={customFeeEnabled}
                disabled={!token0 || !token1}
                onCheckedChange={() => {
                  if (customFeeEnabled) {
                    setFeeAmount(SushiSwapV3FeeAmount.MEDIUM)
                  }
                  setCustomFeeEnabled(!customFeeEnabled)
                }}
              />
              <span className="text-sm">Use a custom fee</span>
            </div>
            {customFeeEnabled ? (
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>LP Fee Amount</CardTitle>
                    <CardDescription>
                      <TextField
                        disabled={!token0 || !token1}
                        placeholder={'100'}
                        maxDecimals={0}
                        type="number"
                        value={feeAmount}
                        onValueChange={(value) => setFeeAmount(+value)}
                      />
                    </CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Tick Spacing</CardTitle>
                    <CardDescription>
                      <TextField
                        disabled={!token0 || !token1}
                        placeholder={'1'}
                        maxDecimals={0}
                        type="number"
                        value={tickSpacing}
                        onValueChange={(value) => setTickSpacing(+value)}
                      />
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            ) : null}
          </div>
        </div>
      </FormSection>
    )
  })
