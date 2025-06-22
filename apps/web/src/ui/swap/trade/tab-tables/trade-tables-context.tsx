import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  isTwapSupportedChainId,
  TWAP_SUPPORTED_CHAIN_IDS,
  TwapSupportedChainId,
} from "src/config";
import { TwapOrder, useTwapOrders } from "src/lib/hooks/react-query/twap";
import { useAccount } from "wagmi";

type TradeTablesContextType = {
  chainIds: TwapSupportedChainId[];
  currentTab: TABS;
  orders: TwapOrder[];
  ordersLoading: boolean;
  onChainChange: (chainId: TwapSupportedChainId) => void;
  setCurrentTab: (currentTab: TABS) => void;
};

export enum TABS {
  LIMIT_ORDERS = "limit-orders",
  DCA_ORDERS = "dca-orders",
  HISTORY = "history",
}

const Context = createContext<TradeTablesContextType>(
  {} as TradeTablesContextType
);
export const TradeTablesProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { chainId: accountChainId, address } = useAccount();
  const [chainIds, setChainIds] = useState<TwapSupportedChainId[]>([
    TWAP_SUPPORTED_CHAIN_IDS[0],
  ]);
  const [currentTab, setCurrentTab] = useState(TABS.LIMIT_ORDERS);

  useEffect(() => {
    if (accountChainId && isTwapSupportedChainId(accountChainId)) {
      setChainIds([accountChainId]);
    }
  }, [accountChainId]);

  const onChainChange = useCallback((chainId: TwapSupportedChainId) => {
    setChainIds((prev) => {
      if (prev.includes(chainId)) {
        return prev.filter((id) => id !== chainId);
      }
      return [...prev, chainId];
    });
  }, []);

  const { data: orders, isLoading: ordersLoading } = useTwapOrders({
    chainIds,
    account: address,
    enabled: true,
  });

  return (
    <Context.Provider
      value={{
        chainIds,
        onChainChange,
        currentTab,
        setCurrentTab,
        orders: orders?.ALL ?? [],
        ordersLoading,
      }}
    >
      {children}
    </Context.Provider>
  );
};

export const useTradeTablesContext = () => {
  return useContext(Context);
};
