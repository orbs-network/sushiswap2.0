export const sushiswapV4CLPoolManagerAbi_getLiquidity = [
  {
    type: 'function',
    name: 'getLiquidity',
    inputs: [{ name: 'id', type: 'bytes32', internalType: 'PoolId' }],
    outputs: [{ name: 'liquidity', type: 'uint128', internalType: 'uint128' }],
    stateMutability: 'view',
  },
] as const
