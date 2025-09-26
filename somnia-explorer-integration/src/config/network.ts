export const SOMNIA_CONFIG = {
  testnet: {
    name: 'Somnia Testnet',
    rpcUrl: 'https://dream-rpc.somnia.network',
    chainId: 50312,
    explorerUrl: 'https://shannon-explorer.somnia.network',
    explorerApiUrl: 'https://shannon-explorer.somnia.network/api'
  },
  mainnet: {
    name: 'Somnia Mainnet',
    rpcUrl: 'https://somnia-json-rpc.stakely.io',
    chainId: 5031,
    explorerUrl: 'https://explorer.somnia.network',
    explorerApiUrl: 'https://explorer.somnia.network/api'
  }
};

export const getCurrentNetwork = () => {
  return process.env.NODE_ENV === 'production' 
    ? SOMNIA_CONFIG.mainnet 
    : SOMNIA_CONFIG.testnet;
};

export type NetworkConfig = typeof SOMNIA_CONFIG.testnet;