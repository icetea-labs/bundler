import { ethers, BigNumberish, BigNumber, Contract } from 'ethers'
import { JsonRpcProvider, TransactionRequest } from '@ethersproject/providers'
import { SimpleAccountAPI, PaymasterAPI, HttpRpcClient } from '@account-abstraction/sdk'
import {
  DeterministicDeployer,
  IEntryPoint__factory, IEntryPointSimulations, PackedUserOperation,
  SimpleAccountFactory__factory
} from '@account-abstraction/utils'
import { parseEther, hexZeroPad, hexDataSlice } from 'ethers/lib/utils'
import { EntryPoint__factory, EntryPointSimulations__factory } from '@account-abstraction/utils/dist/src/types'
import EntryPointSimulationsJson from '@account-abstraction/contracts/artifacts/EntryPointSimulations.json'

const MNEMONIC = 'test test test test test test test test test test test junk'
const entryPointAddress = '0x1581bcE5FC34d62fB8BF240886B9eBdCd20020fd'
const rpcUrl = 'http://localhost:8545'
const bundlerUrl = 'http://localhost:3000/rpc'
const provider = new JsonRpcProvider(rpcUrl)

export interface ValidationData {
  aggregator: string
  validAfter: number
  validUntil: number
}

async function main () {
  const paymasterAPI = new PaymasterAPI(entryPointAddress, bundlerUrl)

  const token = '0xb287B3b21FBE8ae116788B22F413aF9fd179058d' // Address of the ERC-20 token
  const owner = ethers.Wallet.fromMnemonic(MNEMONIC).connect(provider)

  // await entryPoint.depositTo('0x40A6a0DbBF0175fb5287D1D91ed4088A0591334B', { value: parseEther('1') })
  // await entryPoint.addStake(1, { value: parseEther('1') })

  const detDeployer = new DeterministicDeployer(provider)
  const factoryAddress = await detDeployer.deterministicDeploy(new SimpleAccountFactory__factory(), 0, [entryPointAddress])

  const dest = ethers.Wallet.createRandom()
  const value = '0' // Amount of the ERC-20 token to transfer

  // Read the ERC-20 token contract
  const ERC20_ABI = require('./erc20Abi.json') // ERC-20 ABI in json format
  const erc20 = new ethers.Contract(token, ERC20_ABI, provider)
  const amount = ethers.utils.parseUnits(value)

  const approve = erc20.interface.encodeFunctionData('approve', [dest.address, amount])
  const transfer = erc20.interface.encodeFunctionData('transfer', [dest.address, amount])

  const accountAPI = new SimpleAccountAPI({
    provider,
    entryPointAddress,
    owner,
    factoryAddress,
    paymasterAPI
  })

  const accountContract = await accountAPI._getAccountContract()

  console.log('onwer balance before', await owner.getBalance())

  console.log('onwer contract balance before', await provider.getBalance(accountContract.address))

  const op = await accountAPI.createSignedUserOp({
    target: dest.address,
    data: accountContract.interface.encodeFunctionData('executeBatch', [
      [token, token],
      [0, 0],
      [approve, transfer]
    ])
  })
  // const res = await simulateValidation(packUserOp(op), entryPointAddress)
  // const validationData = parseValidationData(res.returnInfo.paymasterValidationData)
  // //
  // // console.log('packUserOp(userOp1)', packUserOp(userOp1))
  // console.log('packUserOp(op)', packUserOp(op))
  // console.log('validationData(op)', validationData)
  // Send the user operation
  const chainId = await provider.getNetwork().then(net => net.chainId)
  const client = new HttpRpcClient(bundlerUrl, entryPointAddress, chainId)
  const userOpHash = await client.sendUserOpToBundler(op)

  console.log('Waiting for transaction...')
  const transactionHash = await accountAPI.getUserOpReceipt(userOpHash)
  console.log(`Transaction hash: ${transactionHash}`)

  console.log('onwer balance after', await owner.getBalance())

  console.log('onwer contract balance after', await provider.getBalance(accountContract.address))
}

void main()
  .catch(e => { console.log(e); process.exit(1) })
  .then(() => process.exit(0))

export async function simulateValidation (
  userOp: PackedUserOperation,
  entryPointAddress: string,
  txOverrides?: any): Promise<IEntryPointSimulations.ValidationResultStructOutput> {
  const entryPointSimulations = EntryPointSimulations__factory.createInterface()
  const data = entryPointSimulations.encodeFunctionData('simulateValidation', [userOp])
  const tx: TransactionRequest = {
    to: entryPointAddress,
    data,
    ...txOverrides
  }
  const stateOverride = {
    [entryPointAddress]: {
      code: EntryPointSimulationsJson.deployedBytecode
    }
  }
  try {
    const simulationResult = await provider.send('eth_call', [tx, 'latest', stateOverride])
    const res = entryPointSimulations.decodeFunctionResult('simulateValidation', simulationResult)
    // note: here collapsing the returned "tuple of one" into a single value - will break for returning actual tuples
    return res[0]
  } catch (error: any) {
    const revertData = error?.data
    if (revertData != null) {
      // note: this line throws the revert reason instead of returning it
      entryPointSimulations.decodeFunctionResult('simulateValidation', revertData)
    }
    throw error
  }
}

export const maxUint48 = (2 ** 48) - 1

export function parseValidationData (validationData: BigNumberish): ValidationData {
  const data = hexZeroPad(BigNumber.from(validationData).toHexString(), 32)

  // string offsets start from left (msb)
  const aggregator = hexDataSlice(data, 32 - 20)
  let validUntil = parseInt(hexDataSlice(data, 32 - 26, 32 - 20))
  if (validUntil === 0) {
    validUntil = maxUint48
  }
  const validAfter = parseInt(hexDataSlice(data, 0, 6))

  return {
    aggregator,
    validAfter,
    validUntil
  }
}
