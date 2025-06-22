import {
  type Order,
  OrderStatus,
  buildOrder,
  getOrderFillDelayMillis,
  parseOrderStatus,
  zeroAddress,
} from "@orbs-network/twap-sdk";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { multicall } from "@wagmi/core";
import { useCallback, useMemo } from "react";
import {
  TWAP_SUPPORTED_CHAIN_IDS,
  type TwapSupportedChainId,
} from "src/config";
import { TwapSDK } from "src/lib/swap/twap";
import { twapAbi_status } from "src/lib/swap/twap/abi";
import type { Token, Type } from "sushi/currency";
import type { Address } from "sushi/types";
import { useConfig } from "wagmi";

export type TwapOrder = Order & {
  status: OrderStatus;
  fillDelayMs: number;
};

interface TwapOrdersStoreParams {
  account: Address | undefined;
}

export const usePersistedOrdersStore = ({ account }: TwapOrdersStoreParams) => {
  const queryClient = useQueryClient();

  const getKeys = useCallback(
    (chainId: TwapSupportedChainId) => {
      return {
        ordersKey: `orders-${chainId}:${account}`,
        cancelledOrderIdsKey: `cancelled-orders-${chainId}:${account}`,
      };
    },
    [account]
  );

  const getCreatedOrders = useCallback(
    (chainId: TwapSupportedChainId): Order[] => {
      const { ordersKey } = getKeys(chainId);
      const res = localStorage.getItem(ordersKey);
      if (!res) return [];
      return JSON.parse(res);
    },
    []
  );

  const getCancelledOrderIds = useCallback(
    (chainId: TwapSupportedChainId): number[] => {
      const { cancelledOrderIdsKey } = getKeys(chainId);
      const res = localStorage.getItem(cancelledOrderIdsKey);
      if (!res) return [];
      return JSON.parse(res);
    },
    []
  );

  const addCreatedOrder = useCallback(
    (
      chainId: TwapSupportedChainId,
      orderId: number,
      txHash: string,
      params: string[],
      srcToken: Token,
      dstToken: Type
    ) => {
      if (!account) return;

      const sdk = TwapSDK.onNetwork(chainId);

      const order = buildOrder({
        srcAmount: params[3],
        srcTokenAddress: srcToken.address,
        dstTokenAddress: dstToken.isToken ? dstToken.address : zeroAddress,
        srcAmountPerChunk: params[4],
        deadline: Number(params[6]) * 1000,
        dstMinAmountPerChunk: params[5],
        tradeDollarValueIn: "",
        blockNumber: 0,
        id: orderId,
        fillDelay: Number(params[8]),
        createdAt: Date.now(),
        txHash,
        maker: account,
        exchange: sdk.config.exchangeAddress,
        twapAddress: sdk.config.twapAddress,
        srcTokenSymbol: srcToken.symbol || "",
        dstTokenSymbol: dstToken.isToken ? dstToken.symbol || "" : "",
      });

      const orders = getCreatedOrders(chainId);
      if (orders.some((o) => o.id === order.id)) return;
      orders.push(order);
      localStorage.setItem(getKeys(chainId).ordersKey, JSON.stringify(orders));
      const queryKey = ["twap-orders", chainId, account];
      queryClient.setQueryData(queryKey, (orders?: TwapOrder[]) => {
        const _order = {
          ...order,
          status: OrderStatus.Open,
          fillDelayMs: getOrderFillDelayMillis(
            order,
            TwapSDK.onNetwork(chainId).config
          ),
        };
        if (!orders) return [_order];
        return [_order, ...orders];
      });
      queryClient.invalidateQueries({ queryKey });
    },
    [getCreatedOrders, queryClient, account]
  );
  const addCancelledOrderId = useCallback(
    (chainId: TwapSupportedChainId, orderId: number) => {
      const cancelledOrderIds = getCancelledOrderIds(chainId);
      const { cancelledOrderIdsKey } = getKeys(chainId);
      if (!cancelledOrderIds.includes(orderId)) {
        cancelledOrderIds.push(orderId);
        localStorage.setItem(
          cancelledOrderIdsKey,
          JSON.stringify(cancelledOrderIds)
        );
        queryClient.setQueryData(
          ["twap-orders", chainId, account],
          (orders?: TwapOrder[]) => {
            if (!orders) return [];
            return orders.map((order) => {
              if (order.id === orderId) {
                return { ...order, status: OrderStatus.Canceled };
              }
              return order;
            });
          }
        );
      }
    },
    [getCancelledOrderIds, queryClient, account]
  );
  const deleteCreatedOrder = useCallback(
    (chainId: TwapSupportedChainId, id: number) => {
      const { ordersKey } = getKeys(chainId);
      const orders = getCreatedOrders(chainId).filter(
        (order) => order.id !== id
      );
      localStorage.setItem(ordersKey, JSON.stringify(orders));
    },
    [getCreatedOrders]
  );
  const deleteCancelledOrderId = useCallback(
    (chainId: TwapSupportedChainId, orderId: number) => {
      const { cancelledOrderIdsKey } = getKeys(chainId);
      const cancelledOrderIds = getCancelledOrderIds(chainId).filter(
        (id) => id !== orderId
      );
      localStorage.setItem(
        cancelledOrderIdsKey,
        JSON.stringify(cancelledOrderIds)
      );
    },
    [getCancelledOrderIds]
  );

  return {
    getCreatedOrders,
    getCancelledOrderIds,
    addCreatedOrder,
    addCancelledOrderId,
    deleteCreatedOrder,
    deleteCancelledOrderId,
  };
};

interface TwapOrdersQueryParams {
  chainIds: TwapSupportedChainId[];
  account: Address | undefined;
  enabled?: boolean;
}

const useTwapOrdersQuery = ({
  chainIds,
  account,
  enabled = true,
}: TwapOrdersQueryParams) => {
  const config = useConfig();

  const {
    getCreatedOrders,
    getCancelledOrderIds,
    deleteCreatedOrder,
    deleteCancelledOrderId,
  } = usePersistedOrdersStore({ account });

  return useQueries({
    queries: chainIds.map((chainId) => ({
      queryKey: ["twap-orders", chainId, account],
      queryFn: async () => {
        if (!account || !config) throw new Error();

        const sdkOrders = await TwapSDK.onNetwork(chainId).getOrders(account);

        getCreatedOrders(chainId).forEach((localStorageOrder) => {
          if (sdkOrders.some((order) => order.id === localStorageOrder.id)) {
            // console.log(`removing order: ${localStorageOrder.id}`)
            deleteCreatedOrder(chainId, localStorageOrder.id);
          } else {
            // console.log(`adding order: ${localStorageOrder.id}`)
            sdkOrders.unshift(localStorageOrder);
          }
        });

        const multicallResponse = await multicall(config, {
          contracts: sdkOrders.map((order) => {
            return {
              abi: twapAbi_status,
              address: order.twapAddress as Address,
              functionName: "status",
              args: [order.id],
            };
          }),
        });

        const statuses = multicallResponse.map((it) => {
          return it.result as number;
        });

        const canceledOrders = new Set(getCancelledOrderIds(chainId));

        const orders = sdkOrders.map((order, index) => {
          let status = parseOrderStatus(order.progress, statuses?.[index]);
          if (canceledOrders.has(order.id)) {
            if (status !== OrderStatus.Canceled) {
              // console.log(`Cancelled added: ${order.id}`)
              status = OrderStatus.Canceled;
            } else {
              // console.log(`Cancelled removed: ${order.id}`)
              deleteCancelledOrderId(chainId, order.id);
            }
          }

          return {
            ...order,
            status,
            progress: status === OrderStatus.Completed ? 100 : order.progress,
            fillDelayMs: getOrderFillDelayMillis(
              order,
              TwapSDK.onNetwork(chainId).config
            ),
          } satisfies TwapOrder;
        });

        return orders;
      },
      refetchInterval: 20_000,
      enabled: Boolean(enabled && account && config),
    })),
  });
};

export const useTwapOrders = ({
  chainIds,
  account,
  enabled = true,
}: TwapOrdersQueryParams) => {
  const combinedOrdersQuery = useTwapOrdersQuery({
    chainIds,
    account,
    enabled,
  });
  return useMemo(() => {
    const orders = combinedOrdersQuery
      .map((it) => it.data)
      .filter((it) => it)
      .flat() as TwapOrder[];

    return {
      isLoading: combinedOrdersQuery.some((it) => it.isLoading),
      data: orders
        ? {
            ALL: orders as TwapOrder[],
            [OrderStatus.Open]: filterOrders(orders, OrderStatus.Open),
            [OrderStatus.Completed]: filterOrders(
              orders,
              OrderStatus.Completed
            ),
            [OrderStatus.Expired]: filterOrders(orders, OrderStatus.Expired),
            [OrderStatus.Canceled]: filterOrders(orders, OrderStatus.Canceled),
          }
        : undefined,
    };
  }, [combinedOrdersQuery]);
};

const filterOrders = (orders: TwapOrder[], status: OrderStatus) => {
  return orders.filter((order) => order.status === status);
};
