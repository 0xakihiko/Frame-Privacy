import log from 'electron-log'
import Pylon from '@framelabs/pylon-client'

import store from '../store'
import Inventory from './inventory'
import Rates from './assets'
import { arraysMatch, debounce } from '../../resources/utils'
import Balances from './balances'

export interface DataScanner {
  close: () => void
}

const storeApi = {
  getActiveAddress: () => (store('selected.current') || '') as Address,
  getCustomTokens: () => (store('main.tokens.custom') || []) as Token[],
  getKnownTokens: (address?: Address) => ((address && store('main.tokens.known', address)) || []) as Token[],
  getConnectedNetworks: () => {
    const networks = (Object.values(store('main.networks.ethereum') || {})) as Network[]
    return networks
      .filter(n => (n.connection.primary || {}).connected || (n.connection.secondary || {}).connected)
  }
}

export default function () {
  const pylonEndpoint = store('main.privacy.pylonEndpointCustom')
  const pylon = new Pylon(`wss://data.${pylonEndpoint}`)

  const inventory = Inventory(pylon, store)
  const rates = Rates(pylon, store)
  const balances = Balances(store)

  let connectedChains: number[] = [], activeAccount: Address = ''

  inventory.start()
  rates.start()
  balances.start()

  const handleNetworkUpdate = debounce((newlyConnected: number[]) => {
    log.verbose('updating external data due to network update(s)', { connectedChains, newlyConnected })

    rates.updateSubscription(connectedChains, activeAccount)

    if (newlyConnected.length > 0 && activeAccount) {
      balances.addNetworks(activeAccount, newlyConnected)
    }
  }, 500)

  const handleAddressUpdate = debounce(() => {
    log.verbose('updating external data due to address update(s)', { activeAccount })

    balances.setAddress(activeAccount)
    inventory.setAddresses([activeAccount])
    rates.updateSubscription(connectedChains, activeAccount)
  }, 800)

  const handleTokensUpdate = debounce((tokens: Token[]) => {
    log.verbose('updating external data due to token update(s)', { activeAccount })

    if (activeAccount) {
      balances.addTokens(activeAccount, tokens)
    }

    rates.updateSubscription(connectedChains, activeAccount)
  })

  const allNetworksObserver = store.observer(() => {
    const connectedNetworkIds = storeApi.getConnectedNetworks().map(n => n.id).sort()

    if (!arraysMatch(connectedChains, connectedNetworkIds)) {
      const newlyConnectedNetworks = connectedNetworkIds.filter(c => !connectedChains.includes(c))
      connectedChains = connectedNetworkIds

      handleNetworkUpdate(newlyConnectedNetworks)
    }
  }, 'externalData:networks')

  const activeAddressObserver = store.observer(() => {
    const activeAddress = storeApi.getActiveAddress()
    const knownTokens = storeApi.getKnownTokens(activeAddress)

    if (activeAddress !== activeAccount) {
      activeAccount = activeAddress
      handleAddressUpdate()
    } else {
      handleTokensUpdate(knownTokens)
    }
  }, 'externalData:activeAccount')

  const customTokensObserver = store.observer(() => {
    const customTokens = storeApi.getCustomTokens()
    handleTokensUpdate(customTokens)
  }, 'externalData:customTokens')

  return {
    close: () => {
      allNetworksObserver.remove()
      activeAddressObserver.remove()
      customTokensObserver.remove()

      inventory.stop()
      rates.stop()
      balances.stop()
    }
  } as DataScanner
}
