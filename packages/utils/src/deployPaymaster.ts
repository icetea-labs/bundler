import { JsonRpcProvider } from '@ethersproject/providers'
import { VerifyingPaymaster, VerifyingPaymaster__factory } from './soltypes'
import { DeterministicDeployer } from './DeterministicDeployer'
import { Signer } from 'ethers'

const entryPoint = '0x3bFc49341Aae93e30F6e2BE5a7Fa371cEbd5bea4'

export async function deployPaymaster (provider: JsonRpcProvider, signer: Signer): Promise<VerifyingPaymaster> {
  const addr = await new DeterministicDeployer(provider, signer).deterministicDeploy(new VerifyingPaymaster__factory(), 0, [entryPoint, await signer.getAddress()])

  return VerifyingPaymaster__factory.connect(addr, signer)
}
