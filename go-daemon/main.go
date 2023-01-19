package main

import (
	"context"
	conf "go-daemon/config"
	"go-daemon/model"
	"log"
	"math/big"
	"time"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
)

func main() {
	// config 초기화
	cf := conf.GetConfig("./config/config.toml")

	// model 초기화
	md, err := model.NewModel(cf.DB.Host)
	if err != nil {
		log.Fatal(err)
	}

	// ethclint 초기화
	client, err := ethclient.Dial(cf.Network.URL)
	if err != nil {
		log.Fatal(err)
	}

	// subscribe
	MaxRetries := 5
	dialRetries := MaxRetries
	logs := make(chan types.Log)
	contractAddress := common.HexToAddress("0x8fe4789d228d58247E3AB33Bb475d8FF7E37D351")
	query := ethereum.FilterQuery{
		Addresses: []common.Address{contractAddress},
	}
	deleteDuplicatePool := DeleteDuplicateItem(md.CheckPool())
	for _, value := range deleteDuplicatePool {
		poolAddress := common.HexToAddress(value)
		query.Addresses = append(query.Addresses, poolAddress)
	}
	sub, err := client.SubscribeFilterLogs(context.Background(), query, logs)
	if err != nil {
		log.Fatal(err)
	}

	for {
		select {
		case err := <-sub.Err():
			dialRetries = MaxRetries
			for err != nil && dialRetries > 0 {
				log.Println("Retries : ", dialRetries)
				if dialRetries != MaxRetries {
					time.Sleep(1000 * time.Millisecond)
				}
				client, err = ethclient.Dial(cf.Network.URL)
				dialRetries -= 1
				if err != nil {
					log.Fatal(err)
				}
			}
			sub, err = client.SubscribeFilterLogs(context.Background(), query, logs)
			if err != nil {
				log.Fatal(err)
			}
		case vlog := <-logs:

			block, err := client.BlockByNumber(context.Background(), new(big.Int).SetUint64(vlog.BlockNumber))
			if err != nil {
				log.Fatal(err)
			}

			// 블록 구조체 생성
			b := model.Block{
				BlockHash:    block.Hash().Hex(),
				BlockNumber:  block.Number().Uint64(),
				GasLimit:     block.GasLimit(),
				GasUsed:      block.GasUsed(),
				Time:         block.Time(),
				Nonce:        block.Nonce(),
				Transactions: make([]model.Transaction, 0),
			}

			// 트랜잭션 추출
			txs := block.Transactions()
			if len(txs) > 0 {
				for _, tx := range txs {
					msg, err := tx.AsMessage(types.LatestSignerForChainID(tx.ChainId()), block.BaseFee())
					if err != nil {
						log.Fatal(err)
					}

					// 트랜잭션 구조체 생성
					t := model.Transaction{
						TxHash:      tx.Hash().Hex(),
						To:          tx.To().Hex(),
						From:        msg.From().Hex(),
						Nonce:       tx.Nonce(),
						GasPrice:    tx.GasPrice().Uint64(),
						GasLimit:    tx.Gas(),
						Amount:      tx.Value().Uint64(),
						BlockHash:   block.Hash().Hex(),
						BlockNumber: block.Number().Uint64(),
					}
					b.Transactions = append(b.Transactions, t)
				}
			}

			// DB insert
			err = md.SaveBlock(&b)
			if err != nil {
				log.Fatal(err)
			}
			deleteDuplicatePool = DeleteDuplicateItem(md.CheckPool())
			for _, value := range deleteDuplicatePool {
				poolAddress := common.HexToAddress(value)
				query.Addresses = append(query.Addresses, poolAddress)
			}
		}
	}
}

func DeleteDuplicateItem(arr []model.Pool) []string {
	ret := []string{}
	m := make(map[string]struct{})

	for _, val := range arr {
		if _, ok := m[val.PoolAddress]; !ok {
			m[val.PoolAddress] = struct{}{}
			ret = append(ret, val.PoolAddress)
		}
	}

	return ret
}
