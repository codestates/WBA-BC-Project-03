const token = artifacts.require('WEMEXToken');
const liquidity1 = artifacts.require('Liquidity');
const liquidity2 = artifacts.require('Liquidity');
const _name = 'WEMEXToken';
const _symbol = 'MEX';
const _total_supply = web3.utils.toWei('100000', 'ether');
const tempToken = artifacts.require('TEMPToken');
const factory = artifacts.require('Factory');
module.exports = function (deployer) {
  deployer.deploy(token, _name, _symbol, _total_supply).then(() => {
    return deployer.deploy(liquidity1, token.address);
  });
  deployer
    .deploy(tempToken, 'temp', 'TMP', web3.utils.toWei('100000', 'ether'))
    .then(() => {
      return deployer.deploy(liquidity2, tempToken.address);
    });
  deployer.deploy(factory);
};
