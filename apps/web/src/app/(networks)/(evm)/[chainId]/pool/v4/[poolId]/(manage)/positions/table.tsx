'use client'

import type { V4Pool } from '@sushiswap/graph-client/v4'
import { Switch } from '@sushiswap/ui'
import { useState } from 'react'
import { ConcentratedPositionsTableV4 } from 'src/ui/pool/ConcentratedPositionsTable'

export function ManageV4PoolPositionsTable({
  pool,
}: {
  pool: V4Pool
}) {
  const [hideClosed, setHideClosed] = useState(true)
  return (
    <ConcentratedPositionsTableV4
      chainId={pool.chainId}
      poolId={pool.id}
      hideClosedPositions={hideClosed}
      actions={
        <div className="flex items-center gap-3 whitespace-nowrap">
          <span className="text-sm font-medium text-gray-600 dark:text-slate-400">
            Hide closed
          </span>
          <Switch
            checked={hideClosed}
            onCheckedChange={() => setHideClosed((prev) => !prev)}
          />
        </div>
      }
    />
  )
}
