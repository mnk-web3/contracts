import { Component, FunctionComponent, useState, useEffect } from "react";
import { Button, Row, Stack, Spinner } from "react-bootstrap";
import { shortenAddress } from "./common"


enum CancellationStatus {
  NotTried = "NotTried", Ok = "Ok", Nok = "NoOk"
}


export const NewGameBeingCreated: FunctionComponent<{
  getContractAddress: () => Promise<string>,
  getGameSettings: () => { bid: number, range_from: number, range_to: number },
  cancelGame: () => Promise<boolean>,
  proceedAfterCancellation: () => void,
  proceedAfterOpponentFound: () => void,
}> =
  (props) => {
    const [gameAddress, setGameAddress] = useState<string | null>(null)
    const [cancellationRequested, setCancellationRequested] = useState(false)
    const [cancellationStatus, setCancellationStatus] = useState(CancellationStatus.NotTried)

    useEffect(
      () => {
        props.getContractAddress().then(setGameAddress)
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
