import { FunctionComponent, useState, useEffect } from "react";
import { Button, Spinner } from "react-bootstrap";
import { shortenAddress } from "./common"
import "./common.css"


enum CancellationStatus {
  NotTried = "NotTried", Ok = "Ok", Nok = "NoOk"
}


export const AccountIsNotAvailable: FunctionComponent<any> = (props) => {
  return <p>Create or unlock your account</p>
}


export const NewGameBeingCreated: FunctionComponent<{
  getGameAddress: () => Promise<string>,
  getGameSettings: () => { bid: number, range_from: number, range_to: number },
  cancelGame: () => Promise<boolean>,
  proceedAfterCancellation: () => void,
}> =
  (props) => {
    const [gameAddress, setGameAddress] = useState<string | null>(null)
    const [cancellationRequested, setCancellationRequested] = useState(false)
    const [cancellationStatus, setCancellationStatus] = useState(CancellationStatus.NotTried)

    useEffect(
      () => {
        props.getGameAddress().then(setGameAddress)
      }
    )

    useEffect(
      () => {
        if (cancellationRequested) {
          props.cancelGame().then(
            (cancelSucceeded) => {
              setCancellationStatus(cancelSucceeded ? CancellationStatus.Ok : CancellationStatus.Nok)
              setCancellationRequested(false)
            })
        }
      },
      [cancellationRequested]
    )

    return (
      <div>
        <h3>Wait while new game being created...</h3>
        <p>Game address: {gameAddress ? shortenAddress(gameAddress) : <Spinner animation="border" size="sm" />}</p>
        {
          (cancellationStatus == CancellationStatus.NotTried || cancellationStatus == CancellationStatus.Nok)
            ?
            <Button variant="primary" onClick={() => setCancellationRequested(true)}>
              Cancel the game {cancellationRequested ? <Spinner size="sm" animation="grow" /> : <></>}
            </Button>
            :
            <Button variant="primary" onClick={props.proceedAfterCancellation}>
              Leave this page
            </Button>
        }
      </div>
    )
  }



export enum PlayEventKind {
  GameCreated, GameFound
}


export type GameCreatedResponse =
  {
    kind: PlayEventKind.GameCreated,
    gameAddress: string,
  }


export type GameFoundResponse =
  {
    kind: PlayEventKind.GameFound,
    gameAddress: string,
    opponentAddress: string,
  }


export type PlayResponse = GameCreatedResponse | GameFoundResponse


function receiptToPlayResponse(receipt: any): PlayResponse {
  if ("GameCreated" in receipt.events) {
    // GameCreated case
    const gameCreatedEvent = receipt.events.GameCreated;
    return { kind: PlayEventKind.GameCreated, gameAddress: gameCreatedEvent.returnValues.gameAddress }
  }
  else {
    // GameStarted case
    const gameStartedEvent = receipt.events.GameStarted;
    return {
      kind: PlayEventKind.GameFound,
      gameAddress: gameStartedEvent.returnValues.gameAddress,
      opponentAddress: gameStartedEvent.returnValues.bob,
    }
  }
}


export const WaitingForContractPlayReaction:
  FunctionComponent<
    {
      playResponse: Promise<any>,
      onGameCreated: (response: GameCreatedResponse) => void,
      onGameFound: (response: GameFoundResponse) => void,
    }>
  = (props) => {
    useEffect(
      () => {
        (props.playResponse as any)
          .once("sending", (info: any) => { console.log("sending", info) })
          .once("sent", (info: any) => { console.log("sent", info) })
          .once("transactionHash", (info: any) => { console.log("hash", info) })
          .once(
            "receipt",
            (receipt: any) => {
              const response = receiptToPlayResponse(receipt)
              switch (response.kind) {
                case (PlayEventKind.GameCreated): {
                  props.onGameCreated(response)
                  break
                }
                case (PlayEventKind.GameFound): {
                  props.onGameFound(response)
                  break
                }
              }
            }
          )
      },
      []
    )
    return (
      <div>
        <Spinner animation="border" />
        <p>Negotiating with the DMNK contract...</p>
      </div>
    )
  }
