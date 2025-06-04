'use client'

import type { V4Pool } from '@sushiswap/graph-client/v4'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
} from '@sushiswap/ui'
import React, { type FC, useMemo, useState } from 'react'
import type { PoolKey, SushiSwapV4ChainId } from 'src/lib/pool/v4'
import { ChainKey } from 'sushi'
import { Native, Token } from 'sushi/currency'
import { type Hex, zeroAddress } from 'viem'
import { useAccount } from 'wagmi'
import { ConcentratedLiquidityWidgetV4 } from './ConcentratedLiquidityWidgetV4'
import { SelectPricesWidgetV4 } from './SelectPricesWidgetV4'

interface NewPositionProps {
  id: Hex
  chainId: SushiSwapV4ChainId
  poolKey: PoolKey
  currency0: V4Pool['token0']
  currency1: V4Pool['token1']
}

export const NewPositionV4: FC<NewPositionProps> = ({
  id,
  poolKey,
  chainId,
  currency0,
  currency1,
}) => {
  const { address: account } = useAccount()

  const [invertTokens, setInvertTokens] = useState(false)
  const [_token0, _token1] = useMemo(() => {
    const tokens = [
      currency0.address === zeroAddress
        ? Native.onChain(currency0.chainId)
        : new Token(currency0),
      currency1.address === zeroAddress
        ? Native.onChain(currency1.chainId)
        : new Token(currency1),
    ]

    return invertTokens ? tokens.reverse() : tokens
  }, [invertTokens, currency0, currency1])

  return (
    <Card>
      <CardHeader>
        <CardTitle>New position</CardTitle>
        <CardDescription>
          Create a new concentrated liquidity position
        </CardDescription>
      </CardHeader>
      <div className="px-6">
        <Separator />
      </div>
      <CardContent>
        <>
          <SelectPricesWidgetV4
            chainId={chainId}
            token0={_token0}
            token1={_token1}
            poolKey={poolKey}
            tokenId={undefined}
            switchTokens={() => setInvertTokens((prev) => !prev)}
          />

          <ConcentratedLiquidityWidgetV4
            chainId={chainId}
            account={account}
            token0={_token0}
            token1={_token1}
            poolKey={poolKey}
            tokensLoading={false}
            existingPosition={undefined}
            tokenId={undefined}
            successLink={`/${ChainKey[chainId]}/pool/v4/${id}/positions`}
          />
        </>
      </CardContent>
    </Card>
  )
}
