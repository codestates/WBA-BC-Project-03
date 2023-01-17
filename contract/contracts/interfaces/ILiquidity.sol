//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ILiquidity{
  
  function addLiquidity(uint256 _amount) external payable;  // 수정
  // 사용자 address에 liquidity 기록하기
  // 50대 50 -> 고정 상수값 가격 정해놓고 ->
  // -> function removeLiquidity(uint256 _amount) external payable; 
  // 기록된 liquidity 기준으로 remove
  // 전체 풀의 liquidity: x, 내가 뺴려는 liquidty: y
  // 풀에 전체 토큰, 코인이 x1, x2 , -> x1 * y/x, x2* y/x
  // 전체 liquidity 수정
  function swapTokenToCoin(uint256 _tokenAmount, uint256 _minCoin) external payable;		//
   function swapCoinToTokenTransfer(uint256 _minToken,address _recipient) external payable; // O
  // getSwapRatio로 가격 가져와서 swap
  // 수수료 wemex 1개
  // 받은 수수료 다 모아놓고 pullReward를 부를때 비율을 맞춰서 분배
  // 
  // -> function getOutputAmount(uint256 inputAmount, uint256 x, uint256 y) external pure returns (uint256);
  // 기본 기능 구현 후 아래 진행 예정
  // (uint256 liquidity, uint256 tokenAmount, uint256 coinAmount); 
  // 전체 풀의 liquidity 총량, 실체 예치된 토큰, 코인 총량 반환
  // -> function getUserLiquidity() external view returns(uint256 amount);		//
  // 사용자의 예치된 liquidity 총량, 
  function getSwapRatio(uint256 inputAmount, uint256 x, uint256 y) external pure returns (uint256); // O
  // swap 비율
  // -> function pullReward()external;
  // 리워드 전송
  // 리퀴디티 비율에 따라
  // event Transfer(address indexed from, address indexed to, uint value);
  // event SwapTokenToToken(address caller, address to, uint256 amount);
}


// TODO token to token


// 새로운 리퀴디티 풀을 배포하는 컨트랙트
// 관리자만 쓸 수 있는