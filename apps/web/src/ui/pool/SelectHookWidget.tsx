'use client'

import { CheckBadgeIcon } from '@heroicons/react/24/outline'
import { FormSection, Switch, TextField } from '@sushiswap/ui'
import React, { useEffect, useState, type FC } from 'react'
import type { HookData } from 'src/lib/pool/v4'
import { decodeHooksRegistration } from 'src/lib/pool/v4/sdk/utils/decodeHooksRegistration'
import type { EvmChainId } from 'sushi/chain'
import { zeroAddress } from 'viem'
import { isAddress } from 'viem/utils'
import { useReadContract } from 'wagmi'

const abiShard = [
  {
    type: 'function',
    name: 'getHooksRegistrationBitmap',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint16',
        internalType: 'uint16',
      },
    ],
    stateMutability: 'pure',
  },
] as const

interface SelectTokensWidget {
  chainId: EvmChainId
  hookString: string
  setHookString(hook: string): void
  hooks: HookData | undefined
  setHooks(hook: HookData): void
}

export const SelectHookWidget: FC<SelectTokensWidget> = ({
  chainId,
  hookString,
  setHookString,
  hooks,
  setHooks,
}) => {
  const [enabled, setEnabled] = useState<boolean>(hookString !== '')

  const { data: hooksRegistration, isError } = useReadContract({
    chainId,
    address: isAddress(hookString, { strict: false }) ? hookString : undefined,
    abi: abiShard,
    functionName: 'getHooksRegistrationBitmap',
    args: [],
    query: {
      staleTime: Number.POSITIVE_INFINITY,
      enabled: isAddress(hookString, { strict: false }),
    },
  })

  useEffect(() => {
    if (
      hooksRegistration &&
      isAddress(hookString) &&
      hooks?.address !== hookString
    ) {
      setHooks({
        address: hookString,
        hooksRegistration: decodeHooksRegistration(hooksRegistration),
      })
    }
  }, [hookString, hooksRegistration, hooks, setHooks])

  return (
    <FormSection
      title="Hooks"
      description="Hooks are an optional feature that enables pools to run custom logic. Use cuautiously, as they may be malicious."
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Switch
            testdata-id="toggle-zap-enabled"
            checked={enabled}
            onCheckedChange={() => {
              if (enabled) setHookString('')
              setEnabled(!enabled)
            }}
          />
          <span className="text-sm">Add a hook</span>
        </div>
        {enabled ? (
          <div className="flex items-center gap-3">
            <TextField
              isError={isError}
              type="text"
              placeholder={zeroAddress}
              value={hookString}
              onValueChange={(value) => setHookString(value)}
            />
            <div className="h-4 w-4">
              {hooksRegistration ? (
                <CheckBadgeIcon className="bg-green rounded-full" />
              ) : undefined}
            </div>
          </div>
        ) : null}
      </div>
    </FormSection>
  )
}
