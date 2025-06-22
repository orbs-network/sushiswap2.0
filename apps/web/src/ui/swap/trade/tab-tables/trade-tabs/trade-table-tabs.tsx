"use client";

import {
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@sushiswap/ui";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";
import { DCAOrdersTable } from "../dca-orders-table/dca-orders-table";
import { HistoryTable } from "../history-tables/history-table";
import { LimitOrdersTable } from "../limit-orders-table/limit-orders-table";
import { TradeTableFilters } from "./trade-table-filters";
import { TwapOrder, useTwapOrders } from "src/lib/hooks/react-query/twap";
import { useAccount } from "wagmi";
import {
  TABS,
  TradeTablesProvider,
  useTradeTablesContext,
} from "../trade-tables-context";
import {
  getTwapDcaOrders,
  getTwapLimitOrders,
} from "src/ui/swap/twap/twap-hooks";

export const TradeTableTabs = () => {
  return (
    <TradeTablesProvider>
      <TradeTableTabsContent />
    </TradeTablesProvider>
  );
};

const useOrders = () => {
  const { chainIds } = useTradeTablesContext();
  const { address } = useAccount();

  return useTwapOrders({
    chainIds,
    account: address,
    enabled: true,
  });
};

const useTabs = () => {
  const { data: orders } = useOrders();
  const { currentTab, setCurrentTab } = useTradeTablesContext();

  const tabs = useMemo(() => {
    return [
      {
        label: "Limit Orders",
        count: getTwapLimitOrders(orders?.OPEN || []).length,
        key: TABS.LIMIT_ORDERS,
      },
      {
        label: "DCA Orders",
        count: getTwapDcaOrders(orders?.OPEN || []).length,
        key: TABS.DCA_ORDERS,
      },
      { label: "History", count: 0, key: TABS.HISTORY },
    ];
  }, [orders]);

  return {
    tabs,
    currentTab,
    setCurrentTab,
  };
};

const TradeTableTabsContent = () => {
  const { currentTab, setCurrentTab, tabs } = useTabs();
  const { theme } = useTheme();

  return (
    <Tabs
      defaultValue={TABS.LIMIT_ORDERS}
      onValueChange={(value) => setCurrentTab(value as TABS)}
      className="-mx-5 md:mx-0"
    >
      <div className="flex flex-col items-start justify-between xl:items-center xl:flex-row">
        <div className="w-full p-3 bg-white border-b rounded-t-lg xl:px-0 md:border-none xl:!bg-background dark:bg-background md:dark:bg-slate-800 border-accent overflow-x-auto hide-scrollbar">
          <TabsList className="!px-2.5 w-full md:!px-0 gap-2 md:!pb-0 !pb-6 !justify-start bg-white xl:!bg-transparent dark:bg-background md:dark:bg-slate-800 !border-none rounded-none shadow-none md:rounded-lg md:border-none md:mx-0 xl:rounded-lg !rounded-b-none">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.key}
                value={tab.key}
                className="!bg-transparent xl:!bg-background !border-none !shadow-none !px-0 focus-visible:!ring-0 focus-visible:!ring-offset-0 !ring-transparent"
              >
                <Button
                  key={tab.key}
                  asChild
                  size="sm"
                  variant={
                    currentTab === tab.key
                      ? theme === "dark"
                        ? "quaternary"
                        : "quinary"
                      : "ghost"
                  }
                  className={"select-none !gap-1"}
                >
                  {tab.label}
                </Button>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TradeTableFilters />
      </div>
      <TabsContent
        value={tabs[0].key}
        className="px-5 !mt-0 !pt-2 md:!pt-0 xl:!pt-2 bg-[#F9FAFB] dark:bg-slate-900 md:px-0 pb-[86px] md:bg-white xl:bg-transparent md:pb-0 rounded-b-xl"
      >
        <LimitOrdersTable />
      </TabsContent>
      <TabsContent
        value={tabs[1].key}
        className="px-5 !mt-0 !pt-2 md:!pt-0 xl:!pt-2 bg-[#F9FAFB] dark:bg-slate-900 md:px-0 pb-[86px] md:bg-white xl:bg-transparent md:pb-0 rounded-b-xl"
      >
        <DCAOrdersTable />
      </TabsContent>
      <TabsContent
        value={tabs[2].key}
        className="px-5 !mt-0 !pt-2 md:!pt-0 xl:!pt-2 bg-[#F9FAFB] dark:bg-slate-900 md:px-0 pb-[86px] md:bg-white xl:bg-transparent md:pb-0 rounded-b-xl"
      >
        <HistoryTable />
      </TabsContent>
    </Tabs>
  );
};
