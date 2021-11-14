import { Component, FunctionComponent, useState, useEffect } from "react";
import { Button, Row, Stack } from "react-bootstrap";
import { Map as ImmutableMap, Record } from "immutable";


import "./Board.css"


interface BoardBrops {
  height: number,
  width: number,
}

interface Position {
  x: number,
  y: number,
}

interface CellProps {
  position: Position,
  state: CellState,
  claim: () => void,
}


enum CellState {
  Free, Mine, NotMine
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
  }
}


const Cell: FunctionComponent<CellProps> = (props) => {
  return (
    <button
      className={`cell ${cellStateToString(props.state)}`}
      onClick={props.claim}
    >
    </button>
  )
}


const Board: FunctionComponent<BoardBrops> = (props) => {
  const [cellsState, setCellsState] = useState(ImmutableMap<Record<Position>, CellState>())
  const PositionImmutable = Record<Position>({ x: 0, y: 0 });

  return (
    <div className="container">
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
                              state={
                                cellsState.get(PositionImmutable({ x: colno, y: lineno })) || CellState.Free}
                              claim={
                                () => {
                                  setCellsState(
                                    cellsState.set(
                                      PositionImmutable({ x: colno, y: lineno }),
                                      CellState.Mine
                                    )
                                  )
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


export default Board
