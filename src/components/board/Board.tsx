import { Component, FunctionComponent, useState, useEffect } from "react";
import { Button, Row, Stack } from "react-bootstrap";
import { Map as ImmutableMap, Record } from "immutable";
import { Spinner } from "react-bootstrap";


import "./Board.css"


interface BoardBrops {
  height: number,
  width: number,
  addMove: (x: number, y: number) => Promise<boolean>
  getOpponentMove: () => Promise<{x: number, y: number}>
}

interface Position {
  x: number,
  y: number,
}

interface CellProps {
  position: Position,
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
      return "notMine"
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
  const [cellStateBackup, setCellStateBackup] = useState(CellState.Free)
  const [cellState, setCellState] = useState(CellState.Free)

  useEffect(
    () => {
      if (cellState == CellState.Sync) {
        props
          .tryClaim()
          .then(
            (claimSuccess) => {
              claimSuccess
                ? setCellState(CellState.Mine)
                : setCellState(cellStateBackup)
            }
          )
      }
    },
    [cellState]
  )

  return (
    <button
      className={`cell ${cellStateToString(cellState)}`}
      onClick={
        () => {
          setCellStateBackup(cellState)
          setCellState(CellState.Sync)
        }
      }
    >
    </button>
  )
}

const PositionImmutable = Record<Position>({ x: 0, y: 0 });


export const BoardGrid: FunctionComponent<BoardBrops> = (props) => {
  return (
    <div className="gridContainer">
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
                              position={{ x: colno, y: lineno }}
                              tryClaim={
                                async () => {
                                  return await props.addMove(colno, lineno)
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
  getLockedValue: () => Promise<number>
  getCurrentTurn: () => Promise<CurrentTurn>
  makeMove: (x: number, y: number) => Promise<boolean>
  getOpponentMove: () => Promise<{x: number, y: number}>
}


export const Board: FunctionComponent<GameProps> = (props) => {
  const [valueLocked, setValueLocked] = useState<number | null>(null);
  const [currentTurn, setCurrentTurn] = useState<CurrentTurn>(CurrentTurn.Unknown);

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

  return (
    <div className="boardContainer">
      <p>
        Funds locked: {valueLocked ? valueLocked : <Spinner animation="border" size="sm" />}
      </p>
      <BoardGrid
        width={props.dimensions.width}
        height={props.dimensions.height}
        getOpponentMove={props.getOpponentMove}
        addMove={
          async (x, y) => {
            if (currentTurn == CurrentTurn.Mine && await props.makeMove(x, y)) {
              setCurrentTurn(CurrentTurn.NotMine);
              return true;
            }
            return false;
          }
        }
      />
    </div>
  )
}