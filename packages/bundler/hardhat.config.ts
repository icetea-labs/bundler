import '@nomiclabs/hardhat-ethers'
import '@nomicfoundation/hardhat-toolbox'
import 'hardhat-deploy'

import fs from 'fs'

import { HardhatUserConfig } from 'hardhat/config'
import { NetworkUserConfig } from 'hardhat/src/types/config'

const mnemonicFileName = process.env.MNEMONIC_FILE
let mnemonic = 'test '.repeat(11) + 'junk'
if (mnemonicFileName != null && fs.existsSync(mnemonicFileName)) {
  mnemonic = fs.readFileSync(mnemonicFileName, 'ascii').trim()
}

const infuraUrl = (name: string): string => `https://${name}.infura.io/v3/${process.env.INFURA_ID}`

function getNetwork (url: string): NetworkUserConfig {
  return {
    url,
    accounts: {
      mnemonic
    }
  }
}

function getInfuraNetwork (name: string): NetworkUserConfig {
  return getNetwork(infuraUrl(name))
}

const config: HardhatUserConfig = {
  typechain: {
    outDir: 'src/types',
    target: 'ethers-v5'
  },
  // defaultNetwork: "conla",
  networks: {
    localhost: {
      url: 'http://localhost:8545/',
      saveDeployments: false
    },
    conla: {
      url: 'https://testnet-rpc.conla.com/',
      accounts: ["a1d84702a5b654cb37f51ee52d054e8738b6fde0e974fea2ba1f20c0aed440d9"]
    },
    // goerli: getInfuraNetwork('goerli')
  },
  solidity: {
    version: '0.8.23',
    settings: {
      evmVersion: 'paris',
      optimizer: { enabled: true }
    }
  }
}

export default config
