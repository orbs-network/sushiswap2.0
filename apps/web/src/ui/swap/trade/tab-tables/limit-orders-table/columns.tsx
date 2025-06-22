import { XMarkIcon } from "@heroicons/react/24/solid";
import {
  Button,
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
import { TwapOrder } from "src/lib/hooks/react-query/twap";
import { useParsedOrder } from "src/ui/swap/twap/twap-hooks";
import { formatNumber, formatPercent, formatUSD } from "sushi/format";

export const BUY_COLUMN: ColumnDef<TwapOrder> = {
  id: "buy",
  header: "Buy",
  accessorFn: (row) => row,
  enableSorting: false,
  cell: ({ row }) => {
    const { buyToken, buyAmount } = useParsedOrder(row.original);
    if (!buyToken) return null;
    return (
      <div className="flex items-center gap-1 md:gap-2 whitespace-nowrap min-w-[130px]">
        <Currency.Icon disableLink currency={buyToken} width={24} height={24} />{" "}
        <span>
          {!buyAmount ? "-" : `${formatNumber(buyAmount)} ${buyToken.symbol}`}
        </span>
      </div>
    );
  },
};

export const SELL_COLUMN: ColumnDef<TwapOrder> = {
  id: "sell",
  header: "Sell",
  accessorFn: (row) => row,
  enableSorting: false,
  cell: ({ row }) => {
    const { sellToken, sellAmount } = useParsedOrder(row.original);
    if (!sellToken) return null;
    return (
      <div className="flex items-center gap-1 md:gap-2 whitespace-nowrap">
        <Currency.Icon
          disableLink
          currency={sellToken}
          width={24}
          height={24}
        />
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
    return (
      <div className="flex items-center gap-1 md:gap-2">
        <div className="dark:border-[#222137] border-[#F5F5F5] border rounded-[4px] overflow-hidden">
          <NetworkIcon
            type="square"
            chainId={row.original.chainId}
            className="w-3 h-3 md:w-5 md:h-5"
          />
        </div>
        <span className="block text-xs md:hidden">{"Ethereum"}</span>
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
            Value / Est. PnL
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
  accessorFn: (row) => row.tradeDollarValueIn,
  sortingFn: ({ original: a }, { original: b }) =>
    Number(a.tradeDollarValueIn) - Number(b.tradeDollarValueIn),
  cell: ({ row }) => {
    const { pnlPercent } = useParsedOrder(row.original);
    return (
      <div className="flex items-start gap-1 md:flex-col ">
        <span>{formatUSD(row.original.tradeDollarValueIn)}</span>
        <span
          className={
            pnlPercent > 0
              ? "text-xs text-green-500"
              : pnlPercent < 0
              ? "text-xs text-red"
              : "text-xs text-muted-foreground"
          }
        >
          {pnlPercent > 0 ? "+" : ""}
          {formatPercent(pnlPercent)}
        </span>
      </div>
    );
  },
};

export const getPriceColumn = (
  showInUsd: boolean,
  setShowInUsd: React.Dispatch<React.SetStateAction<boolean>>
): ColumnDef<TwapOrder> => ({
  id: "priceUsd",
  header: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            onClick={(e) => {
              e.stopPropagation();
              setShowInUsd((prev) => !prev);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
              }
            }}
            className="flex items-center gap-1 cursor-pointer select-none min-w-[93px]"
          >
            <span>Price</span>
            <span className="inline-flex items-center dark:text-skyblue text-blue font-normal gap-[1px] border-b border-dashed border-current pb-[1px]">
              <DollarCircledIcon />
              <span>{showInUsd ? "USD" : "Token"}</span>
            </span>
          </span>
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
  enableSorting: false,
  accessorFn: (row) => {
    const { priceUsd } = useParsedOrder(row);

    return priceUsd;
  },
  cell: ({ row }) => {
    const { sellAmount, buyAmount, priceUsd, sellToken } = useParsedOrder(
      row.original
    );
    if (!sellToken) return null;

    const tokenPrice = sellAmount / buyAmount;
    return (
      <span className="whitespace-nowrap">
        {showInUsd
          ? formatUSD(priceUsd)
          : `${tokenPrice.toFixed(2)} ${sellToken.symbol}`}
      </span>
    );
  },
});

export const FILLED_COLUMN: ColumnDef<TwapOrder> = {
  id: "filled",
  header: "Filled",
  enableSorting: false,
  accessorFn: (row) => {
    const { filledPercent } = useParsedOrder(row);
    return filledPercent;
  },
  cell: ({ row }) => {
    const { filledPercent, buyToken, sellAmountFilled, sellAmount } =
      useParsedOrder(row.original);
    if (!buyToken) return null;
    return (
      <div className="flex items-center gap-2 whitespace-nowrap">
        <span>
          {formatNumber(sellAmountFilled)}/{formatNumber(sellAmount)}{" "}
          {buyToken.symbol}
        </span>
        <Chip className="dark:!bg-slate-750 !bg-slate-200 !p-2 dark:text-slate-500 text-slate-450 !h-[28px]">
          {formatPercent(filledPercent)}
        </Chip>
      </div>
    );
  },
};

export const TIME_COLUMN: ColumnDef<TwapOrder> = {
  id: "time",
  header: "Time",
  enableSorting: false,
  accessorFn: (row) => row.createdAt,
  cell: ({ row }) => format(new Date(row.original.createdAt), "yyyy/MM/dd"),
};

export const ACTION_COLUMN: ColumnDef<TwapOrder> = {
  id: "action",
  header: () => <span className="hidden text-right md:block">Action</span>,
  enableSorting: false,
  accessorFn: (row) => row.id,
  cell: () => (
    <>
      <XMarkIcon
        className="hidden w-4 h-4 ml-auto cursor-pointer text-red md:block"
        aria-label="Cancel order"
      />
      <Button className="w-full md:hidden" variant="destructive" asChild>
        <span>Cancel</span>
      </Button>{" "}
    </>
  ),
};

export const EXPIRES_COLUMN: ColumnDef<TwapOrder> = {
  id: "expires",
  header: "Expires",
  enableSorting: false,
  accessorFn: (row) => row.deadline,
  cell: ({ row }) => format(new Date(row.original.deadline), "yyyy/MM/dd"),
};
