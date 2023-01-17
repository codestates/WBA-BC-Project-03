const wemexToken = artifacts.require('WEMEXToken');
const tempToken = artifacts.require('TEMPToken');
const wemexTokenName = 'WEMEXToken';
const wemexTokenSymbol = 'WEMEX';
const wemexTokenSupply = web3.utils.toWei('100000', 'ether');
const tempTokenName = 'TEMPToken';
const tempTokenSymbol = 'TEMP';
const tempTokenSupply = web3.utils.toWei('100000', 'ether');
const factory = artifacts.require('Factory');
module.exports = function (deployer) {
  // deployer.deploy(token, _name, _symbol, _total_supply).then(() => {
  //   return deployer.deploy(liquidity1, token.address);
  // });
  deployer.deploy(
    wemexToken,
    wemexTokenName,
    wemexTokenSymbol,
    wemexTokenSupply
  );
  deployer.deploy(tempToken, tempTokenName, tempTokenSymbol, tempTokenSupply);
  deployer.deploy(factory);
};
