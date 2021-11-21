import { ComponentStory, ComponentMeta } from '@storybook/react';


import { Board, CurrentTurn } from "../components/game/Board"


export default {
  title: 'DMNK/Board',
  component: Board,
} as ComponentMeta<typeof Board>;


const Template: ComponentStory<typeof Board> = (args) => <Board {...args} />;


export const ActualInGame = Template.bind({});
export const Small = Template.bind({});
export const Medium = Template.bind({});


function getLockedValueMock(): Promise<number> {
  return new Promise(
    (resolve, reject) => {
      setTimeout(() => { resolve(10) }, 1000)
    }
  )
}


function makeMoveMock(): Promise<boolean> {
  return new Promise(
    (resolve, reject) => {
      setTimeout(() => { resolve(true) }, 2000)
    }
  )
}


function getCurrentTurnMock(): Promise<CurrentTurn> {
  return new Promise(
    (resolve, reject) => {
      setTimeout(() => { resolve(CurrentTurn.Mine) }, 1000)
    }
  )
}


function makeOpponentsMoveMock(gridSize: number): (() => Promise<{x: number, y: number}>) {
  const getOpponentsMoveMock: () => Promise<{x: number, y: number}> = () => {
    return new Promise(
      (resolve, _) => {
        setTimeout(
          () => {
            resolve(
              {
                x: Math.floor(Math.random() * gridSize),
                y: Math.floor(Math.random() * gridSize),
              }
            )
          },
          1000
        )
      }
    )
  }
  return getOpponentsMoveMock
}



function waitForFinishMock(): Promise<string> {
  return new Promise(
    (resolve, reject) => {
      setTimeout(() => { resolve("someaddress") }, 1000000)
    }
  )
}


ActualInGame.args = {
  dimensions: {
    height: 25,
    width: 25
  },
  gameAddress: "0xda4566317090ba89d8d88f5b5fcdb34d8aab87fd",
  opponentAddress: "0xda4566317090ba89d8d88f5b5fcdb34d8aab87fd",
  getLockedValue: getLockedValueMock,
  getCurrentTurn: getCurrentTurnMock,
  getOpponentMove: makeOpponentsMoveMock(25),
  appendMyMove: makeMoveMock,
  waitForFinish: waitForFinishMock,
  onFinish: (address) => {},
};


// Small.args = {
//   dimensions: {
//     height: 5,
//     width: 5
//   },
//   getLockedValue: getLockedValueMock,
//   getCurrentTurn: getCurrentTurnMock,
//   getOpponentMove: makeOpponentsMoveMock(5),
//   appendMyMove: makeMoveMock,
// };


// Medium.args = {
//   dimensions: {
//     height: 15,
//     width: 15
//   },
//   getLockedValue: getLockedValueMock,
//   getCurrentTurn: getCurrentTurnMock,
//   getOpponentMove: makeOpponentsMoveMock(15),
//   appendMyMove: makeMoveMock,
// };
