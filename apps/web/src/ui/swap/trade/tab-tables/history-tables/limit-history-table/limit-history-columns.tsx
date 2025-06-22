import { ArrowUpRightIcon } from "@heroicons/react/24/outline";
import {
  Chip,
  Currency,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@sushiswap/ui";
import { DollarCircledIcon } from "@sushiswap/ui/icons/DollarCircled";
import { NetworkIcon } from "@sushiswap/ui/icons/NetworkIcon";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { formatUSD } from "sushi/format";
import { formatPercent } from "sushi/format";
import { formatNumber } from "sushi/format";
import { OrderStatus } from "@orbs-network/twap-sdk";
import { TwapOrder } from "src/lib/hooks/react-query/twap";
import { useParsedLimitOrder } from "src/ui/swap/twap/twap-hooks";

export const DATE_COLUMN: ColumnDef<TwapOrder> = {
  id: "date",
  header: "Date",
  enableSorting: false,
  accessorFn: (row) => row.createdAt,
  cell: ({ row }) => (
    <span className="">
      {format(new Date(row.original.createdAt), "MM/dd/yy h:mm a")}
    </span>
  ),
};

export const BUY_COLUMN: ColumnDef<TwapOrder> = {
  id: "buy",
  header: "Buy",
  enableSorting: false,

  accessorFn: (row) => {
    const { buyAmount } = useParsedLimitOrder(row);
    return buyAmount;
  },
  cell: ({ row }) => {
    const { buyToken, buyAmount } = useParsedLimitOrder(row.original);
    if (!buyToken) return null;
    return (
      <div className="flex items-center gap-2">
        <Currency.Icon currency={buyToken} width={18} height={18} />
        <span>
          {formatNumber(buyAmount)} {buyToken.symbol}
        </span>
      </div>
    );
  },
};

export const SELL_COLUMN: ColumnDef<TwapOrder> = {
  id: "sell",
  header: "Sell",
  enableSorting: false,

  accessorFn: (row) => {
    const { sellAmount } = useParsedLimitOrder(row);
    return sellAmount;
  },
  cell: ({ row }) => {
    const { sellToken, sellAmount } = useParsedLimitOrder(row.original);
    if (!sellToken) return null;
    return (
      <div className="flex items-center gap-2">
        <Currency.Icon currency={sellToken} width={18} height={18} />
        <span>
          {formatNumber(sellAmount)} {sellToken.symbol}
        </span>
      </div>
    );
  },
};

export const CHAIN_COLUMN: ColumnDef<TwapOrder> = {
  id: "chain",
  header: "Chain",
  enableSorting: false,
  accessorFn: (row) => row.chainId,
  cell: ({ row }) => {
    const { chain } = useParsedLimitOrder(row.original);
    return (
      <div className="flex items-center gap-1 md:gap-2">
        <div className="dark:border-[#222137] border-[#F5F5F5] border rounded-[4px] overflow-hidden">
          <NetworkIcon
            type="square"
            chainId={chain.id}
            className="w-3 h-3 md:w-5 md:h-5"
          />
        </div>
        <span className="block text-xs md:hidden">{chain.name}</span>
      </div>
    );
  },
};

export const VALUE_PNL_COLUMN: ColumnDef<TwapOrder> = {
  id: "valueUsd",
  header: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="border-b border-dotted border-muted-foreground">
            Value / PnL
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="dark:bg-black/10 bg-white/10 py-4 px-5 !text-slate-900 dark:!text-pink-100 text-xs max-w-[250px]"
        >
          <p>
            Profit or loss calculated as the difference in USD value of the
            asset on the day it was bought and the day it was sold.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
  enableSorting: false,

  accessorFn: (row) => {
    const { valueUsd } = useParsedLimitOrder(row);
    return valueUsd;
  },
  cell: ({ row }) => {
    const { valueUsd, pnlUsd } = useParsedLimitOrder(row.original);
    return (
      <div className="flex items-start gap-1 md:flex-col ">
        {valueUsd ? (
          <>
            <span>{formatUSD(valueUsd)}</span>
            <span
              className={
                pnlUsd > 0
                  ? "text-xs text-green-500"
                  : pnlUsd < 0
                  ? "text-xs text-red"
                  : "text-xs text-muted-foreground"
              }
            >
              {pnlUsd > 0 ? "+" : ""}
              {formatUSD(pnlUsd)}
            </span>
          </>
        ) : (
          <span>N/A</span>
        )}
      </div>
    );
  },
};

export const getPriceUsdColumn = (
  showInUsd: boolean,
  setShowInUsd: React.Dispatch<React.SetStateAction<boolean>>
): ColumnDef<TwapOrder> => ({
  id: "priceUsd",
  enableSorting: false,
  header: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            onClick={(e) => {
              e.stopPropagation();
              setShowInUsd((prev) => !prev);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
              }
            }}
            className="flex items-start gap-1 cursor-pointer select-none min-w-[100px]"
          >
            <span>Price</span>
            <span className="inline-flex items-center dark:text-skyblue text-blue font-normal gap-[1px] border-b border-dashed border-current">
              <DollarCircledIcon className="w-3 h-3" />
              <span>{showInUsd ? "USD" : "Token"}</span>
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="dark:bg-black/10 bg-white/10 py-4 px-5 !text-slate-900 dark:!text-pink-100 text-xs"
        >
          <p>Toggle to view price in USD or token pair unit.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
  accessorFn: (row) => {
    const { priceUsd } = useParsedLimitOrder(row);
    return priceUsd;
  },
  cell: ({ row }) => {
    const { buyToken, priceUsd, buyTokenPerOrder } = useParsedLimitOrder(
      row.original
    );

    if (!priceUsd) {
      return <span>N/A</span>;
    }

    return showInUsd ? (
      <span>{formatUSD(priceUsd)}</span>
    ) : (
      <span className="">{`${buyTokenPerOrder.toFixed(4)} ${
        buyToken?.symbol
      }`}</span>
    );
  },
});

export const FILLED_COLUMN: ColumnDef<TwapOrder> = {
  id: "filled",
  header: "Filled",
  enableSorting: false,

  accessorFn: (row) => {
    const { filledPercent } = useParsedLimitOrder(row);
    return filledPercent;
  },
  cell: ({ row }) => {
    const { buyToken, buyTokenFilled, filledPercent, buyAmount } =
      useParsedLimitOrder(row.original);

    if (!buyToken) return null;

    return (
      <div className="flex items-center gap-2">
        <span>
          {formatNumber(buyTokenFilled)} / {formatNumber(Number(buyAmount))}{" "}
          {buyToken.symbol}
        </span>
        <Chip className="dark:!bg-slate-750 !bg-slate-200 !p-2 dark:text-slate-500 text-slate-450 !h-[20px]">
          {formatPercent(filledPercent / 100)}
        </Chip>
      </div>
    );
  },
};

/** Status column */
export const STATUS_COLUMN: ColumnDef<TwapOrder> = {
  id: "status",
  header: () => <span className="md:text-right md:block">Status</span>,
  enableSorting: false,
  accessorFn: (row) => row.status,
  cell: ({ row }) => {
    const color =
      row.original.status === OrderStatus.Completed
        ? "text-green-500"
        : row.original.status === OrderStatus.Canceled
        ? "text-orange-400"
        : "text-muted-foreground";
    return (
      <span
        className={`${color} flex items-center gap-1 w-full justify-end text-[14px]`}
      >
        {row.original.status}
        <ArrowUpRightIcon className="w-[12px] h-[12px]" />
      </span>
    );
  },
};
