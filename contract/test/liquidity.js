const Liquidity = artifacts.require('Liquidity');
const { expect } = require('chai');
const { ethers, providers } = require('ethers');

const web3 = require('web3');
const { toWei, toBN, fromWei } = web3.utils;
const Token = artifacts.require('WEMEXToken');

contract('Liquidity', (accounts) => {
  let token;
  let liquidity;
  // contract() 실행 후 & 내부의 테스트 함수들이 실행되기 전에 실행되는 부분
  before(async () => {
    console.log(accounts);
    token = await Token.deployed();
    console.log('Token Contract Address:', token.address);
    liquidity = await Liquidity.deployed();
    console.log('exchangeInstance Address', liquidity.address);
  });

  describe.skip('Token 생성자', async () => {
    it('Token은 TotalSupply로 10000WEMEX토큰을 가지고 있어야한다.', async () => {
      let totalSupply = await token.totalSupply();
      let temp = web3.utils.toBN(totalSupply).toString();
      // console.log('totalSupply', web3.utils.toBN(totalSupply).toString());
      // assert.equal(web3.utils.toBN(totalSupply).toString()), web3.utils.toWei('100', 'ether'));
      // console.log('totalSupply: ', web3.utils.toBN(totalSupply).toString());

      // token은 처음에 100를 가지고 있다.
      expect(web3.utils.toBN(totalSupply).toString()).to.equal(
        web3.utils.toWei('100000', 'ether')
      );
    });
  });
  describe('유동성 공급', async () => {
    it('유동성 공급한다. (유동성이 0인 상태)', async () => {
      console.log('토큰 : 1000, 이더 : 500');
      // liquidity 컨트랙트에게 1000개의 WEMEX토큰을 사용할 수 있도록 승인
      await token.approve(liquidity.address, toWei('1000', 'ether'));
      // 유동성 공급자는 500개의 WEMEX 토큰과 1000개의 이더리움을 Exchange 컨트랙트에 유동성 공급한다.
      await liquidity.addLiquidity(toWei('1000', 'ether'), {
        value: toWei('500', 'ether'),
      });
      // Exchange 컨트랙트의 잔고는 500이더가 있어야한다.
      let exchangeBalance = await liquidity.getBalance();
      expect(toBN(exchangeBalance).toString()).to.equal(toWei('500', 'ether'));

      //  Exchange 컨트랙트에 들어간 토큰 개수는 1000개여야한다.
      var balance = await token.balanceOf(liquidity.address);
      expect(toBN(balance).toString()).to.equal(toWei('1000', 'ether'));
    });
    it('유동성을 공급한다.(기존에 유동성이 들어가 있는 상태)', async () => {
      let liquidityTokenBalance = await token.balanceOf(liquidity.address);
      let liquidityBalance = await liquidity.getBalance();
      console.log(
        'liquidityTokenBalance : ',
        toBN(liquidityTokenBalance).toString()
      );
      console.log('liquidityBalance : ', toBN(liquidityBalance).toString());
      let tempRatio = await liquidity.getSwapRatio(
        web3.utils.toWei('1', 'ether'),
        liquidityBalance,
        liquidityTokenBalance
      );
      console.log('유동성 추가 전 슬리피지 적용: ', toBN(tempRatio).toString());
      console.log('유동성 추가 \n토큰 : 100, 이더 : 50');
      await token.approve(liquidity.address, toWei('100', 'ether'));
      await liquidity.addLiquidity(toWei('100', 'ether'), {
        value: toWei('50', 'ether'),
      });

      liquidityTokenBalance = await token.balanceOf(liquidity.address);
      liquidityBalance = await liquidity.getBalance();
      console.log(
        'liquidityTokenBalance : ',
        toBN(liquidityTokenBalance).toString()
      );
      console.log('liquidityBalance : ', toBN(liquidityBalance).toString());
      tempRatio = await liquidity.getSwapRatio(
        web3.utils.toWei('1', 'ether'),
        liquidityBalance,
        liquidityTokenBalance
      );
      console.log('유동성 추가 후 슬리피지 적용: ', toBN(tempRatio).toString());

      // let exchangeBalance = await liquidity.getBalance();
      // // expect(toBN(exchangeBalance).toString()).to.equal(toWei('1200', 'ether'));
      // console.log(toBN(exchangeBalance).toString());
      // //  Exchange 컨트랙트에 들어간 토큰 개수는 500개여야한다.
      // var balance = await token.balanceOf(liquidity.address);
      // console.log(toBN(balance).toString());
      // // expect(toBN(balance).toString()).to.equal(toWei('600', 'ether'));
    });
    it('토큰의 유동성이 더 많은 상태에서의 스왑', async () => {
      await liquidity.swapCoinToToken(toWei('4', 'ether'), {
        from: accounts[1],
        value: toWei('5', 'ether'),
      });

      console.log(toBN(await token.balanceOf(accounts[1])).toString());

      // // account[1] 사용자가 5이더를 Exchange 컨트랙트에게 WEMEX 토큰 5개로 바꿔달라고 한다.
      // let exchangeBalance = await liquidity.getBalance();
      // expect(toBN(exchangeBalance).toString()).to.equal(
      //   web3.utils.toWei('17', 'ether')
      // );
      // // // Exchange 컨트랙트의 WEMEX토큰 잔고는 80개에서 5개를 사용자에게 줘서 75개가 남는다.
      // var balance = await token.balanceOf(liquidity.address);
      // console.log('balance', toBN(balance).toString());
      // expect(toBN(balance).toString()).to.equal(toWei('75', 'ether'));
    });
  });
  describe.skip('스왑 ', async () => {
    it('사용자가 이더를 주면 그 양만큼 토큰을 준다.', async () => {
      // liquidity 컨트랙트에게 100개의 WEMEX토큰을 사용할 수 있도록 승인
      await token.approve(liquidity.address, web3.utils.toWei('100', 'ether'));
      // 유동성 공급자는 70개의 WEMEX 토큰과 10개의 이더리움을 Exchange 컨트랙트에 유동성 공급한다.
      await liquidity.addLiquidity(web3.utils.toWei('70', 'ether'), {
        value: web3.utils.toWei('10', 'ether'),
      });

      // account[1] 사용자가 5이더를 Exchange 컨트랙트에게 WEMEX 토큰 5개로 바꿔달라고 한다.
      await liquidity.ethToERC20CSMMSwap({
        from: accounts[1],
        value: web3.utils.toWei('5', 'ether'),
      });

      // Exchange 컨트랙트는 앞서 유동성 공급자에게 2개의 이더를 받았고, 최근 유동성 공급자에게 10개를 추가로 받았다.
      // 그리고 사용자에게 스왑을 위해 5개의 이더를 추가로 받았다.
      let exchangeBalance = await liquidity.getBalance();
      expect(web3.utils.toBN(exchangeBalance).toString()).to.equal(
        web3.utils.toWei('17', 'ether')
      );
      // Exchange 컨트랙트의 WEMEX토큰 잔고는 80개에서 5개를 사용자에게 줘서 75개가 남는다.
      var balance = await token.balanceOf(liquidity.address);
      console.log('balance', web3.utils.toBN(balance).toString());
      expect(web3.utils.toBN(balance).toString()).to.equal(
        web3.utils.toWei('75', 'ether')
      );
    });
  });

  describe.skip('CPMM', async () => {
    it('단순 슬리피지 계산', async () => {
      await token.approve(liquidity.address, web3.utils.toWei('50', 'ether'));
      // 유동성 공급자가 40개의 토큰과 10개의 이더리움을 추가로 공급했다. (총 27개 이더 보유/115개 토큰 보유)
      await liquidity.addLiquidity(web3.utils.toWei('40', 'ether'), {
        value: web3.utils.toWei('10', 'ether'),
      });
      // 사용자는 1이더를 넣었을 때 몇개의 토큰을 받게될까
      let exchangeBalance = await liquidity.getBalance();

      // 115000000000000000000 토큰
      // 27000000000000000000 이더리움
      // 사용자는 1이더 넣으면 4.25925925926 기대함
      // y 115 토큰 / x 27 이더 = 4.25....토큰을 기대한다.

      // 하지만 실제로는 4.107142857142857142 토큰을 얻게된다.
      // x 27이더 + 1이더 = 28
      // y 115토큰
      // 받게될 토큰 = 27(기존 이더) + 1(사용자에게 받을 이더) / 115(기존 토큰)
      // 받게될 토큰 = 4.107142857142857142
      console.log(
        '몇개의 이더리움? =>',
        web3.utils.toBN(exchangeBalance).toString()
      );
      // 21개 이더리움

      let exchangeTokenBalance = await token.balanceOf(liquidity.address);
      console.log(
        '거래소에는 몇개의 토큰? ->',
        web3.utils.toBN(exchangeTokenBalance).toString()
      );

      let temp = await liquidity.getOuputAmount(
        web3.utils.toWei('1', 'ether'),
        web3.utils.toBN(exchangeBalance).toString(),
        web3.utils.toBN(exchangeTokenBalance).toString()
      );
      // 1이더를 넣었을 때 받게되는 토큰의 양
      console.log(web3.utils.fromWei(web3.utils.toBN(temp).toString()));
      expect(web3.utils.fromWei(web3.utils.toBN(temp).toString())).to.equal(
        '4.107142857142857142'
      );

      let temp2 = await liquidity.getOuputAmount(
        web3.utils.toWei('115', 'ether'),
        web3.utils.toBN(exchangeBalance).toString(),
        web3.utils.toBN(exchangeTokenBalance).toString()
      );
      // 1이더를 넣었을 때 받게되는 토큰의 양
      console.log(web3.utils.fromWei(web3.utils.toBN(temp2).toString()));
    });
  });
  describe.skip('swap coin to token', async () => {
    it('사용자는 이더리움을 넣고 CPMM 알고리즘에 의해 토큰을 받을 수 있다.', async () => {
      await token.approve(liquidity.address, toWei('1000', 'ether'));

      // 유동성 공급 => 토큰 1000 : 이더 200
      await liquidity.addLiquidity(toWei('1000', 'ether'), {
        from: accounts[0],
        value: toWei('200', 'ether'),
      });

      // 현재 유동성: 토큰 1000개, 이더 200개
      // 사용자가 1개의 토큰을 넣는다. => 사용자는 1개를 넣으면 토큰 5개를 받을 것으로 예상
      // 실제 받은 토큰은 497.xx개의 토큰을 받음

      // 받을 토큰 y는 = 1000MEX * 1 / 200ETH + 1

      let liquidityTokenBalance = await token.balanceOf(liquidity.address);
      let liquidityBalance = await liquidity.getBalance();
      console.log(
        'liquidityTokenBalance : ',
        toBN(liquidityTokenBalance).toString()
      );
      console.log('liquidityBalance : ', toBN(liquidityBalance).toString());
      let tempRatio = await liquidity.getSwapRatio(
        web3.utils.toWei('1', 'ether'),
        liquidityBalance,
        liquidityTokenBalance
      );

      console.log('슬리피지 적용 시 : ', toBN(tempRatio).toString());

      await liquidity.swapCoinToToken(toWei('1', 'ether'), {
        from: accounts[1],
        value: web3.utils.toWei('1', 'ether'),
      });

      let accountTokenBalance = await token.balanceOf(accounts[1]);
      console.log(
        'address가 받은 Token : ',
        toBN(accountTokenBalance).toString()
      );
    });
  });
  describe.skip('swap token to coin', async () => {
    it('사용자는 토큰을 넣고 CPMM 알고리즘에 의해 위믹스 코인을 받을 수 있다.', async () => {
      await token.transfer(accounts[1], toWei('5000', 'ether'));
      let sender = await token.balanceOf(accounts[1]);
      console.log('accounts[1]: ', toBN(sender).toString());

      await token.approve(liquidity.address, toWei('1000', 'ether'));
      // 유동성 공급 => 토큰 1000 : 이더 200
      await liquidity.addLiquidity(toWei('200', 'ether'), {
        from: accounts[0],
        value: toWei('200', 'ether'),
      });

      // 현재 유동성 : 토큰 1000개, 이더 200개
      // 사용자가 1개의 토큰을 넣는다. => 사용자는 토큰 1개를 넣으면 위믹스 코인 0.2개를 받을 것으로 예상
      // 실제 받은 토큰은 497.xx개의 토큰을 받음

      // 받을 토큰 y는 = 200WEMIX * 1 / 200Token + 1

      let liquidityTokenBalance = await token.balanceOf(liquidity.address);
      let liquidityBalance = await liquidity.getBalance();
      console.log(
        'liquidityTokenBalance : ',
        toBN(liquidityTokenBalance).toString()
      );
      console.log('liquidityBalance : ', toBN(liquidityBalance).toString());
      let tempRatio = await liquidity.getSwapRatio(
        toWei('1', 'ether'),
        liquidityTokenBalance,
        liquidityBalance
      );

      console.log('슬리피지 적용 시 : ', toBN(tempRatio).toString());
      console.log(accounts[1]);
      sender = await token.balanceOf(accounts[1]);

      await token.approve(liquidity.address, toWei('1000', 'ether'), {
        from: accounts[1],
      });
      await liquidity.swapTokenToCoin(
        toWei('2', 'ether'),
        toWei('1', 'ether'),
        { from: accounts[1] }
      );

      // let accountTokenBalance = await token.balanceOf(accounts[1]);
      // console.log(
      //   'address가 받은 Token : ',
      //   toBN(accountTokenBalance).toString()
      // );
    });
  });
});
