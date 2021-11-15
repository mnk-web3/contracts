import { Component, FunctionComponent, useState, useEffect } from "react";
import { Button, Row, Stack } from "react-bootstrap";
import { Map as ImmutableMap, Record } from "immutable";
import { Spinner } from "react-bootstrap";


import "./Board.css"


interface BoardBrops {
  height: number,
  width: number,
  claimCell: (x: number, y: number) => Promise<boolean>
  getCellState: (x: number, y: number) => CellState
}

interface Position {
  x: number,
  y: number,
}

interface CellProps {
  position: Position,
  state: CellState,
  tryClaim: () => Promise<boolean>,
}


enum CellState {
  Free, Mine, NotMine, Sync
}


function cellStateToString(state: CellState): string {
  switch (state) {
    case (CellState.Mine): {
      return "mine"
    }
    case (CellState.NotMine): {
      return "notMine fadein"
    }
    case (CellState.Free): {
      return "free"
    }
    case (CellState.Sync): {
      return "sync"
    }
  }
}


const Cell: FunctionComponent<CellProps> = (props) => {
  const [clicked, setClicked] = useState(false);
  useEffect(
    () => {
      if (clicked) {
        props
          .tryClaim()
          .then(
            (_) => {
              setClicked(false)
            }
          )
      }
    },
    [clicked]
  )
  return (
    <button
      className={`cell ${cellStateToString(props.state)}`}
      onClick={
        () => {
          setClicked(true)
        }
      }
    >
    </button>
  )
}

const ImmutablePosition = Record<Position>({ x: 0, y: 0 });


export const BoardGrid: FunctionComponent<BoardBrops> = (props) => {
  return (
    <div className="gridContainer fadein">
      {
        [...Array(props.height)]
          .map(
            (_, lineno) => {
              return (
                <div className="line" key={`line-${lineno}`}>
                  {
                    [...Array(props.width)]
                      .map(
                        (_, colno) => {
                          return (
                            <Cell
                              key={`cell-${lineno}-${colno}`}
                              state={props.getCellState(colno, lineno)}
                              position={{ x: colno, y: lineno }}
                              tryClaim={
                                async () => {
                                  return await props.claimCell(colno, lineno)
                                }
                              }
                            />
                          )
                        }
                      )
                  }
                </div>
              )
            }
          )
      }
    </div>
  )
}


export enum CurrentTurn {
  Mine = "Mine", NotMine = "NotMine", Unknown = "Unknown"
}


interface GameProps {
  dimensions: { width: number, height: number },
  // Contract related data
  getLockedValue: () => Promise<number>
  getCurrentTurn: () => Promise<CurrentTurn>
  // Moves
  appendMyMove: (x: number, y: number) => Promise<boolean>
  getOpponentMove: () => Promise<{ x: number, y: number }>
}


export const Board: FunctionComponent<GameProps> = (props) => {
  // Internal state, that prevents glitchy cell's transitions
  const [isProcessing, setProcessing] = useState(false);

  // Part of the state, provided by the contract itself
  const [valueLocked, setValueLocked] = useState<number | null>(null);
  const [currentTurn, setCurrentTurn] = useState<CurrentTurn>(CurrentTurn.Unknown);

  // State of the game field
  const [gridState, setGridState] = (
    useState<ImmutableMap<Record<Position>, CellState>>(ImmutableMap())
  )

  // Resolve the total funds locked value
  useEffect(
    () => {
      props.getLockedValue().then(setValueLocked)
    },
    []
  )

  // Resolve the turn state
  useEffect(
    () => {
      props.getCurrentTurn().then(setCurrentTurn)
    },
    []
  )

  // Resolve opponents move
  useEffect(
    () => {
      if (currentTurn == CurrentTurn.NotMine) {
        props.getOpponentMove().then(
          (move) => {
            setGridState(
              gridState.set(ImmutablePosition(move), CellState.NotMine)
            )
            setCurrentTurn(CurrentTurn.Mine)
          }
        )
      }
    },
    [currentTurn]
  )

  const renderCurrentTurnMemo = (turn: CurrentTurn) => {
    switch (turn) {
      case (CurrentTurn.Unknown): {
        return (
          <p>Turn:
            <Spinner animation="border" size="sm" />
          </p>
        )
      }
      case (CurrentTurn.Mine): {
        return <p>Turn: <strong>me</strong></p>
      }
      case (CurrentTurn.NotMine): {
        return <p>Turn: <strong>opponent</strong></p>
      }
    }
  }

  return (
    <div className="boardContainer">
      <p>Funds locked: <strong>{valueLocked ? valueLocked : <Spinner animation="border" size="sm" />}</strong></p>
      {renderCurrentTurnMemo(currentTurn)}
      <BoardGrid
        width={props.dimensions.width}
        height={props.dimensions.height}
        getCellState={
          (x: number, y: number) => {
            return gridState.get(ImmutablePosition({ x: x, y: y })) || CellState.Free
          }
        }
        claimCell={
          async (x, y) => {
            if (currentTurn == CurrentTurn.Mine && !isProcessing) {
              const cellStateBackup = gridState.get(ImmutablePosition({ x: x, y: y })) || CellState.Free
              let valueToReturn: boolean;
              setProcessing(true)
              setGridState(gridState.set(ImmutablePosition({ x: x, y: y }), CellState.Sync))
              if (await props.appendMyMove(x, y)) {
                setGridState(gridState.set(ImmutablePosition({ x: x, y: y }), CellState.Mine))
                setCurrentTurn(CurrentTurn.NotMine);
                valueToReturn = true
              } else {
                gridState.set(ImmutablePosition({ x: x, y: y }), cellStateBackup)
                valueToReturn = false
              }
              setProcessing(false)
              return valueToReturn
            }
            return false
          }
        }
      />
    </div>
  )
}