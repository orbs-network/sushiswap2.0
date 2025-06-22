"use client";

import { Card, DataTable, Loader } from "@sushiswap/ui";
import type { ColumnDef } from "@tanstack/react-table";
import React, { useState, useMemo } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { Native } from "sushi/currency";
import { MobileCard } from "../history-tables/mobile-card/mobile-card";
import {
  ACTION_COLUMN,
  CHAIN_COLUMN,
  EXPIRES_COLUMN,
  FILLED_COLUMN,
  SIZE_COLUMN,
  SPENT_COLUMN,
  getAvgPriceColumn,
} from "./columns";
import { useTradeTablesContext } from "../trade-tables-context";
import { OrderStatus } from "@orbs-network/twap-sdk";
import { TwapOrder } from "src/lib/hooks/react-query/twap";
import { getTwapDcaOrders } from "src/ui/swap/twap/twap-hooks";

export const DCAOrdersTable = () => {
  const [showInUsd, setShowInUsd] = useState(true);
  const { orders } = useTradeTablesContext();
  const data = useMemo(() => {
    return getTwapDcaOrders(orders).filter(
      (order) => order.status === OrderStatus.Open
    );
  }, [orders]);
  const avgPriceCol = useMemo(
    () => getAvgPriceColumn(showInUsd, setShowInUsd),
    [showInUsd]
  );

  const COLUMNS: ColumnDef<TwapOrder>[] = [
    FILLED_COLUMN,
    SIZE_COLUMN,
    CHAIN_COLUMN,
    SPENT_COLUMN,
    avgPriceCol,
    EXPIRES_COLUMN,
    ACTION_COLUMN,
  ];

  return (
    <InfiniteScroll
      dataLength={data.length}
      next={() => {}}
      hasMore={false}
      loader={
        <div className="flex justify-center w-full py-4">
          <Loader size={16} />
        </div>
      }
    >
      <Card className="hidden overflow-hidden border-none bg-slate-50 dark:bg-slate-800 md:block !rounded-t-none xl:!rounded-lg">
        <DataTable
          columns={COLUMNS}
          data={data}
          loading={false}
          className="border-none [&_td]:h-[92px]"
          pagination
        />
      </Card>

      <Card className="p-5 space-y-6 border-accent !shadow-none border bg-slate-50 dark:bg-slate-800 md:hidden">
        {data.map((row) => (
          <div key={row.id} className="pb-6 border-b last:border-b-0 last:pb-0">
            <MobileCard row={row} columns={COLUMNS} />
          </div>
        ))}
      </Card>
    </InfiniteScroll>
  );
};
