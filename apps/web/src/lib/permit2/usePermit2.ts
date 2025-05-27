'use client'

import type { TTLStorageKey } from '@sushiswap/hooks'
import { createErrorToast } from '@sushiswap/notifications'
import { useCallback, useMemo, useState } from 'react'
import { permit2Abi_allowance } from 'sushi/abi'
import type { EvmChainId } from 'sushi/chain'
import type { Amount, Type } from 'sushi/currency'
import {
  type Address,
  UserRejectedRequestError,
  hexToSignature,
  zeroAddress,
} from 'viem'
import { useAccount, useReadContract, useSignTypedData } from 'wagmi'
import { ApprovalState } from '../wagmi/hooks/approvals/hooks/useTokenApproval'
import { useTransactionDeadline } from '../wagmi/hooks/utils/hooks/useTransactionDeadline'
import {
  useApprovedActions,
  useSignature,
} from '../wagmi/systems/Checker/Provider'
import { AllowanceTransfer } from './allowanceTransfer'
import { PERMIT2_ADDRESS, type Permit2ChainId } from './config'
import type { Permit2Signature } from './types'
import { generatePermitTypedData } from './utils'

interface UsePermit2Params {
  spender: Address | undefined
  amount: Amount<Type> | undefined
  enabled?: boolean
  ttlStorageKey: TTLStorageKey
  tag: string
}

export const usePermit2 = ({
  amount,
  spender,
  enabled = true,
  ttlStorageKey,
  tag,
}: UsePermit2Params) => {
  const { address, chainId } = useAccount()

  const [pending, setPending] = useState(false)

  const { signature } = useSignature<Permit2Signature>(tag)
  const { setSignature } = useApprovedActions(tag)
  const { signTypedDataAsync } = useSignTypedData()

  const { data: transactionDeadline } = useTransactionDeadline({
    chainId: chainId as EvmChainId,
    storageKey: ttlStorageKey,
    enabled,
  })

  const { data: permit2Allowance, isLoading: isPermit2AllowanceLoading } =
    useReadContract({
      chainId: chainId as Permit2ChainId,
      address: PERMIT2_ADDRESS[chainId as Permit2ChainId],
      abi: permit2Abi_allowance,
      functionName: 'allowance',
      args: [
        address ?? zeroAddress,
        amount?.currency.wrapped.address ?? zeroAddress,
        spender ?? zeroAddress,
      ],
      query: {
        enabled: Boolean(
          enabled &&
            amount &&
            spender &&
            amount.currency.chainId === chainId &&
            amount.currency.isToken,
        ),
      },
    })

  const onPermit = useCallback(async () => {
    if (
      !amount ||
      !transactionDeadline ||
      !chainId ||
      !spender ||
      !permit2Allowance
    )
      return

    const [, , nonce] = permit2Allowance

    setPending(true)

    const permit = generatePermitTypedData(amount, nonce, spender)

    const {
      domain,
      types,
      values: message,
    } = AllowanceTransfer.getPermitData(
      permit,
      PERMIT2_ADDRESS[chainId as Permit2ChainId],
      chainId,
    )

    try {
      const signature = await signTypedDataAsync({
        account: address,
        domain,
        primaryType: 'PermitSingle',
        types,
        message,
      })

      setSignature({ ...permit, signature })
    } catch (e) {
      if (
        e instanceof Error &&
        !(e.cause instanceof UserRejectedRequestError)
      ) {
        createErrorToast(e.message, true)
      }
    } finally {
      setPending(false)
    }
  }, [
    amount,
    transactionDeadline,
    chainId,
    spender,
    address,
    signTypedDataAsync,
    setSignature,
    permit2Allowance,
  ])

  const isSignatureDataValid =
    transactionDeadline &&
    amount &&
    signature?.details?.token === amount.currency.wrapped.address &&
    BigInt(signature?.details?.amount) === amount.quotient &&
    Number(signature?.details?.nonce) === permit2Allowance?.[2] &&
    signature?.spender === spender &&
    Number(signature?.sigDeadline) >= Math.floor(Date.now() / 1000)

  return useMemo<[ApprovalState, { write: undefined | (() => void) }]>(() => {
    let state = ApprovalState.UNKNOWN
    if (isSignatureDataValid || amount?.currency.isNative)
      state = ApprovalState.APPROVED
    else if (pending) state = ApprovalState.PENDING
    else if (isPermit2AllowanceLoading) state = ApprovalState.LOADING
    else state = ApprovalState.NOT_APPROVED

    return [state, { write: onPermit }]
  }, [
    amount,
    pending,
    isPermit2AllowanceLoading,
    isSignatureDataValid,
    onPermit,
  ])
}
