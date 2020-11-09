import { ethErrors } from 'eth-json-rpc-errors'
import validUrl from 'valid-url'
// import { NETWORK_TO_NAME_MAP as DEFAULT_NETWORK_MAP } from '../../../controllers/network/enums'
import { isPrefixedFormattedHexString } from '../../util'
import { MESSAGE_TYPE } from '../../enums'

const addEthereumChain = {
  methodNames: [MESSAGE_TYPE.ADD_ETHEREUM_CHAIN],
  implementation: addEthereumChainHandler,
}
export default addEthereumChain

async function addEthereumChainHandler(
  req,
  res,
  _next,
  end,
  { origin, addCustomRpc, customRpcExistsWith, requestUserApproval },
) {
  if (!req.params?.[0] || typeof req.params[0] !== 'object') {
    return end(
      ethErrors.rpc.invalidParams({
        message: `Expected single, object parameter. Received:\n${req.params}`,
      }),
    )
  }

  const {
    chainId,
    blockExplorerUrl = null,
    networkName,
    rpcUrl,
    ticker,
  } = req.params[0]

  if (!validUrl.isHttpsUri(rpcUrl)) {
    return end(
      ethErrors.rpc.invalidParams({
        message: `Expected valid string HTTPS URL 'rpcUrl'. Received:\n${rpcUrl}`,
      }),
    )
  }

  const _chainId = typeof chainId === 'string' && chainId.toLowerCase()
  if (!isPrefixedFormattedHexString(_chainId)) {
    return end(
      ethErrors.rpc.invalidParams({
        message: `Expected 0x-prefixed, unpadded, non-zero hexadecimal string 'chainId'. Received:\n${chainId}`,
      }),
    )
  }

  // TODO: Check specified chain ID against endpoint chain ID, as in custom network form.

  // TODO: Disallow adding default networks
  // if (DEFAULT_NETWORK_MAP[_chainId]) {
  //   return end(ethErrors.rpc.invalidParams({
  //     message: `May not specify default MetaMask chain.`,
  //   }))
  // }

  if (typeof networkName !== 'string' || !networkName) {
    return end(
      ethErrors.rpc.invalidParams({
        message: `Expected non-empty string 'networkName'. Received:\n${networkName}`,
      }),
    )
  }
  const _networkName =
    networkName.length > 100 ? networkName.substring(0, 100) : networkName

  // TODO: how long should the ticker be?
  if (typeof ticker !== 'string' || ticker.length < 2 || ticker.length > 12) {
    return end(
      ethErrors.rpc.invalidParams({
        message: `Expected 3-12 character string 'ticker'. Received:\n${ticker}`,
      }),
    )
  }

  if (blockExplorerUrl !== null && !validUrl.isHttpsUri(blockExplorerUrl)) {
    return end(
      ethErrors.rpc.invalidParams({
        message: `Expected null or valid string HTTPS URL 'blockExplorerUrl'. Received: ${blockExplorerUrl}`,
      }),
    )
  }

  if (customRpcExistsWith({ rpcUrl, chainId: _chainId })) {
    return end(
      ethErrors.rpc.internal({
        message: `Ethereum chain with the given RPC URL and chain ID already exists.`,
        data: { rpcUrl, chainId },
      }),
    )
  }

  try {
    await addCustomRpc(
      await requestUserApproval({
        origin,
        type: MESSAGE_TYPE.ADD_ETHEREUM_CHAIN,
        requestData: {
          chainId: _chainId,
          blockExplorerUrl,
          networkName: _networkName,
          rpcUrl,
          ticker,
        },
      }),
    )
    res.result = null
  } catch (error) {
    return end(error)
  }
  return end()
}
