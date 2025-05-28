import { expect, test } from 'vitest'
import { decodePoolParameters } from './decodePoolParameters'
import { encodePoolParameters } from './encodePoolParameters'

test('decode clPool params', () => {
  expect(
    decodePoolParameters(
      '0x000000000000000000000000000000000000000000000000000000b730300000',
    ),
  ).toEqual({
    tickSpacing: -4771792,
    hooksRegistration: {},
  })

  expect(
    decodePoolParameters(
      '0x00000000000000000000000000000000000000000000000000000048cfd00000',
    ),
  ).toEqual({
    tickSpacing: 4771792,
    hooksRegistration: {},
  })

  expect(
    decodePoolParameters(
      '0x0000000000000000000000000000000000000000000000000000000000800000',
    ),
  ).toEqual({
    tickSpacing: 128,
    hooksRegistration: {},
  })

  expect(
    decodePoolParameters(
      '0x000000000000000000000000000000000000000000000000000000ffff800000',
    ),
  ).toEqual({
    tickSpacing: -128,
    hooksRegistration: {},
  })

  expect(
    decodePoolParameters(
      '0x00000000000000000000000000000000000000000000000000000000000a0040',
    ),
  ).toEqual({
    tickSpacing: 10,
    hooksRegistration: {
      beforeSwap: true,
    },
  })
})

const testCases = [
  {
    tickSpacing: 10,
    hooksRegistration: {
      beforeSwap: true,
    },
  },
  {
    tickSpacing: 128,
    hooksRegistration: {
      beforeSwap: true,
    },
  },
  {
    tickSpacing: 2 ** 23 - 1,
    hooksRegistration: {
      beforeSwap: true,
    },
  },
  {
    tickSpacing: -128,
    hooksRegistration: {
      beforeSwap: true,
    },
  },
  {
    tickSpacing: -(2 ** 23),
    hooksRegistration: {
      beforeSwap: true,
    },
  },
]

testCases.forEach((c) => {
  test(`decodeCLPoolParameters(encodeCLPoolParameters)`, () => {
    expect(decodePoolParameters(encodePoolParameters(c))).toEqual(c)
  })
})
