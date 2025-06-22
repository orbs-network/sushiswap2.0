import { OrderStatus } from "@orbs-network/twap-sdk";
import { Button, TooltipContent } from "@sushiswap/ui";
import { TooltipTrigger } from "@sushiswap/ui";
import { Tooltip } from "@sushiswap/ui";
import { TooltipProvider } from "@sushiswap/ui";
import { DollarCircledIcon } from "@sushiswap/ui/icons/DollarCircled";
import { NetworkIcon } from "@sushiswap/ui/icons/NetworkIcon";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Currency } from "node_modules/@sushiswap/ui/dist/components/currency";
import { TwapOrder } from "src/lib/hooks/react-query/twap";
import { fillDelayText } from "src/lib/swap/twap";
import { useParsedOrder } from "src/ui/swap/twap/twap-hooks";
import { formatNumber, formatUSD } from "sushi/format";
import { usePrice } from "~evm/_common/ui/price-provider/price-provider/use-price";

export const ORDER_ID_COLUMN: ColumnDef<TwapOrder> = {
  id: "orderId",
  header: "Order ID",
  enableSorting: false,
  accessorFn: (row) => row.id,
  cell: ({ row }) => (
    <div className="w-full min-w-[80px]">{row.original.id}</div>
  ),
};

export const FILLED_COLUMN: ColumnDef<TwapOrder> = {
  id: "filled",
  header: "Filled",
  enableSorting: false,
  accessorFn: (row) => {
    const { buyAmountFilled } = useParsedOrder(row);

    return buyAmountFilled;
  },
  cell: ({ row }) => {
    const { buyToken, sellAmountFilled } = useParsedOrder(row.original);
    if (!buyToken) return null;
    return (
      <div className="flex items-center gap-2 whitespace-nowrap">
        <Currency.Icon currency={buyToken} width={24} height={24} />
        <span>
          {formatNumber(sellAmountFilled)} {buyToken.symbol}
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
    const { sellToken, sellAmount } = useParsedOrder(row.original);
    if (!sellToken) return null;
    return (
      <div className="flex items-center gap-2 whitespace-nowrap">
        <Currency.Icon currency={sellToken} width={24} height={24} />
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

export const VALUE_COLUMN: ColumnDef<TwapOrder> = {
  id: "valueUsd",
  header: "Value",
  enableSorting: false,
  accessorFn: (row) => {
    const { sellAmountUSD } = useParsedOrder(row);

    return sellAmountUSD;
  },
  cell: ({ row }) => {
    const { sellAmountUSD } = useParsedOrder(row.original);
    return <span>{formatUSD(sellAmountUSD)}</span>;
  },
};

export const getAvgPriceColumn = (
  showInUsd: boolean,
  setShowInUsd: React.Dispatch<React.SetStateAction<boolean>>
): ColumnDef<TwapOrder> => ({
  id: "avgPriceUsd",
  enableSorting: false,
  header: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="flex items-center gap-1 cursor-pointer select-none min-w-[110px]"
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
  accessorFn: (row) => {
    const { avgPriceUsd } = useParsedOrder(row);

    return avgPriceUsd;
  },
  cell: ({ row }) => {
    const { sellAmount, sellAmountFilled, totalOrders, sellToken } =
      useParsedOrder(row.original);

    const tokenPrice =
      sellAmount && sellAmountFilled ? sellAmountFilled / totalOrders : 0;
    const { data: sellTokenPrice = 0, isLoading: isSellTokenPriceLoading } =
      usePrice({
        chainId: sellToken?.chainId,
        address: sellToken?.wrapped?.address,
        enabled: !!sellToken,
      });
    console.log(tokenPrice);

    return showInUsd ? (
      <span>{formatUSD(sellTokenPrice * tokenPrice)}</span>
    ) : (
      <span className="whitespace-nowrap">{`${tokenPrice} ${sellToken?.symbol}`}</span>
    );
  },
});

export const ORDERS_COLUMN: ColumnDef<TwapOrder> = {
  id: "orders",
  header: "Orders",
  enableSorting: false,
  accessorFn: (row) => {
    const { totalOrders } = useParsedOrder(row);

    return totalOrders;
  },
  cell: ({ row }) => {
    const { totalOrders, frequency } = useParsedOrder(row.original);

    return (
      <div className="flex flex-col">
        <span className="whitespace-nowrap">{totalOrders} Orders</span>
        <span className="text-xs dark:text-slate-500 text-slate-450 whitespace-nowrap">
          Every {fillDelayText(frequency)}
        </span>
      </div>
    );
  },
};

export const STATUS_COLUMN: ColumnDef<TwapOrder> = {
  id: "status",
  header: () => <div className="text-right">Status</div>,
  enableSorting: false,
  accessorFn: (row) => row.status,
  cell: ({ row }) => {
    const { filledDate, status, expiresAt } = useParsedOrder(row.original);
    const date = status === OrderStatus.Completed ? filledDate : expiresAt;
    return (
      <div className="flex flex-col">
        <span className="whitespace-nowrap">
          <span className="capitalize">{status.toLocaleLowerCase()} On</span>
        </span>
        {date && (
          <span className="text-xs dark:text-slate-500 text-slate-450 whitespace-nowrap">
            {format(new Date(date), "MM/dd/yy h:mm a")}
          </span>
        )}
      </div>
    );
  },
};

export const ACTION_COLUMN: ColumnDef<TwapOrder> = {
  id: "action",
  header: "Action",
  enableSorting: false,
  accessorFn: (row) => row.id,
  cell: () => (
    <Button className="w-full md:hidden" variant="tradePrimary">
      View Orders
    </Button>
  ),
};

export function makeActionColumn(
  onView: (row: TwapOrder) => void
): ColumnDef<TwapOrder> {
  return {
    id: "action",
    header: "Action",
    enableSorting: false,
    cell: ({ row }) => (
      <Button
        className="w-full"
        variant="tradePrimary"
        onClick={(e) => {
          e.stopPropagation();
          onView(row.original);
        }}
      >
        View Orders
      </Button>
    ),
  };
}
