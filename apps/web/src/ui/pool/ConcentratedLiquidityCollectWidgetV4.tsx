'use client'

import {
  CardContent,
  CardCurrencyAmountItem,
  CardFooter,
  CardGroup,
  CardLabel,
  Switch,
} from '@sushiswap/ui'
import { Button } from '@sushiswap/ui'
import { type FC, useMemo, useState } from 'react'
import type { SushiSwapV4Position } from 'src/lib/pool/v4'
import type { ConcentratedLiquidityPositionV4 } from 'src/lib/wagmi/hooks/positions/types'
import { Checker } from 'src/lib/wagmi/systems/Checker'
import type { Address, EvmChainId } from 'sushi'
import { Amount, Native, type Type, unwrapToken } from 'sushi/currency'
import { formatUSD } from 'sushi/format'
import { ConcentratedLiquidityCollectButtonV4 } from './ConcentratedLiquidityCollectButtonV4'

interface ConcentratedLiquidityCollectWidgetV4 {
  position: SushiSwapV4Position | undefined
  positionDetails: ConcentratedLiquidityPositionV4 | undefined
  token0: Type | undefined
  token1: Type | undefined
  chainId: EvmChainId
  isLoading: boolean
  address: Address | undefined
  amounts: undefined[] | Amount<Type>[]
  fiatValuesAmounts: number[]
}

export const ConcentratedLiquidityCollectWidgetV4: FC<
  ConcentratedLiquidityCollectWidgetV4
> = ({
  position,
  positionDetails,
  token0,
  token1,
  chainId,
  isLoading,
  address,
  amounts,
  fiatValuesAmounts,
}) => {
  const [receiveWrapped, setReceiveWrapped] = useState(false)
  const nativeToken = useMemo(() => Native.onChain(chainId), [chainId])

  const positionHasNativeToken = useMemo(() => {
    if (!nativeToken || !token0 || !token1) return false
    return (
      token0.isNative ||
      token1.isNative ||
      token0.address === nativeToken?.wrapped?.address ||
      token1.address === nativeToken?.wrapped?.address
    )
  }, [token0, token1, nativeToken])

  const expectedAmount0 = useMemo(() => {
    const expectedToken0 =
      !token0 || receiveWrapped ? token0?.wrapped : unwrapToken(token0)
    if (amounts[0] === undefined || !expectedToken0) return undefined
    return Amount.fromRawAmount(expectedToken0, amounts[0].quotient)
  }, [token0, receiveWrapped, amounts])

  const expectedAmount1 = useMemo(() => {
    const expectedToken1 =
      !token1 || receiveWrapped ? token1?.wrapped : unwrapToken(token1)
    if (amounts[1] === undefined || !expectedToken1) return undefined
    return Amount.fromRawAmount(expectedToken1, amounts[1].quotient)
  }, [token1, receiveWrapped, amounts])

  return (
    <>
      <CardContent>
        <CardGroup>
          <CardLabel>Tokens</CardLabel>
          <CardCurrencyAmountItem
            amount={expectedAmount0}
            isLoading={isLoading}
            fiatValue={formatUSD(fiatValuesAmounts[0])}
            unwrap={false}
          />
          <CardCurrencyAmountItem
            amount={expectedAmount1}
            isLoading={isLoading}
            fiatValue={formatUSD(fiatValuesAmounts[1])}
            unwrap={false}
          />
        </CardGroup>
        {positionHasNativeToken ? (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {`Receive ${nativeToken.wrapped.symbol} instead of ${nativeToken.symbol}`}
            </span>
            <Switch
              checked={receiveWrapped}
              onCheckedChange={setReceiveWrapped}
            />
          </div>
        ) : null}
      </CardContent>
      <CardFooter>
        <ConcentratedLiquidityCollectButtonV4
          position={position ?? undefined}
          positionDetails={positionDetails}
          token0={expectedAmount0?.currency}
          token1={expectedAmount1?.currency}
          account={address}
          chainId={chainId}
          receiveWrapped={receiveWrapped}
        >
          {({ send, isPending }) => (
            <Checker.Connect fullWidth>
              <Checker.Network fullWidth chainId={chainId}>
                {(positionDetails?.tokensOwed0 ?? 0n) === 0n &&
                (positionDetails?.tokensOwed1 ?? 0n) === 0n ? (
                  <Button fullWidth size="xl" disabled>
                    No fees to claim
                  </Button>
                ) : (
                  <Button
                    fullWidth
                    size="xl"
                    disabled={isPending}
                    onClick={send}
                  >
                    Collect
                  </Button>
                )}
              </Checker.Network>
            </Checker.Connect>
          )}
        </ConcentratedLiquidityCollectButtonV4>
      </CardFooter>
    </>
  )
}
