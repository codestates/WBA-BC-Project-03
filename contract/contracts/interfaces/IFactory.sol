//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


interface IFactory{
  function getPool(address _tokenAddress) external view returns (address);
 
}