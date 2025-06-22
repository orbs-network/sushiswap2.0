import { XMarkIcon } from "@heroicons/react/24/outline";
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
import { ParsedTwapOrder, useParsedOrder } from "src/ui/swap/twap/twap-hooks";
import { formatUSD } from "sushi/format";
import { formatPercent } from "sushi/format";
import { formatNumber } from "sushi/format";

export const FILLED_COLUMN: ColumnDef<TwapOrder> = {
  id: "filled",
  header: "Filled",
  enableSorting: false,
  accessorFn: (row) => {
    const { filledPercent } = useParsedOrder(row);
    return filledPercent;
  },
  cell: ({ row }) => {
    const { buyToken, buyAmountFilled } = useParsedOrder(row.original);
    if (!buyToken) return null;
    return (
      <div className="flex items-center gap-1 md:gap-2 whitespace-nowrap min-w-[130px]">
        <Currency.Icon disableLink currency={buyToken} width={24} height={24} />{" "}
        <span>
          {formatNumber(buyAmountFilled)} {buyToken.symbol}
        </span>
      </div>
    );
  },
};

export const SIZE_COLUMN: ColumnDef<TwapOrder> = {
  id: "size",
  header: "Size",
  enableSorting: false,
  accessorFn: (row) => {
    const { sellAmount } = useParsedOrder(row);
    return sellAmount;
  },
  cell: ({ row }) => {
    const { sellToken, sellAmount, sellAmountUSD } = useParsedOrder(
      row.original
    );
    if (!sellToken) return null;
    return (
      <div className="flex items-center gap-1 md:gap-2 whitespace-nowrap">
        <Currency.Icon
          disableLink
          currency={sellToken}
          width={24}
          height={24}
        />{" "}
        <div className="flex flex-col">
          <span>
            {formatNumber(sellAmount)} {sellToken.symbol}
          </span>
          <span className="hidden text-xs font-normal dark:text-slate-500 text-slate-450 md:block">
            {formatUSD(sellAmountUSD)}
          </span>
        </div>
      </div>
    );
  },
};

export const SPENT_COLUMN: ColumnDef<TwapOrder> = {
  id: "spent",
  header: "Spent",
  enableSorting: false,
  accessorFn: (row) => {
    const { sellAmountFilled } = useParsedOrder(row);
    return sellAmountFilled;
  },
  cell: ({ row }) => {
    const {
      sellAmountFilled,
      sellAmount,
      sellToken,
      remainingOrders,
      totalOrders,
      filledPercent,
    } = useParsedOrder(row.original);

    if (!sellToken) return null;
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span>
            {formatNumber(sellAmountFilled)} {sellToken.symbol}
          </span>
          <Chip className="dark:!bg-slate-750 !bg-slate-200 !p-2 dark:text-slate-500 text-slate-450 !h-[20px]">
            {formatPercent(filledPercent)}
          </Chip>
        </div>
        <span className="text-xs font-normal dark:text-slate-500 text-slate-450">
          {remainingOrders}/{totalOrders} Order Remaining
        </span>
      </div>
    );
  },
};

export const getAvgPriceColumn = (
  showInUsd: boolean,
  setShowInUsd: React.Dispatch<React.SetStateAction<boolean>>
): ColumnDef<TwapOrder> => ({
  id: "avgPriceUsd",
  header: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="flex items-center gap-1 cursor-pointer select-none w-[100px]"
            onClick={(e) => {
              e.stopPropagation();
              setShowInUsd((prev) => !prev);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
              }
            }}
          >
            <span>Avg. Price</span>
            <span className="inline-flex items-center dark:text-skyblue text-blue font-normal gap-[1px] border-b border-dashed border-current pb-[1px]">
              <DollarCircledIcon />
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
  enableSorting: false,
  accessorFn: (row) => {
    const { avgPriceUsd } = useParsedOrder(row);
    return showInUsd ? avgPriceUsd : avgPriceUsd;
  },
  cell: ({ row }) => {
    const { avgPriceUsd, sellToken, createdAt } = useParsedOrder(row.original);
    if (!sellToken) return null;
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            {showInUsd ? (
              <span>{formatUSD(avgPriceUsd)}</span>
            ) : (
              <span className="whitespace-nowrap">{`${avgPriceUsd} ${sellToken.symbol}`}</span>
            )}
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            className="dark:bg-black/10 bg-white/10 py-4 px-5 grid grid-cols-2 w-[270px] text-xs gap-2"
          >
            <div className="grid w-full grid-cols-2 col-span-2 gap-2">
              <div className="font-medium text-black dark:text-pink-100">
                Created
              </div>
              <div className="text-slate-700 dark:text-pink-200">
                {format(new Date(createdAt), "MM/dd/yy h:mm a")}
              </div>
            </div>
            <div className="grid w-full grid-cols-2 col-span-2 gap-2">
              <div className="font-medium text-black dark:text-pink-100">
                Frequency
              </div>
              <div className="text-slate-700 dark:text-pink-200">
                Every 5 Minutes
              </div>
            </div>
            <div className="grid w-full grid-cols-2 col-span-2 gap-2">
              <div className="font-medium text-black dark:text-pink-100">
                Duration
              </div>
              <div className="text-slate-700 dark:text-pink-200">
                25 Minutes
              </div>
            </div>
            <div className="grid w-full grid-cols-2 col-span-2 gap-2">
              <div className="font-medium text-black dark:text-pink-100">
                Each Order Size
              </div>
              <div className="text-slate-700 dark:text-pink-200">
                1,600 USDT
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  },
});

export const EXPIRES_COLUMN: ColumnDef<TwapOrder> = {
  id: "expires",
  header: "Expires",
  enableSorting: false,
  accessorFn: (row) => {
    const { expiresAt } = useParsedOrder(row);
    return expiresAt;
  },
  cell: ({ row }) => {
    const { expiresAt } = useParsedOrder(row.original);

    const formattedDate = format(new Date(expiresAt), "MM/dd/yy h:mm a");
    return <span className="whitespace-nowrap">{formattedDate}</span>;
  },
};

export const CHAIN_COLUMN: ColumnDef<TwapOrder> = {
  id: "chain",
  header: "Chain",
  enableSorting: false,
  accessorFn: (row) => row.chainId,
  cell: ({ row }) => {
    const { chain } = useParsedOrder(row.original);
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

export const ACTION_COLUMN: ColumnDef<TwapOrder> = {
  id: "action",
  header: () => <span className="hidden md:text-right md:block">Action</span>,
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
