//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./interfaces/ILiquidity.sol";
import "./interfaces/IFactory.sol";

contract Liquidity is ERC20{

  IFactory factory;
  IERC20 token;


  // 풀을 만들고자하는 토큰의 주소를 초기값으로 받는다.
  // 생성자를 통해 LP토큰의 Name과 Symbol을 넣어준다
constructor (address _token) ERC20("lpToken","LP"){
    factory = IFactory(msg.sender);
    token = IERC20(_token);
  }
  // [CPMM을 적용한 유동성 공급]
  // 공급 시 유동성 공급자는 Lp토큰을 받는다.
  // 조건 : 공급되는 위믹스와 토큰의 양은 1대1 비율로 공급되어야한다. 
  // 기존에 유동성이 존재할 떄
  // 예를들어 현재 풀에 위믹스 1000개, 토큰 500개가 있다.
  // 유동성 공급자가 추가로 200개의 위믹스를 공급하면 100개의 토큰이 함께 공급되어야 한다.
  function addLiquidity(uint256 _maxToken) public payable{
    //  해당 풀이 가지고 있는 전체 공급량
    uint256 totalLiquidity = totalSupply();

    // 유동성이 존재할 때
    if (totalLiquidity > 0){
      // 현재 풀에 존재하는 위믹스의 개수를 구한다.
      uint256 ethAmount = address(this).balance - msg.value;
      // 현재 풀에 존재하는 토큰의 개수를 구한다.
      uint256 tokenAmount = token.balanceOf(address(this));
      // 실제 유동성 공급하려는 토큰의 개수를 몇개를 집어넣을지 비율을 구해야한다.
      // 200 x (500/1000)
      uint256 inputTokenAmount = msg.value * tokenAmount / ethAmount;
      // 사용자가 입력한 토큰보다 적은 양을 liquidity 컨트랙트가 가져올 수 있도록 조건을 설정한다.
      require(_maxToken >= inputTokenAmount);
      // 발행될 LP 토큰의 개수를 구한다.
      // 유동성 공급자가 보내는 위믹스의 개수가 현재 풀에서 얼마나 차지하는지 비율을 구해 LP토큰의 발행량을 구한다.
      uint256 liquidityToken = totalLiquidity * msg.value / ethAmount;
      _mint(msg.sender,liquidityToken);
      token.transferFrom(msg.sender, address(this), inputTokenAmount);
    }else{
      // 유동성이 없을 때(초기)
      // 입력받은 토큰의 개수
      uint tokenAmount = _maxToken;
      // 가지고 있는 위믹스의 개수
      uint initLiquidity = address(this).balance;
      // 가지고 있던 위믹스의 개수 만큼 토큰을 발행한다.(Uniswap v1에서 단순하게 하기 위해 공급된 위믹스 개수와 맞춰서 LP토큰을 발행 함)
      _mint(msg.sender, initLiquidity);
      // 유동성 공급자가 가지고 있는 토큰을 Liquidity 컨트랙트에게 보낸다(공급한다)
      token.transferFrom(msg.sender, address(this), tokenAmount);
    }
  }

  function removeLiquidity(uint256 _lpTokenAmount) public {
    // 1. 전체 WEMIX의 개수를 가져온다.
    uint256 totalLiquidity = totalSupply();
    // 2. 유동성 공급자가 받아갈 WEMEI의 개수
    uint256 wemixAmount = _lpTokenAmount * address(this).balance / totalLiquidity;
    // 3. 유동성 공급자가 받아갈 토큰의 개수
    uint256 tokenAmount = _lpTokenAmount * token.balanceOf(address(this)) / totalLiquidity;
    // 4. LP토큰을 소각한다
    _burn(msg.sender, _lpTokenAmount);
    // 5. 유동성 공급자에게 WEMIX 위믹스을 보내준다.
    payable(msg.sender).transfer(wemixAmount);
    // 6. 유동성 공급자에게 토큰을 보내준다.
    token.transfer(msg.sender, tokenAmount);
  }



  
  // Exchange 컨트랙트가 현재 가지고 있는 위믹스의 개수를 보여주기 위함입니다.
  function getBalance() public view returns(uint256){
    return address(this).balance;
  }

  // _minToken : 슬리피지가 포함된 값, 최소 사용자에게 줘야하는 토큰, 사용자가 입력한 슬리피지 값
  function swapCoinToTokenTransfer(uint256 _minToken,address _recipient) public payable{
    coinToToken( _minToken, _recipient);
  }

  function coinToToken(uint256 _minToken, address _recipient) public payable{
    // 사용자게에 받은 위믹스의 양 
    uint256 inputAmount = msg.value;
    // Exchange가 가지고 있는 위믹스의 양
    uint256 x = address(this).balance - inputAmount;
    // Exchange가 가지고 있는 토큰의 양
    uint256 y = token.balanceOf(address(this));
    uint256 outputAmount = getSwapRatio(msg.value, x, y);
    require(outputAmount >= _minToken, "Insufficient output Amount");
    // 사용자가 입력한 최소의 슬리피지값 이상은 되야 교환가능하다.
    require(outputAmount >= _minToken , "lack of amount");
    // 사용자에게 보낸다.
    require(token.transfer(_recipient, outputAmount));
    
  }

  // _tokenAmount : 몇개의 토큰을 바꿀껀지
  // _minCoin : 슬리피지가 입력된 값(사용자가 최소 이정도는 받아야겠다라고 설정)
  function swapTokenToCoin(uint256 _tokenAmount, uint256 _minCoin) public payable{
    // 스왑 시 받을 위믹스 계산(CPMM)
    uint256 outputAmount = getSwapRatio(_tokenAmount, token.balanceOf(address(this)), address(this).balance);
    // 입력받은 슬리피지보다 많이 받아야한다.
    require(outputAmount >= _minCoin , "lack of amount");
    // 사용자가 토큰을 Liquidity(컨트랙트)에게 보내게한다.
    IERC20(token).transferFrom(msg.sender, address(this), _tokenAmount);
    // 위믹스를 보낸다. 함수를 호출한 사용자에게 CPMM 슬리피지가 적용된 양 만큼
    // payable(msg.sender) : https://ethereum.stackexchange.com/questions/113243/payablemsg-sender
    payable(msg.sender).transfer(outputAmount);
  }

  // CPMM
  // inputAmount : 사용자에게 받은 값,  1
  // x : liquidity의 input,  500 + 1 = 501
  // y : liquidity output, 1000
  function getSwapRatio(uint256 inputAmount, uint256 x, uint256 y) public pure returns (uint256){
    uint256 numerator = y * inputAmount; // 1000 x 1
    uint256 denominator = x + inputAmount; // 501 + 1
    return numerator/denominator;
  }

  // 스왑하는 사람에게 수수료를 제하고 준다.
  // 수수료는 1%
  // lp들이 유동성을 제거할 때 위믹스/ ERC20으로 수수료를 더 받아갈 수 있다.
    function getSwapRatioFee(uint256 inputAmount, uint256 x, uint256 y) public pure returns (uint256){
    uint256 fee = inputAmount * 99; // 1%를 적용시키기 위함
    uint256 numerator = y * fee;
    uint256 denominator = x + 100 * fee; 
    return numerator/denominator;
  }


// Uniswap V1에서는 Token To Token 스왑 시 Token To Coin, Coin To Token을 두번 사용하여 토큰끼리 스왑을 진행한다.
// 
// _tokenSold : 사용자가 입력한 스왑할 토큰의 수
// _minToken : 사용자가 받아야할 최소 토큰
// _minCoin : 사용자가 받아야할 최소 위믹스
// _tokenAddress : 바꾸려는 토큰의 주소
    function tokenToTokenSwap(
        uint256 _tokenAmount,
        uint256 _minToken,
        uint256 _minCoin,
        address _tokenAddress
    ) public {
        // 1. 토큰의 주소로 factory 컨트랙트에서 해당 토큰이랑 이루어진 Pool 주소를 가져온다.
        address tokenLiquidity = factory.getPool(_tokenAddress);

        // Token -> Coin
        // 2. 사용자가 받게 될 위믹스 양 계산
        uint256 coinOutputAmount = getSwapRatio(
            _tokenAmount,
            token.balanceOf(address(this)),
            address(this).balance
        );
        require(
            _minCoin <= coinOutputAmount,
            "Insufficient coin output amount"
        );
         // 3. 사용자에게 토큰을 가져온다.
        require(
            token.transferFrom(msg.sender, address(this), _tokenAmount),
            "fail transfer"
        );

        // Coin To Token
        // 4. factory 컨트랙트에서 찾은 상대 토큰의 풀에 위믹스를 보내고 토큰을 받는다
        ILiquidity(tokenLiquidity).swapCoinToTokenTransfer{
            value: coinOutputAmount
        }(_minToken, msg.sender);
    }
}