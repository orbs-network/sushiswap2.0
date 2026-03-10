import { EvmChainId, evmChains } from 'sushi/evm'
import { http, type Chain, type Transport } from 'viem'

const orbsRpcUrl = (chainId: number) =>
  `https://rpcman.orbs.network/rpc?chainId=${chainId}&appId=twap-ui`

export const publicTransports = Object.fromEntries(
  evmChains.map((config) => [
    config.viemChain.id,
    http(orbsRpcUrl(config.viemChain.id)),
  ]),
) as Record<EvmChainId, Transport>

function pluck<
  Arr extends readonly Record<string, any>[],
  K extends keyof Arr[number],
>(arr: Arr, key: K): { [I in keyof Arr]: Arr[I][K] } {
  // @ts-ignore
  return arr.map((item) => item[key]) as any
}

export const publicChains = pluck(evmChains, 'viemChain') satisfies Readonly<
  Chain[]
>

export function fromEntriesConst<
  const Pairs extends readonly (readonly [PropertyKey, any])[],
>(
  pairs: Pairs,
): {
  readonly [K in Pairs[number] as K[0]]: Extract<
    Pairs[number],
    readonly [K[0], any]
  >[1]
} {
  return Object.fromEntries(pairs) as any
}

export const publicClientConfig = fromEntriesConst(
  publicChains.map(
    (chain) =>
      [
        chain.id,
        {
          chain,
          transport: publicTransports[chain.id],
        },
      ] as const,
  ),
)
