import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@sushiswap/ui'
import type React from 'react'
import { type FC, useState } from 'react'

import { isSushiSwapV4ChainId } from 'src/lib/pool/v4'
import { ChainKey } from 'sushi/chain'
import type { SushiSwapChainId } from 'sushi/config'
import { ConcentratedPositionsTableV4 } from './ConcentratedPositionsTable'
import { ConcentratedPositionsTableV3 } from './ConcentratedPositionsTable/ConcentratedPositionsTableV3'
import { PositionsTable } from './PositionsTable'

const ITEMS: { id: string; value: string; children: React.ReactNode }[] = [
  {
    id: 'sushiswap-v3',
    value: 'v3',
    children: (
      <div className="flex items-center gap-2">
        <span>🍣</span>{' '}
        <span>
          SushiSwap <sup>v3</sup>
        </span>
      </div>
    ),
  },
  {
    id: 'sushiswap-v2',
    value: 'v2',
    children: (
      <div className="flex items-center gap-2">
        <span>🍣</span>{' '}
        <span>
          SushiSwap <sup>v2</sup>
        </span>
      </div>
    ),
  },
]

const V4_ITEMS = [
  {
    id: 'sushiswap-v4',
    value: 'v4',
    children: (
      <div className="flex items-center gap-2">
        <span>🍣</span>{' '}
        <span>
          SushiSwap <sup>v4</sup>
        </span>
      </div>
    ),
  },
  ...ITEMS,
]

export const PositionsTab: FC<{ chainId: SushiSwapChainId }> = ({
  chainId,
}) => {
  const [tab, setTab] = useState(isSushiSwapV4ChainId(chainId) ? 'v4' : 'v3')
  const [hideClosedPositions, setHideClosedPositions] = useState(true)

  const items = isSushiSwapV4ChainId(chainId) ? V4_ITEMS : ITEMS

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={tab} onValueChange={setTab} defaultValue="v3">
        <div className="flex justify-between mb-4">
          <div className="block sm:hidden">
            <Select value={tab} onValueChange={setTab}>
              <SelectTrigger>
                <SelectValue placeholder="Pool type" />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.children}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <TabsList className="hidden sm:inline-flex">
            {items.map((item) => (
              <TabsTrigger
                key={item.value}
                value={item.value}
                testdata-id={item.id}
              >
                {item.children}
              </TabsTrigger>
            ))}
          </TabsList>
          {tab === 'v3' ? (
            <div className="flex items-center gap-3 whitespace-nowrap">
              <span className="text-sm font-medium text-gray-600 dark:text-slate-400">
                Hide closed
              </span>
              <Switch
                checked={hideClosedPositions}
                onCheckedChange={() => setHideClosedPositions((prev) => !prev)}
              />
            </div>
          ) : null}
        </div>
        {isSushiSwapV4ChainId(chainId) ? (
          <TabsContent value="v4">
            <ConcentratedPositionsTableV4
              chainId={chainId}
              hideNewPositionButton={true}
              hideClosedPositions={hideClosedPositions}
            />
          </TabsContent>
        ) : null}
        <TabsContent value="v3">
          <ConcentratedPositionsTableV3
            chainId={chainId}
            hideNewPositionButton={true}
            hideClosedPositions={hideClosedPositions}
          />
        </TabsContent>
        <TabsContent value="v2">
          <PositionsTable
            chainId={chainId}
            rowLink={(row) =>
              `/${ChainKey[chainId]}/pool/v2/${row.pool.address}/add`
            }
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
