// 'use client'

// import type { V4Pool } from '@sushiswap/graph-client/data-api'
// import {
//   Card,
//   CardContent,
//   CardHeader,
//   CardTitle,
//   DataTable,
//   Toggle,
// } from '@sushiswap/ui'
// import { useQuery } from '@tanstack/react-query'
// import type { PaginationState } from '@tanstack/react-table'
// import { type FC, useMemo, useState } from 'react'
// import { type SushiSwapV4ChainId, isSushiSwapV4ChainId } from 'src/lib/pool/v4'
// import { EvmChain, type EvmChainId } from 'sushi/chain'
// import type { Address } from 'viem'
// import {
//   TX_AMOUNT_IN_V4_COLUMN,
//   TX_AMOUNT_OUT_V4_COLUMN,
//   TX_AMOUNT_USD_V4_COLUMN,
//   TX_ORIGIN_V4_COLUMN,
//   TX_TIME_V4_COLUMN,
// } from './columns'

// export enum TransactionTypeV4 {
//   Mint = 'Mint',
//   Burn = 'Burn',
//   Swap = 'Swap',
//   Collect = 'Collect',
// }

// interface UseTransactionsV4Opts {
//   type?: TransactionTypeV4 | 'All'
//   refetchInterval?: number
//   first: number
//   skip?: number
// }

// const fetchMints = async (address: Address, chainId: SushiSwapV4ChainId) => {
//   const mints = await getSushiV4Mints({
//     address,
//     chainId,
//   })

//   return mints.map((mint) => ({
//     ...mint.transaction,
//     mints: [mint],
//     burns: [],
//     swaps: [],
//     collects: [],
//   }))
// }

// const fetchBurns = async (address: Address, chainId: SushiSwapV4ChainId) => {
//   const burns = await getSushiV4Burns({
//     chainId,
//     address,
//   })

//   return burns.map((burn) => ({
//     ...burn.transaction,
//     mints: [],
//     burns: [burn],
//     swaps: [],
//     collects: [],
//   }))
// }

// const fetchSwaps = async (address: Address, chainId: SushiSwapV4ChainId) => {
//   const swaps = await getSushiV4Swaps({
//     chainId,
//     address,
//   })

//   return swaps.map((swap) => ({
//     ...swap.transaction,
//     mints: [],
//     burns: [],
//     swaps: [swap],
//     collects: [],
//   }))
// }

// const fetchCollects = async (address: Address, chainId: SushiSwapV4ChainId) => {
//   const collects = await getSushiV4Collects({
//     chainId,
//     address,
//   })

//   return collects.map((collect) => ({
//     ...collect.transaction,
//     mints: [],
//     burns: [],
//     swaps: [],
//     collects: [collect],
//   }))
// }

// // Will only support the last 1k txs
// // The fact that there are different subtransactions aggregated under one transaction makes paging a bit difficult
// function useTransactionsV4(
//   pool: V4Pool | undefined | null,
//   poolAddress: Address,
//   opts: UseTransactionsV4Opts,
// ) {
//   return useQuery({
//     queryKey: ['poolTransactionsV4', poolAddress, opts],
//     queryFn: async () => {
//       const chainId = pool?.chainId as EvmChainId

//       if (!pool || !isSushiSwapV4ChainId(chainId)) return []

//       let transactions = []

//       switch (opts.type) {
//         case TransactionTypeV4.Mint:
//           transactions = await fetchMints(poolAddress, chainId)
//           break
//         case TransactionTypeV4.Burn:
//           transactions = await fetchBurns(poolAddress, chainId)
//           break
//         case TransactionTypeV4.Swap:
//           transactions = await fetchSwaps(poolAddress, chainId)
//           break
//         case TransactionTypeV4.Collect:
//           transactions = await fetchCollects(poolAddress, chainId)
//           break
//         default:
//           transactions = await fetchSwaps(poolAddress, chainId)
//       }

//       if (!transactions.length) return []

//       return transactions.flatMap((transaction) => {
//         const mints = (
//           transaction.mints as NonNullable<(typeof transaction.mints)[0]>[]
//         ).map((mint) => ({
//           ...mint,
//           owner: String(mint.owner),
//           sender: String(mint.sender),
//           origin: String(mint.origin),
//           type: TransactionTypeV4.Mint as const,
//         }))

//         const burns = (
//           transaction.burns as NonNullable<(typeof transaction.burns)[0]>[]
//         ).map((burn) => ({
//           ...burn,
//           owner: String(burn.owner),
//           origin: String(burn.origin),
//           type: TransactionTypeV4.Burn as const,
//         }))

//         const swaps = (
//           transaction.swaps as NonNullable<(typeof transaction.swaps)[0]>[]
//         ).map((swap) => ({
//           ...swap,
//           sender: String(swap.sender),
//           recipient: String(swap.recipient),
//           origin: String(swap.origin),
//           type: TransactionTypeV4.Swap as const,
//         }))

//         const collects = (
//           transaction.collects as NonNullable<
//             (typeof transaction.collects)[0]
//           >[]
//         ).map((collect) => ({
//           ...collect,
//           origin: String(collect.owner),
//           type: TransactionTypeV4.Collect as const,
//         }))

//         return [...mints, ...burns, ...swaps, ...collects]
//           .flatMap((subtransaction) => ({
//             pool,
//             timestamp: Number(transaction.timestamp),
//             blockNumber: Number(transaction.blockNumber),
//             ...subtransaction,
//             amount0: Number(subtransaction.amount0), // Amount.fromRawAmount(pool.token0, subtransaction.amount0),
//             amount1: Number(subtransaction.amount1), // Amount.fromRawAmount(pool.token1, subtransaction.amount1),
//             amountUSD: Number(subtransaction.amountUSD),
//             logIndex: Number(subtransaction.logIndex),
//           }))
//           .sort((a, b) => b.logIndex - a.logIndex)
//       })
//     },
//     enabled: !!pool && isSushiSwapV4ChainId(pool.chainId),
//     refetchInterval: opts?.refetchInterval,
//   })
// }

// type TransactionV4 = NonNullable<
//   ReturnType<typeof useTransactionsV4>['data']
// >[0]

// interface PoolTransactionsV4Props {
//   pool: V4Pool | undefined | null
//   poolAddress: Address
// }

// const PoolTransactionsV4: FC<PoolTransactionsV4Props> = ({
//   pool,
//   poolAddress,
// }) => {
//   const [type, setType] = useState<
//     Parameters<typeof useTransactionsV4>['2']['type']
//   >(TransactionTypeV4.Swap)
//   const [paginationState, setPaginationState] = useState<PaginationState>({
//     pageIndex: 0,
//     pageSize: 10,
//   })

//   const COLUMNS = useMemo(() => {
//     return [
//       TX_ORIGIN_V4_COLUMN,
//       TX_AMOUNT_IN_V4_COLUMN(type),
//       TX_AMOUNT_OUT_V4_COLUMN(type),
//       TX_AMOUNT_USD_V4_COLUMN,
//       TX_TIME_V4_COLUMN,
//     ]
//   }, [type])

//   const opts = useMemo(
//     () =>
//       ({
//         refetchInterval: 60_000,
//         first:
//           paginationState.pageSize === 0 ? paginationState.pageIndex + 1 : 100,
//         type,
//       }) as const,
//     [paginationState.pageIndex, paginationState.pageSize, type],
//   )

//   const { data, isLoading } = useTransactionsV4(pool, poolAddress, opts)

//   const _data = useMemo(() => {
//     return data ?? []
//   }, [data])

//   return (
//     <Card>
//       <CardHeader>
//         <CardTitle>
//           <div className="flex flex-col md:flex-row justify-between gap-y-4">
//             Transactions
//             <div className="flex items-center gap-1">
//               <Toggle
//                 variant="outline"
//                 size="xs"
//                 pressed={type === TransactionTypeV4.Swap}
//                 onClick={() => setType(TransactionTypeV4.Swap)}
//               >
//                 Swaps
//               </Toggle>
//               <Toggle
//                 variant="outline"
//                 size="xs"
//                 pressed={type === TransactionTypeV4.Mint}
//                 onClick={() => setType(TransactionTypeV4.Mint)}
//               >
//                 Add
//               </Toggle>
//               <Toggle
//                 variant="outline"
//                 size="xs"
//                 pressed={type === TransactionTypeV4.Burn}
//                 onClick={() => setType(TransactionTypeV4.Burn)}
//               >
//                 Remove
//               </Toggle>
//             </div>
//           </div>
//         </CardTitle>
//       </CardHeader>
//       <CardContent className="!px-0">
//         <DataTable
//           linkFormatter={(row) =>
//             EvmChain.from(row.pool.chainId)?.getTxUrl(row.transaction.id) ?? ''
//           }
//           loading={isLoading}
//           columns={COLUMNS}
//           data={_data}
//           pagination={true}
//           externalLink={true}
//           onPaginationChange={setPaginationState}
//           state={{
//             pagination: paginationState,
//           }}
//         />
//       </CardContent>
//     </Card>
//   )
// }

// export { PoolTransactionsV4, useTransactionsV4 }
// export type { TransactionV4 }
