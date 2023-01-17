//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Liquidity.sol";
contract Factory {


  mapping(address => address) public pool;

  function createPool(address _erc20Token) public returns (address) {
    // pool 하나 생성
    Liquidity liquidity = new Liquidity(_erc20Token);
    // 토큰의 주소로 => 해당 Pool을 저장한다.
    pool[_erc20Token] = address(liquidity);
    
    return address(liquidity);
  }

  function getPool(address _tokenAddress) public view returns (address){
    // 주소로 풀을 확인할 수 있다.
    return pool[_tokenAddress];
  }
}