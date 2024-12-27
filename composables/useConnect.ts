import { optimism, optimismSepolia } from '@wagmi/vue/chains'

export function useConnector () {
  const { IS_TESTNET } = useRuntimeConfig().public
  const chainId = IS_TESTNET ? optimismSepolia.id : optimism.id
  const { connectors, connect } = useConnect()
  const connector = connectors[0]
  return {
    connect: () => {
      return connect({ connector, chainId })
    }
  }
}
