import type { PermitBatch } from 'src/lib/permit2/allowanceTransfer'
import type { Permit2Signature } from 'src/lib/permit2/types'
import { permit2Abi_permit } from 'sushi/abi'
import { type Address, type Hex, encodeFunctionData } from 'viem'

export const encodePermit2 = (
  owner: Address,
  permit2Signature: Permit2Signature,
) => {
  const { signature, details, spender, sigDeadline } = permit2Signature
  const permitSingle = {
    details: {
      token: details.token as `0x${string}`,
      amount: BigInt(details.amount),
      expiration: Number(details.expiration),
      nonce: Number(details.nonce),
    },
    spender: spender as `0x${string}`,
    sigDeadline: BigInt(sigDeadline),
  }

  return encodeFunctionData({
    abi: permit2Abi_permit,
    functionName: 'permit',
    args: [owner, permitSingle, signature],
  })
}

export const permit2Abi_permitBatch = [
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      {
        components: [
          {
            components: [
              { internalType: 'address', name: 'token', type: 'address' },
              { internalType: 'uint160', name: 'amount', type: 'uint160' },
              { internalType: 'uint48', name: 'expiration', type: 'uint48' },
              { internalType: 'uint48', name: 'nonce', type: 'uint48' },
            ],
            internalType: 'struct IAllowanceTransfer.PermitDetails',
            name: 'details',
            type: 'tuple[]',
          },
          { internalType: 'address', name: 'spender', type: 'address' },
          { internalType: 'uint256', name: 'sigDeadline', type: 'uint256' },
        ],
        internalType: 'struct IAllowanceTransfer.PermitSingle',
        name: 'permitBatch',
        type: 'tuple',
      },
      { internalType: 'bytes', name: 'signature', type: 'bytes' },
    ],
    name: 'permitBatch',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const

export const encodePermit2Batch = (
  owner: Address,
  permit2Batch: PermitBatch,
  signatures: Hex,
) => {
  const permitBatch = {
    details: permit2Batch.details.map((detail) => {
      return {
        token: detail.token as `0x${string}`,
        amount: BigInt(detail.amount),
        expiration: Number(detail.expiration),
        nonce: Number(detail.nonce),
      }
    }),
    spender: permit2Batch.spender as `0x${string}`,
    sigDeadline: BigInt(permit2Batch.sigDeadline),
  }

  return encodeFunctionData({
    abi: permit2Abi_permitBatch,
    functionName: 'permitBatch',
    args: [owner, permitBatch, signatures],
  })
}
