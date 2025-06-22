import {
  eqIgnoreCase,
  getOrderExcecutionRate,
  OrderStatus,
  OrderType,
  zeroAddress,
  TwapFill,
} from "@orbs-network/twap-sdk";
import { TwapOrder } from "src/lib/hooks/react-query/twap";
import { useSearchTokens } from "src/lib/wagmi/components/token-selector/hooks/use-search-tokens";
import { EvmChainId } from "sushi";
import { Native, type Type } from "sushi/currency";
import { type TokenListChainId } from "@sushiswap/graph-client/data-api";
import { formatUnits } from "viem";
import * as chains from "viem/chains";
import { usePrice } from "~evm/_common/ui/price-provider/price-provider/use-price";

export interface ParsedTwapOrder {
  id: string;
  chain: {
    id: number;
    name: string;
  };
  buyToken: Type | undefined;
  sellToken: Type | undefined;
  sellAmount: number;
  buyAmount: number;
  status: OrderStatus;
  txHash: string;
  sellAmountUSD: number;
  avgPriceUsd: number;
  pnlPercent: number;
  createdAt: number;
  priceUsd: number;
  expiresAt: number;
  sellAmountFilled: number;
  buyAmountFilled: number;
  filledPercent: number;
  totalOrders: number;
  remainingOrders: number;
  pnlUsd: number;
  explorerUrl: string;
  frequency: number;
  filledDate?: number;
  fills: TwapFill[];
}

const safeFormatUnits = (value: string, decimals?: number): number => {
  try {
    return Number(formatUnits(BigInt(value), decimals ?? 18));
  } catch (error) {
    return 0;
  }
};

export const useTwapOrderToken = (
  address?: string,
  chainId?: number
): Type | undefined => {
  const { data: token } = useSearchTokens({
    chainId: chainId as TokenListChainId,
    search: address,
  });

  if (eqIgnoreCase(address ?? "", zeroAddress) && chainId) {
    return Native.onChain(chainId as EvmChainId);
  }

  return token?.[0];
};

const getExplorerUrl = (chainId: number) => {
  switch (chainId) {
    case EvmChainId.ARBITRUM:
      return chains.arbitrum.blockExplorers?.default.url;
    case EvmChainId.BASE:
      return chains.base.blockExplorers?.default.url;
    case EvmChainId.ETHEREUM:
      return chains.mainnet.blockExplorers?.default.url;
    default:
      return "";
  }
};

export const useParsedOrder = (order: TwapOrder): ParsedTwapOrder => {
  const sellToken = useTwapOrderToken(order.srcTokenAddress, order.chainId);
  const buyToken = useTwapOrderToken(order.dstTokenAddress, order.chainId);

  const sellAmountFilled = safeFormatUnits(
    order.filledSrcAmount,
    sellToken?.decimals
  );
  const buyAmountFilled = safeFormatUnits(
    order.filledDstAmount,
    buyToken?.decimals
  );

  return {
    id: order.id.toString(),
    chain: {
      id: order.chainId,
      name: "",
    },
    sellAmountUSD: Number(order.tradeDollarValueIn ?? "0"),
    pnlPercent: 0,
    sellAmountFilled: sellAmountFilled,
    buyAmountFilled: buyAmountFilled,
    filledPercent: order.progress,
    createdAt: order.createdAt,
    priceUsd: Number(order.tradeDollarValueIn ?? "0"),
    sellAmount: safeFormatUnits(order.srcAmount, sellToken?.decimals),
    filledDate: order.filledDate,
    buyAmount:
      order.type === OrderType.TWAP_MARKET
        ? 0
        : safeFormatUnits(order.dstMinAmount, buyToken?.decimals),
    sellToken,
    buyToken,
    expiresAt: order.deadline,
    txHash: order.txHash,
    explorerUrl: `${getExplorerUrl(order.chainId)}/tx/${order.txHash}`,
    status: order.status,
    totalOrders: order.chunks,
    pnlUsd: 0,
    remainingOrders: order.chunks - (order.fills?.length ?? 0),
    avgPriceUsd: 0,
    frequency: order.fillDelayMs,
    fills: order.fills ?? [],
  };
};


export const useParsedDcaOrder = (order: TwapOrder) => {
  const parsedOrder = useParsedOrder(order);
  return {
    id: parsedOrder.id,
  };
};

const statusToText = (status: OrderStatus) => {
  switch (status) {
    case OrderStatus.Open:
      return "Open";
    case OrderStatus.Expired:
      return "Expired";
    case OrderStatus.Canceled:
      return "Cancelled";
    case OrderStatus.Completed:
      return "Completed";
  }
};

export const useParsedLimitOrder = (order: TwapOrder) => {
  const parsedOrder = useParsedOrder(order);

  const buyTokenPriceFor1Token =
    Number(order.filledDollarValueOut ?? "0") / parsedOrder.buyAmountFilled;

  const buyTokensFor1SellToken = getOrderExcecutionRate(
    order,
    parsedOrder.sellToken?.decimals ?? 18,
    parsedOrder.buyToken?.decimals ?? 18
  );

  const valueUsd =
    Number(buyTokensFor1SellToken) *
    buyTokenPriceFor1Token *
    parsedOrder.sellAmount;

  const buyTokenPerOrder = safeFormatUnits(
    order.dstMinAmountPerChunk,
    parsedOrder.buyToken?.decimals
  );

  return {
    id: parsedOrder.id,
    createdAt: parsedOrder.createdAt,
    sellToken: parsedOrder.sellToken,
    buyToken: parsedOrder.buyToken,
    chain: parsedOrder.chain,
    sellAmount: parsedOrder.sellAmount,
    buyAmount: parsedOrder.buyAmount,
    buyTokenFilled: parsedOrder.buyAmountFilled,
    buyTokenTotal: safeFormatUnits(
      order.dstMinAmount,
      parsedOrder.buyToken?.decimals
    ),
    filledPercent: parsedOrder.filledPercent,
    status: parsedOrder.status,
    isOpen: parsedOrder.status === OrderStatus.Open,
    statusText: statusToText(parsedOrder.status),
    explorerUrl: parsedOrder.explorerUrl,
    expiresAt: parsedOrder.expiresAt,
    valueUsd,
    pnlUsd: valueUsd - parsedOrder.sellAmountUSD,
    priceUsd: buyTokenPerOrder * buyTokenPriceFor1Token,
    buyTokenPerOrder,
    rawOrder: order,
  };
};

export type LimitOrder = ReturnType<typeof useParsedLimitOrder>;

export const getTwapLimitOrders = (orders: TwapOrder[]) => {
  const keys = [OrderType.TWAP_LIMIT, OrderType.LIMIT];
  return orders.filter((order) => keys.includes(order.type));
};

export const getTwapDcaOrders = (orders: TwapOrder[]) => {
  return orders.filter((order) => order.type === OrderType.TWAP_MARKET);
};
