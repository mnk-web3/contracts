import { FunctionComponent, useState } from "react";
import { Container, Row, Col } from "react-bootstrap";
import { DMNKNavbar, NavbarProps, AccountResultKind } from "./components/navbar/Navbar";
import {
  AccountIsNotAvailable, WaitingForContractPlayReaction, NewGameBeingCreated,
  UnavailabitlityReason
} from "./components/WaitScreens";
import DMNKMainMenu, { GameSettings } from "./components/MainMenu";
import { Board, CurrentTurn } from "./components/game/Board";
import { LocalstorageKey } from "./constants";
import { Account } from "web3-core";


import Web3 from "web3";

const GAS_PRICE = "30000000000"
const GAS_AMOUNT = "5000000"

enum NetworkType {
  HarmonyTestnet,
  HarmonyMainnet
}


function networkTypeToWeb3Instance(networkType: NetworkType): Web3 {
  switch (networkType) {
    case NetworkType.HarmonyMainnet: {
      return new Web3("https://api.harmony.one");
    }
    case NetworkType.HarmonyTestnet: {
      // return new Web3("https://api.s0.b.hmny.io");
      return new Web3("wss://ws.s0.pops.one/");
    }
  }
}


enum CurrentScreen {
  Main = "Main",
  WaitingForPlayResponse = "WaitingForPlayResponse",
  GamePending = "GamePending",
  GamePlaying = "GamePlaying"
}


export type AppProps = {
  dmnkABI: any,
  dmnkAddress: string,
  gameInstanceABI: any,
  addGame: (address: string) => void,
  dropGame: (address: string) => void,
  getGames: () => Set<string>
}


const App: FunctionComponent<AppProps> = (props) => {
  const [currentScreen, setCurrentScreen] = useState(CurrentScreen.Main);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [gameSettings, setGameSettings] = useState<GameSettings | null>(null);
  const [gameAddress, setGameAddress] = useState<string | null>(null);
  const [opponentAddress, setOpponentAddress] = useState<string | null>(null);
  const [web3Instance, setWeb3Instance] = useState(
    networkTypeToWeb3Instance(NetworkType.HarmonyTestnet)
  )
  // Main dmnk contract instance
  const [dmnkContract, setDMNKContract] = useState(
    new web3Instance.eth.Contract(props.dmnkABI, props.dmnkAddress)
  );

  const mainProps: NavbarProps = {
    dmnkAddress: props.dmnkAddress,
    createAccount: (password: string) => {
      const newWallet = web3Instance.eth.accounts.wallet.create(1);
      newWallet.save(password);
      setCurrentAccount(newWallet[0]);
    },
    getBalance: async (acc: Account) => {
      return parseFloat(
        web3Instance.utils.fromWei(
          await web3Instance.eth.getBalance(acc.address)
        )
      )
    },
    getAccount: () => {
      // account is there and it is unlocked
      if (currentAccount != null) {
        return {
          kind: AccountResultKind.Exists,
          value: currentAccount
        }
      }
      // no account for you, create first
      else if (window.localStorage.getItem(LocalstorageKey) == null) {
        return {
          kind: AccountResultKind.NonExists,
          value: null
        };
      }
      // account is there but it is locked
      else {
        return {
          kind: AccountResultKind.Locked,
          value:
            (password: string) => {
              try {
                // wallet.load will raise an exception on the wrong password
                setCurrentAccount(web3Instance.eth.accounts.wallet.load(password)[0]);
                return true
              }
              catch {
                return false
              }
            }
        }
      }
    }
  }

  let componentToShow;
  switch (currentScreen) {
    case (CurrentScreen.Main): {
      componentToShow =
        <DMNKMainMenu
          getBalance={async () => { return mainProps.getBalance(currentAccount!) }}
          onGameSettingsReady={
            (settings) => {
              setGameSettings(settings)
              setCurrentScreen(CurrentScreen.WaitingForPlayResponse)
            }
          }
        />
      break
    }
    case (CurrentScreen.WaitingForPlayResponse): {
      componentToShow =
        <WaitingForContractPlayReaction
          onInsufficientBalance={() => {
            setCurrentScreen(CurrentScreen.Main)
          }}
          onGameCreated={
            (response) => {
              props.addGame(response.gameAddress)
              setGameAddress(response.gameAddress)
              setCurrentScreen(CurrentScreen.GamePending)
            }
          }
          onGameFound={
            (response) => {
              props.addGame(response.gameAddress)
              setGameAddress(response.gameAddress)
              setOpponentAddress(response.opponentAddress)
              setCurrentScreen(CurrentScreen.GamePlaying)
            }
          }
          getPlayResponse={
            () =>
              dmnkContract
                .methods
                .play(
                  web3Instance.utils.toWei(gameSettings!.range_from.toString()),
                  web3Instance.utils.toWei(gameSettings!.range_to.toString()),
                )
                .send(
                  {
                    "from": currentAccount!.address,
                    "value": web3Instance.utils.toWei(gameSettings!.bid.toString()),
                    "gas": GAS_AMOUNT,
                    "gasPrice": GAS_PRICE,
                  },
                )
          }
        />
      break
    }
    case (CurrentScreen.GamePending): {
      componentToShow =
        <NewGameBeingCreated
          gameAddress={gameAddress!}
          gameSettings={gameSettings!}
          waitForOpponent={
            () => {
              return (
                new Promise(
                  (resolve, reject) => {
                    dmnkContract.events
                      .GameStarted({ filters: { gameAddress: gameAddress! }, fromBlock: 0 })
                      .on(
                        "data",
                        (event: any) => resolve(event.returnValues.bob)
                      )
                  }
                )
              )
            }
          }
          proceedAfterOpponentFound={
            (address) => {
              setOpponentAddress(address)
              setCurrentScreen(CurrentScreen.GamePlaying)
            }
          }
          proceedAfterCancellation={
            () => {
              setCurrentScreen(CurrentScreen.Main)
            }
          }
          cancelGame={
            async () => {
              const receipt: any = (
                await
                  (new web3Instance.eth.Contract(props.gameInstanceABI, gameAddress!))
                    .methods
                    .cancel()
                    .send(
                      {
                        "from": currentAccount!.address,
                        "gas": GAS_AMOUNT,
                        "gasPrice": GAS_PRICE,
                      }
                    )
              )
              receipt.status && props.dropGame(gameAddress!)
              return receipt.status
            }
          }
        />
      break
    }
    case (CurrentScreen.GamePlaying): {
      componentToShow =
        <Board
          gameAddress={gameAddress!}
          opponentAddress={opponentAddress!}
          dimensions={{ width: 25, height: 25 }}
          getLockedValue={
            async () => {
              return parseFloat(
                web3Instance.utils.fromWei(
                  await
                    (new web3Instance.eth.Contract(props.gameInstanceABI, gameAddress!))
                      .methods
                      .getLockedValue()
                      .call()
                )
              )
            }
          }
          getCurrentTurn={
            async () => {
              const address = await
                (new web3Instance.eth.Contract(props.gameInstanceABI, gameAddress!))
                  .methods
                  .getCurrentTurn()
                  .call()
              return (address == currentAccount!.address) ? CurrentTurn.Mine : CurrentTurn.NotMine
            }
          }
          appendMyMove={
            (x, y) => {
              return (
                new Promise(
                  (resolve, _) => {
                    (new web3Instance.eth.Contract(props.gameInstanceABI, gameAddress!))
                      .methods
                      .makeMove(x.toString(), y.toString())
                      .send(
                        {
                          "from": currentAccount!.address,
                          "gas": GAS_AMOUNT,
                          "gasPrice": GAS_PRICE,
                        }
                      )
                      .then((receipt: any) => resolve(receipt.status))
                      .catch((_: any) => resolve(false))
                  }
                )
              )
            }
          }
          getOpponentMove={
            () => {
              // Here I have to promisify
              return new Promise(
                (resolve, reject) => {
                  (new web3Instance.eth.Contract(props.gameInstanceABI, gameAddress!))
                    .events
                    .Move({ fromBlock: 0 })
                    .on(
                      "data",
                      (event: any) => {
                        if (event.returnValues.player != currentAccount!.address) {
                          resolve({ x: parseInt(event.returnValues.x), y: parseInt(event.returnValues.y) })
                        }
                      }
                    )
                    .on("error", reject)
                }
              )
            }
          }
          waitForFinish={
            () =>
              new Promise(
                (resolve, _) => {
                  dmnkContract.events
                    .GameFinished({ filters: { gameAddress: gameAddress! }, fromBlock: 0 })
                    .on(
                      "data",
                      (event: any) => {
                        resolve(event.returnValues.winnerAddress)
                      }
                    )
                }
              )
          }
          onFinish={
            (address) => {
              props.dropGame(gameAddress!)
              setCurrentScreen(CurrentScreen.Main)
            }
          }
        />
    }
  }

  return (
    <Container className="vh-100 main-container">
      <DMNKNavbar {...mainProps} />
      <Row className="align-items-center h-100">
        <Col>
          {
            (currentAccount == null)
              ? <AccountIsNotAvailable
                reason={
                  window.localStorage.getItem(LocalstorageKey) == null
                    ? UnavailabitlityReason.DoesNotExist
                    : UnavailabitlityReason.Locked
                }
              />
              : componentToShow
          }
        </Col>
      </Row>
    </Container>
  );
}

export default App;
