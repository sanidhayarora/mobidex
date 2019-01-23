import { BigNumber } from '0x.js';
import { Web3Wrapper } from '@0xproject/web3-wrapper';
import ethUtil from 'ethereumjs-util';
import ZeroExClient from '../clients/0x';
import EthereumClient from '../clients/ethereum';
import { findAssetByData, getFeeAsset } from './AssetService';
import {
  getAllowanceByAssetData,
  getBalanceByAssetData,
  getWeb3
} from './WalletService';

function parseMarketActionResult(result) {
  console.warn(result);
  if (result.length !== 258) return null;

  let prunedResult = result.substring(2);

  const makerAssetFilledAmount = new BigNumber(
    `0x${prunedResult.substring(0, 64)}`
  );
  const takerAssetFilledAmount = new BigNumber(
    `0x${prunedResult.substring(64, 128)}`
  );
  const makerFeePaid = new BigNumber(`0x${prunedResult.substring(128, 192)}`);
  const takerFeePaid = new BigNumber(`0x${prunedResult.substring(192, 256)}`);

  return {
    makerAssetFilledAmount,
    takerAssetFilledAmount,
    makerFeePaid,
    takerFeePaid
  };
}

export async function estimateMarketBuyOrders(orders, amount) {
  const web3 = getWeb3();
  const ethereumClient = new EthereumClient(web3);
  const zeroExClient = new ZeroExClient(ethereumClient);
  const wrappers = await zeroExClient.getContractWrappers();
  const transactionEncoder = await wrappers.exchange.transactionEncoderAsync();
  const account = await ethereumClient.getAccount();
  const gas = await web3.eth.estimateGas({
    from: `0x${ethUtil.stripHexPrefix(account.toString().toLowerCase())}`,
    data: transactionEncoder.marketBuyOrdersTx(orders, new BigNumber(amount)),
    to: wrappers.exchange.getContractAddress()
  });
  return new BigNumber(gas);
}

export async function callMarketBuyOrders(orders, amount) {
  const web3 = getWeb3();
  const ethereumClient = new EthereumClient(web3);
  const zeroExClient = new ZeroExClient(ethereumClient);
  const wrappers = await zeroExClient.getContractWrappers();
  const transactionEncoder = await wrappers.exchange.transactionEncoderAsync();
  const account = await ethereumClient.getAccount();
  const result = await web3.eth.call({
    from: `0x${ethUtil.stripHexPrefix(account.toString().toLowerCase())}`,
    data: transactionEncoder.marketBuyOrdersTx(orders, new BigNumber(amount)),
    to: wrappers.exchange.getContractAddress()
  });
  return parseMarketActionResult(result);
}

export async function validateMarketBuyOrders(orders, amount) {
  const fillResult = await callMarketBuyOrders(orders, amount);
  if (!fillResult) {
    throw new Error('Could not call market buy orders.');
  }
  const takerAsset = findAssetByData(orders[0].takerAssetData);
  const feeAsset = getFeeAsset();
  const quoteBalance = Web3Wrapper.toBaseUnitAmount(
    getBalanceByAssetData(takerAsset.assetData),
    takerAsset.decimals
  );
  const feeBalance = Web3Wrapper.toBaseUnitAmount(
    getBalanceByAssetData(feeAsset.assetData),
    feeAsset.decimals
  );
  const quoteAllowance = Web3Wrapper.toBaseUnitAmount(
    getAllowanceByAssetData(takerAsset.assetData),
    takerAsset.decimals
  );
  const feeAllowance = Web3Wrapper.toBaseUnitAmount(
    getAllowanceByAssetData(feeAsset.assetData),
    feeAsset.decimals
  );

  if (fillResult.takerAssetFilledAmount.gt(quoteBalance)) {
    throw new Error(`Not enough ${takerAsset.symbol} to process orders.`);
  }

  if (fillResult.takerAssetFilledAmount.gt(quoteAllowance)) {
    throw new Error(
      `${takerAsset.symbol} is still locked. Please unlock it to start trading.`
    );
  }

  if (fillResult.takerFeePaid.gt(feeBalance)) {
    throw new Error(`Not enough ${feeAsset.symbol} to process orders.`);
  }

  if (fillResult.takerFeePaid.gt(feeAllowance)) {
    throw new Error(
      `${feeAsset.symbol} is still locked. Please unlock it to start trading.`
    );
  }

  return fillResult;
}

export async function validateMarketSellOrders(orders, amount) {
  const fillResult = await callMarketSellOrders(orders, amount);
  if (!fillResult) {
    throw new Error('Could not call market sell orders.');
  }
  const takerAsset = findAssetByData(orders[0].takerAssetData);
  const feeAsset = getFeeAsset();
  const baseBalance = Web3Wrapper.toBaseUnitAmount(
    getBalanceByAssetData(takerAsset.assetData),
    takerAsset.decimals
  );
  const feeBalance = Web3Wrapper.toBaseUnitAmount(
    getBalanceByAssetData(feeAsset.assetData),
    feeAsset.decimals
  );
  const baseAllowance = Web3Wrapper.toBaseUnitAmount(
    getAllowanceByAssetData(takerAsset.assetData),
    takerAsset.decimals
  );
  const feeAllowance = Web3Wrapper.toBaseUnitAmount(
    getAllowanceByAssetData(feeAsset.assetData),
    feeAsset.decimals
  );

  if (fillResult.takerAssetFilledAmount.gt(baseBalance)) {
    throw new Error(`Not enough ${takerAsset.symbol} to process orders.`);
  }

  if (fillResult.takerAssetFilledAmount.gt(baseAllowance)) {
    throw new Error(
      `${takerAsset.symbol} is still locked. Please unlock it to start trading.`
    );
  }

  if (fillResult.takerFeePaid.gt(feeBalance)) {
    throw new Error(`Not enough ${feeAsset.symbol} to process orders.`);
  }

  if (fillResult.takerFeePaid.gt(feeAllowance)) {
    throw new Error(
      `${feeAsset.symbol} is still locked. Please unlock it to start trading.`
    );
  }

  return fillResult;
}

export async function estimateMarketSellOrders(orders, amount) {
  const web3 = getWeb3();
  const ethereumClient = new EthereumClient(web3);
  const zeroExClient = new ZeroExClient(ethereumClient);
  const wrappers = await zeroExClient.getContractWrappers();
  const transactionEncoder = await wrappers.exchange.transactionEncoderAsync();
  const account = await ethereumClient.getAccount();
  const gas = await web3.eth.estimateGas({
    from: `0x${ethUtil.stripHexPrefix(account.toString().toLowerCase())}`,
    data: transactionEncoder.marketSellOrdersTx(orders, new BigNumber(amount)),
    to: wrappers.exchange.getContractAddress()
  });
  return new BigNumber(gas);
}

export async function callMarketSellOrders(orders, amount) {
  const web3 = getWeb3();
  const ethereumClient = new EthereumClient(web3);
  const zeroExClient = new ZeroExClient(ethereumClient);
  const wrappers = await zeroExClient.getContractWrappers();
  const transactionEncoder = await wrappers.exchange.transactionEncoderAsync();
  const account = await ethereumClient.getAccount();
  const result = await web3.eth.call({
    from: `0x${ethUtil.stripHexPrefix(account.toString().toLowerCase())}`,
    data: transactionEncoder.marketSellOrdersTx(orders, new BigNumber(amount)),
    to: wrappers.exchange.getContractAddress()
  });
  return parseMarketActionResult(result);
}
