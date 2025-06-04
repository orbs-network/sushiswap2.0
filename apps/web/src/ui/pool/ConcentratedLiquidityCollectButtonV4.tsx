'use client'

import { TTLStorageKey } from '@sushiswap/hooks'
import { createErrorToast, createToast } from '@sushiswap/notifications'
import {
  LiquidityEventName,
  LiquiditySource,
  sendAnalyticsEvent,
} from '@sushiswap/telemetry'
import { type FC, type ReactElement, useCallback, useMemo } from 'react'
import {
  SUSHISWAP_V4_CL_POSITION_MANAGER,
  type SushiSwapV4Position,
  isSushiSwapV4ChainId,
} from 'src/lib/pool/v4'
import { encodeCLPositionManagerDecreaseLiquidityCalldata } from 'src/lib/pool/v4/sdk/functions/clamm/calldatas'
import type { ConcentratedLiquidityPositionV4 } from 'src/lib/wagmi/hooks/positions/types'
import { useTransactionDeadline } from 'src/lib/wagmi/hooks/utils/hooks/useTransactionDeadline'
import type { EvmChainId } from 'sushi/chain'
import { Amount, type Type } from 'sushi/currency'
import { NonfungiblePositionManager } from 'sushi/pool/sushiswap-v3'
import {
  type Address,
  type Hex,
  type SendTransactionReturnType,
  UserRejectedRequestError,
  zeroAddress,
} from 'viem'
import {
  type UseCallParameters,
  useAccount,
  useCall,
  usePublicClient,
  useSendTransaction,
} from 'wagmi'
import { useRefetchBalances } from '~evm/_common/ui/balance-provider/use-refetch-balances'

interface ConcentratedLiquidityCollectButtonV4 {
  positionDetails: ConcentratedLiquidityPositionV4 | undefined
  position: SushiSwapV4Position | undefined
  token0: Type | undefined
  token1: Type | undefined
  account: `0x${string}` | undefined
  chainId: EvmChainId
  receiveWrapped: boolean
  children(
    params: Omit<
      ReturnType<typeof useSendTransaction>,
      'sendTransaction' | 'sendTransactionAsync'
    > & { send: (() => Promise<void>) | undefined },
  ): ReactElement<any>
}

export const ConcentratedLiquidityCollectButtonV4: FC<
  ConcentratedLiquidityCollectButtonV4
> = ({
  account,
  chainId,
  position,
  positionDetails,
  children,
  token0,
  token1,
  receiveWrapped,
}) => {
  const { chain } = useAccount()
  const client = usePublicClient()

  const { data: deadline } = useTransactionDeadline({
    storageKey: TTLStorageKey.RemoveLiquidity,
    chainId,
  })

  const { refetchChain: refetchBalances } = useRefetchBalances()

  const prepare = useMemo(() => {
    if (
      token0 &&
      token1 &&
      position &&
      account &&
      positionDetails &&
      isSushiSwapV4ChainId(chainId) &&
      deadline
    ) {
      let wrapAddress: Address = zeroAddress
      if (receiveWrapped) {
        if (position.pool.currency0.isNative)
          wrapAddress = position.pool.currency0.wrapped.address
        else if (position.pool.currency1.isNative)
          wrapAddress = position.pool.currency1.wrapped.address
      }

      const data = encodeCLPositionManagerDecreaseLiquidityCalldata({
        tokenId: positionDetails.tokenId,
        poolKey: positionDetails.poolKey,
        liquidity: 0n,
        amount0Min: 0n,
        amount1Min: 0n,
        wrapAddress: wrapAddress,
        recipient: account,
        hookData: undefined, // TODO
        deadline,
      })

      //   const data = encodeCLPositionManagerDecreaseLiquidityCalldata({
      //   tokenId: positionDetails.tokenId,
      //   poolKey: positionDetails.poolKey,
      //   liquidity: positionDetails.liquidity,
      //   amount0Min,
      //   amount1Min,
      //   wrapAddress,
      //   recipient: account,
      //   hookData: undefined, // TODO
      //   deadline: deadline,
      // })

      return {
        to: SUSHISWAP_V4_CL_POSITION_MANAGER[chainId],
        chainId,
        data,
        value: 0n,
      } satisfies UseCallParameters
    }

    return undefined
  }, [
    account,
    chainId,
    position,
    positionDetails,
    token0,
    token1,
    receiveWrapped,
    deadline,
  ])

  const onSuccess = useCallback(
    (hash: SendTransactionReturnType) => {
      if (!position) return

      const receipt = client.waitForTransactionReceipt({ hash })
      receipt.then(() => {
        refetchBalances(chainId)
      })

      const ts = new Date().getTime()
      void createToast({
        account,
        type: 'claimRewards',
        chainId,
        txHash: hash,
        promise: client.waitForTransactionReceipt({ hash }),
        summary: {
          pending: `Collecting fees from your ${position.amount0.currency.symbol}/${position.amount1.currency.symbol} position`,
          completed: `Collected fees from your ${position.amount0.currency.symbol}/${position.amount1.currency.symbol} position`,
          failed: 'Something went wrong when trying to collect fees',
        },
        timestamp: ts,
        groupTimestamp: ts,
      })
    },
    [refetchBalances, account, chainId, client, position],
  )

  const onError = useCallback((e: Error) => {
    if (!(e.cause instanceof UserRejectedRequestError)) {
      createErrorToast(e?.message, true)
    }
  }, [])

  const { isError: isSimulationError } = useCall({
    ...prepare,
    query: {
      enabled: Boolean(
        token0 &&
          token1 &&
          account &&
          position &&
          positionDetails &&
          chainId === chain?.id,
      ),
    },
  })

  const {
    sendTransactionAsync,
    sendTransaction: _,
    ...rest
  } = useSendTransaction({
    mutation: {
      onSuccess,
      onError,
    },
  })

  const send = useMemo(() => {
    if (isSimulationError || !prepare) return

    return async () => {
      try {
        await sendTransactionAsync(prepare)
        sendAnalyticsEvent(LiquidityEventName.COLLECT_LIQUIDITY_SUBMITTED, {
          chain_id: prepare.chainId,
          address: account,
          source: LiquiditySource.V3,
          label: [token0?.symbol, token1?.symbol].join('/'),
        })
      } catch {}
    }
  }, [
    isSimulationError,
    prepare,
    sendTransactionAsync,
    account,
    token0,
    token1,
  ])

  return children({ ...rest, send })
}
