'use client'

import { PlusIcon } from '@heroicons/react/20/solid'
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  DataTable,
  LinkInternal,
} from '@sushiswap/ui'
import { Slot } from '@sushiswap/ui'
import type { ColumnDef, PaginationState, Row } from '@tanstack/react-table'
import React, {
  type FC,
  type ReactNode,
  useCallback,
  useMemo,
  useState,
} from 'react'
import { isSushiSwapV4ChainId } from 'src/lib/pool/v4'
import { useConcentratedLiquidityPositionsV4 } from 'src/lib/wagmi/hooks/positions/hooks/useConcentratedLiquidityPositionsV4'
import type { ConcentratedLiquidityPositionWithV4Pool } from 'src/lib/wagmi/hooks/positions/types'
import { type EvmChainId, EvmChainKey } from 'sushi'
import type { Hex } from 'viem'
import { useAccount } from 'wagmi'
import { usePoolFilters } from '../PoolsFiltersProvider'
import {
  NAME_COLUMN_V4,
  POSITION_SIZE_CELL_V4,
  POSITION_UNCLAIMED_CELL_V4,
  PRICE_RANGE_COLUMN_V4,
} from '../columns'

const COLUMNS = [
  NAME_COLUMN_V4,
  POSITION_SIZE_CELL_V4,
  POSITION_UNCLAIMED_CELL_V4,
  PRICE_RANGE_COLUMN_V4,
] satisfies ColumnDef<ConcentratedLiquidityPositionWithV4Pool, unknown>[]

const tableState = { sorting: [{ id: 'positionSize', desc: true }] }

interface ConcentratedPositionsTableV4Props {
  chainId: EvmChainId
  poolId?: Hex
  onRowClick?(row: ConcentratedLiquidityPositionWithV4Pool): void
  hideNewPositionButton?: boolean
  hideClosedPositions?: boolean
  actions?: ReactNode
}

export const ConcentratedPositionsTableV4: FC<
  ConcentratedPositionsTableV4Props
> = ({
  chainId,
  onRowClick,
  poolId,
  hideNewPositionButton = false,
  hideClosedPositions = true,
  actions,
}) => {
  const { address } = useAccount()
  const { tokenSymbols } = usePoolFilters()

  const chainIds = useMemo(() => {
    return isSushiSwapV4ChainId(chainId) ? [chainId] : []
  }, [chainId])

  const [paginationState, setPaginationState] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const { data: positions, isInitialLoading } =
    useConcentratedLiquidityPositionsV4({
      account: address,
      chainIds,
    })

  const _positions = useMemo(() => {
    const _tokenSymbols = tokenSymbols?.filter((el) => el !== '') || []
    return (positions || [])
      .filter((el) =>
        _tokenSymbols.length > 0
          ? _tokenSymbols.some((symbol) => {
              return [
                el?.pool?.currency0.symbol,
                el?.pool?.currency1.symbol,
              ].includes(symbol.toUpperCase())
            })
          : true,
      )
      .filter((el) => {
        return (
          (hideClosedPositions ? el?.liquidity !== 0n : true) &&
          (poolId ? el?.pool.id === poolId : true)
        )
      })
  }, [tokenSymbols, positions, hideClosedPositions, poolId])

  const rowRenderer = useCallback(
    (row: Row<ConcentratedLiquidityPositionWithV4Pool>, rowNode: ReactNode) => {
      if (onRowClick)
        return (
          <Slot
            className="cursor-pointer"
            onClick={() => onRowClick?.(row.original)}
          >
            {rowNode}
          </Slot>
        )
      return rowNode
    },
    [onRowClick],
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="flex-grow whitespace-nowrap">
              My Positions{' '}
              <span className="text-gray-400 dark:text-slate-500">
                ({_positions.length})
              </span>
            </span>
            {!hideNewPositionButton ? (
              <LinkInternal
                shallow={true}
                href={`/${EvmChainKey[chainId]}/pool/v4/${poolId}/create`}
                className="basis-full md:basis-[unset]"
              >
                <Button icon={PlusIcon} asChild size="sm" className="w-full">
                  Create position
                </Button>
              </LinkInternal>
            ) : null}
            {actions}
          </div>
        </CardTitle>
      </CardHeader>
      <DataTable
        testId="concentrated-positions"
        loading={isInitialLoading}
        linkFormatter={(row) =>
          `/${EvmChainKey[row.chainId]}/pool/v4/${row.pool.id}/${row.tokenId}`
        }
        rowRenderer={rowRenderer}
        columns={COLUMNS}
        data={_positions}
        pagination={true}
        onPaginationChange={setPaginationState}
        state={{
          ...tableState,
          pagination: paginationState,
        }}
      />
    </Card>
  )
}
