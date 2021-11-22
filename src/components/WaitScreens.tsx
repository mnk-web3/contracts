import { FunctionComponent, useState, useEffect } from "react";
import { Button, Container, Row, Col, Spinner, Stack } from "react-bootstrap";
import "./common.css"
import "animate.css"


enum CancellationStatus {
  NotTried = "NotTried", Ok = "Ok", Nok = "NoOk"
}


export enum UnavailabitlityReason {
  DoesNotExist, Locked,
}


export const AccountIsNotAvailable: FunctionComponent<{ reason: UnavailabitlityReason }> = (props) => {
  let message: string;
  let header: string;
  switch (props.reason) {
    case (UnavailabitlityReason.DoesNotExist): {
      header = "Wallet not found!"
      message = "Create your in game wallet first"
      break
    }
    case (UnavailabitlityReason.Locked): {
      header = "Wallet is locked"
      message = "Unlock your in game wallet first"
      break
    }
  }
  return (
    <Container>
      <Row>
        <Col className="col-md-8 mx-auto">
          <Stack gap={2} className="col-md-12 mx-auto animate__animated animate__fadeIn">
            <h1 className="mx-auto">{header}</h1>
            <p className="mx-auto">
              {message} <i className="bi bi-arrow-up-right-circle"></i>
            </p>
          </Stack>
        </Col>
      </Row>
    </Container>
  )
}

interface NewRoomProps {
  gameAddress: string,
  gameSettings: { bid: number, range_from: number, range_to: number },
  // Cancell the game
  cancelGame: () => Promise<boolean>,
  proceedAfterCancellation: () => void,
  // Wait for the opponent
  waitForOpponent: () => Promise<string>,
  proceedAfterOpponentFound: (address: string) => void,
}


export const NewGameBeingCreated: FunctionComponent<NewRoomProps> = (props) => {
  const [cancellationRequested, setCancellationRequested] = useState(false)
  const [cancellationStatus, setCancellationStatus] = useState(CancellationStatus.NotTried)

  // Process the game cancellation request
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
  // Proceed after opponent finaly found
  useEffect(
    () => { props.waitForOpponent().then(props.proceedAfterOpponentFound) }, []
  )

  return (
    <Container>
      <Row>
        <Col className="col-md-8 mx-auto">
          <Stack gap={2} className="col-md-12 mx-auto animate__animated animate__fadeIn">
            <hr />
            <h2 className="mx-auto">A new game has just been created!</h2>
            <p className="mx-auto">Game address: <strong>{props.gameAddress}</strong></p>
            {
              (cancellationStatus == CancellationStatus.NotTried || cancellationStatus == CancellationStatus.Nok)
                ?
                <Button variant="outline-dark" onClick={() => setCancellationRequested(true)}>
                  Cancel the game {
                    cancellationRequested
                      ? <Spinner size="sm" animation="border" />
                      : <i className="bi bi-x"></i>
                  }
                </Button>
                :
                <Button variant="outline-dark" onClick={props.proceedAfterCancellation}>
                  Main menu <i className="bi bi-list"></i>
                </Button>
            }
            <hr />
          </Stack>
        </Col>
      </Row>
    </Container>
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


enum PlayInvocationError {
  NoError, NoGas
}


export const WaitingForContractPlayReaction:
  FunctionComponent<
    {
      // Protect the Promise object by the means of lambda abstraction =)
      getPlayResponse: () => Promise<any>,
      onGameCreated: (response: GameCreatedResponse) => void,
      onGameFound: (response: GameFoundResponse) => void,
      onInsufficientBalance: () => void,
    }>
  = (props) => {
    const [txHash, setTxHash] = useState<string | null>(null)
    const [error, setError] = useState(PlayInvocationError.NoError)
  
    useEffect(
      () => {
        (props.getPlayResponse() as any)
          .once(
            "receipt",
            (receipt: any) => {
              const response = receiptToPlayResponse(receipt)
              switch (response.kind) {
                case (PlayEventKind.GameCreated): {
                  return props.onGameCreated(response)
                }
                case (PlayEventKind.GameFound): {
                  return props.onGameFound(response)
                }
              }
            }
          )
          // .on(
          //   "transactionHash",
          //   (hash: string) => {
          //     setTxHash(hash)
          //   }
          // )
          .once(
            "error",
            (error: any, receipt: any) => {
              if (receipt == undefined) {
                setError(PlayInvocationError.NoGas)
              }
            }
          )
      },
      []
    )
    return (
      <Container>
        <Row>
          <Col className="mx-auto col-md-8">
            <Stack gap={2} className="col-md-12 mx-auto">
              <hr />
              <h2 className="mx-auto">Waiting for the blockchain response</h2>
              {
                (error == PlayInvocationError.NoError)
                  ? (
                    <>
                      <p className="mx-auto">
                        <strong>DMNK</strong> is thinking, you know <Spinner animation="border" size="sm" />
                      </p>
                      <p className="mx-auto">
                        Transaction: {txHash && txHash || <Spinner animation="border" size="sm" />}
                      </p>
                    </>
                  )
                  : (
                    <>
                      <p className="mx-auto">Your balance is insufficient to pay the gas fees for the call</p>
                      <Button variant="outline-dark" onClick={props.onInsufficientBalance}>
                        Go to main menu <i className="bi bi-list"></i>
                      </Button>
                    </>
                  )
              }
              <hr />
            </Stack>
          </Col>
        </Row>
      </Container>
    )
  }
