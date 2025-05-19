import { createInfoToast } from '@sushiswap/notifications'
import { List, SelectIcon } from '@sushiswap/ui'
import Image from 'next/image'
import { useMobileDetect } from '~kadena/_common/lib/hooks/use-mobile-detect'
import { useKadena } from '~kadena/kadena-wallet-provider'

export const WalletListView = ({
  isFullWidth = false,
}: { isFullWidth?: boolean }) => {
  const { adapters, handleConnect } = useKadena()
  const { isMobile } = useMobileDetect()

  return (
    <List
      className={`flex flex-col gap-1 !p-0 ${
        isFullWidth
          ? '[width:calc(var(--radix-popover-trigger-width)_-_10px)]'
          : ''
      }`}
    >
      <List.Control className="bg-gray-100">
        {adapters.map((adapter) => (
          <List.MenuItem
            icon={() => (
              <Image
                src={adapter.imageURI}
                alt={adapter.name}
                width={25}
                height={25}
                className="max-h-[25px]"
              />
            )}
            className="flex items-center justify-start w-full min-w-[180px] text-left"
            key={adapter.name}
            title={adapter.name === 'Ecko' ? 'eckoWALLET' : adapter.name}
            onClick={() => {
              if (isMobile && adapter?.name === 'Ecko') {
                createInfoToast({
                  summary:
                    'eckoWALLET is currently only supported on desktop. Please switch devices or select another wallet to proceed.',
                  type: 'send',
                  account: undefined,
                  chainId: 1,
                  groupTimestamp: Date.now(),
                  timestamp: Date.now(),
                })
                return
              }
              adapter.detected
                ? handleConnect(adapter.name)
                : window.open(adapter.installUrl, '_blank')
            }}
            hoverIcon={() => <SelectIcon className="-rotate-90" />}
          />
        ))}
      </List.Control>
    </List>
  )
}
