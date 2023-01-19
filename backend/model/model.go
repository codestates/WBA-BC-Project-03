package model

import (
	"context"
	"crypto/ecdsa"
	"encoding/hex"
	"fmt"
	contracts "lecture/WBA-BC-Project-03/backend/model/wemex/ERC20"
	"math/big"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/common/hexutil"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/ethereum/go-ethereum/rlp"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/crypto/sha3"
)

type Model struct {
	mongoClient              *mongo.Client
	colPool                  *mongo.Collection
	client                   *ethclient.Client
	tokenAddress             common.Address //컨트랙트 어드레스
	liquidityFactoryAddresss common.Address
}

func NewModel(mgUrl string) (*Model, error) {
	r := &Model{}
	var err error

	if r.mongoClient, err = mongo.Connect(context.Background(), options.Client().ApplyURI(mgUrl)); err != nil {
		return nil, err
	} else if err := r.mongoClient.Ping(context.Background(), nil); err != nil {
		return nil, err
	} else {
		db := r.mongoClient.Database("daemon")
		r.colPool = db.Collection("pool")
	}

	r.client, err = ethclient.Dial("https://api.test.wemix.com")
	if err != nil {
		fmt.Println("client error")
	}

	r.liquidityFactoryAddresss = common.HexToAddress("0x8fe4789d228d58247E3AB33Bb475d8FF7E37D351")
	return r, err
}

func (p *Model) BlockchainCreateTransferTx(pk string, dstAddress string, amount int64) string {
	// metamask에서 뽑아낸 privatekey를 변환
	privateKey, err := crypto.HexToECDSA(pk)
	if err != nil {
		fmt.Println(err)
	}

	// privatekey로부터 publickey를 거쳐 자신의 address 변환
	publicKey := privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		fmt.Println("fail convert, publickey")
	}
	// 보낼 address 설정
	fromAddress := crypto.PubkeyToAddress(*publicKeyECDSA)

	// 현재 계정의 nonce를 가져옴. 다음 트랜잭션에서 사용할 nonce
	nonce, err := p.client.PendingNonceAt(context.Background(), fromAddress)
	if err != nil {
		fmt.Println(err)
	}

	// 전송할 양, gasLimit, gasPrice 설정. 추천되는 gasPrice를 가져옴
	value := big.NewInt(amount)
	gasLimit := uint64(21000)
	gasPrice, err := p.client.SuggestGasPrice(context.Background())
	if err != nil {
		fmt.Println(err)
	}

	// 전송받을 상대방 address 설정
	toAddress := common.HexToAddress(dstAddress)
	// 트랜잭션 생성
	var data []byte
	tx := types.NewTransaction(nonce, toAddress, value, gasLimit, gasPrice, data)
	chainID, err := p.client.NetworkID(context.Background())
	if err != nil {
		fmt.Println(err)
	}

	// 트랜잭션 서명
	signedTx, err := types.SignTx(tx, types.NewEIP155Signer(chainID), privateKey)
	if err != nil {
		fmt.Println(err)
	}

	// RLP 인코딩 전 트랜잭션 묶음. 현재는 1개의 트랜잭션
	ts := types.Transactions{signedTx}
	// RLP 인코딩
	rawTxBytes, _ := rlp.EncodeToBytes(ts[0])
	rawTxHex := hex.EncodeToString(rawTxBytes)
	rTxBytes, err := hex.DecodeString(rawTxHex)
	if err != nil {
		fmt.Println(err.Error())
	}

	// RLP 디코딩
	rlp.DecodeBytes(rTxBytes, &tx)
	// 트랜잭션 전송
	err = p.client.SendTransaction(context.Background(), tx)
	if err != nil {
		fmt.Println(err)
	}
	//출력된 tx.hash를 익스플로러에 조회 가능
	fmt.Printf("tx sent: %s\n", tx.Hash().Hex())
	return tx.Hash().Hex()
}

func (p *Model) ContractCreateTransferTx(pk string, dstAddress string, amount int64) string {
	privateKey, err := crypto.HexToECDSA(pk)
	if err != nil {
		fmt.Println(err)
	}

	// privatekey로부터 publickey를 거쳐 자신의 address 변환
	publicKey := privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		fmt.Println("fail convert, publickey")
	}
	fromAddress := crypto.PubkeyToAddress(*publicKeyECDSA)

	// 현재 계정의 nonce를 가져옴. 다음 트랜잭션에서 사용할 nonce
	nonce, err := p.client.PendingNonceAt(context.Background(), fromAddress)
	if err != nil {
		fmt.Println(err)
	}
	// 전송할 양, gasLimit, gasPrice 설정. 추천되는 gasPrice를 가져옴
	value := big.NewInt(amount * 1000000000000000000)
	fmt.Println("value : ", value)
	// value := big.NewInt(700000000000000000)
	gasPrice, err := p.client.SuggestGasPrice(context.Background())
	if err != nil {
		fmt.Println(err)
	}

	// 보낼 주소
	toAddress := common.HexToAddress(dstAddress)

	// 컨트랙트 전송시 사용할 함수명
	transferFnSignature := []byte("transfer(address,uint256)")
	hash := sha3.NewLegacyKeccak256()
	hash.Write(transferFnSignature)
	methodID := hash.Sum(nil)[:4]
	fmt.Println(hexutil.Encode(methodID))

	paddedAddress := common.LeftPadBytes(toAddress.Bytes(), 32)
	fmt.Println(hexutil.Encode(paddedAddress)) // 0x0000000000000000000000004592d8f8d7b001e72cb26a73e4fa1806a51ac79d

	paddedAmount := common.LeftPadBytes(value.Bytes(), 32)
	fmt.Println(hexutil.Encode(paddedAmount)) // 0x00000000000000000000000000000000000000000000003635c9adc5dea00000
	zvalue := big.NewInt(0)
	//컨트랙트 전송 정보 입력
	var pdata []byte
	pdata = append(pdata, methodID...)
	pdata = append(pdata, paddedAddress...)
	pdata = append(pdata, paddedAmount...)

	gasLimit := uint64(200000)
	fmt.Println(gasLimit)

	// 트랜잭션 생성
	tx := types.NewTransaction(nonce, p.tokenAddress, zvalue, gasLimit, gasPrice, pdata)
	chainID, err := p.client.NetworkID(context.Background())
	if err != nil {
		fmt.Println(err)
	}

	// 트랜잭션 서명
	signedTx, err := types.SignTx(tx, types.NewEIP155Signer(chainID), privateKey)
	if err != nil {
		fmt.Println(err)
	}

	// 트랜잭션 전송
	err = p.client.SendTransaction(context.Background(), signedTx)
	if err != nil {
		fmt.Println(err)
	}

	//tx.hash를 이용해 전송결과를 확인
	fmt.Printf("tx sent: %s", signedTx.Hash().Hex())
	return signedTx.Hash().Hex()
}

func (p *Model) GetSymbolByToken(token string) string {
	instance, err := contracts.NewERC20(p.tokenAddress, p.client)
	if err != nil {
		panic(err)
	}
	name, err := instance.Name(&bind.CallOpts{})
	if err != nil {
		panic(err)
	}
	if name == token {
		symbol, err := instance.Symbol(&bind.CallOpts{})
		if err != nil {
			panic(err)
		}
		return symbol
	}
	return "no symbol"
}

func (p *Model) GetTokenWithAddress(address string) *big.Int {
	instance, err := contracts.NewERC20(p.tokenAddress, p.client)
	if err != nil {
		panic(err)
	}
	dstAddress := common.HexToAddress(address)
	bal, err := instance.BalanceOf(&bind.CallOpts{}, dstAddress)
	if err != nil {
		panic(err)
	}
	return bal
}

func (p *Model) TransferCoinWithAddress(address string, value int64) string {
	return p.BlockchainCreateTransferTx("f7b0033d5c91b7258b2557a66b1743195ffd77fc285b4cbba2ecd3f94d9c5939", address, value)
}

func (p *Model) TransferCoinWithPK(address string, pk string, value int64) string {
	return p.BlockchainCreateTransferTx(pk, address, value)
}
func (p *Model) TransferTokenWithAddress(address string, value int64) string {
	return p.ContractCreateTransferTx("f7b0033d5c91b7258b2557a66b1743195ffd77fc285b4cbba2ecd3f94d9c5939", address, value)
}

func (p *Model) TransferTokenWithPK(address string, pk string, value int64) string {
	return p.ContractCreateTransferTx(pk, address, value)
}

// func (p *Model) TxTracking(tx string) *protocol.ApiResponse[any] {
// 	filter := bson.M{"transactions": bson.M{"$elemMatch": bson.M{"hash": tx}}}
// 	result := p.colBlock.FindOne(context.TODO(), filter)
// 	if
// }

func (p *Model) UpsertAddress(address string) {
	filter := bson.M{"address": address}
	update := bson.M{"$set": bson.M{"address": address}}
	option := options.Update().SetUpsert(true)
	p.colPool.UpdateOne(context.TODO(), filter, update, option)
}
