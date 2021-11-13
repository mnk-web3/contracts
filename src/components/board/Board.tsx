import { Component, FunctionComponent, useState, useEffect } from "react";
import { Button, Row, Stack } from "react-bootstrap";


import "./Board.css"


interface BoardBrops {
  height: number,
  width: number,
}


interface CellProps {
  position: Position,
}


enum CellState {
  Free,
}


const Cell: FunctionComponent<CellProps> = (props) => {
  return (
    <button className="cell"></button>
  )
}


interface Position {
  x: number,
  y: number,
}


const Board: FunctionComponent<BoardBrops> = (props) => {
  return (
    <div className="container">
      {
        [...Array(props.height)]
          .map(
            (_, lineno) => {
              return (
                <div className="line">
                  {
                    [...Array(props.width)]
                      .map(
                        (_, colno) => {
                          return (
                            <Cell position={{x: colno, y: lineno}}/>
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


export default Board;
