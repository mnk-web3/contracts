import { ComponentStory, ComponentMeta } from '@storybook/react';


import { Board, CurrentTurn } from "../components/board/Board"


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
      setTimeout(() => {resolve(10)}, 1000)
    }
  )
}


function makeMoveMock(): Promise<boolean> {
  return new Promise(
    (resolve, reject) => {
      setTimeout(() => {resolve(true)}, 2000)
    }
  )
}


function getCurrentTurnMock(): Promise<CurrentTurn> {
  return new Promise(
    (resolve, reject) => {
      setTimeout(() => {resolve(CurrentTurn.Mine)}, 1000)
    }
  )
}


ActualInGame.args = {
  dimensions: {
    height: 25,
    width: 25
  },
  getLockedValue: getLockedValueMock,
  getCurrentTurn: getCurrentTurnMock,
  makeMove: makeMoveMock,
};


Small.args = {
  dimensions: {
    height: 5,
    width: 5
  },
  getLockedValue: getLockedValueMock,
  getCurrentTurn: getCurrentTurnMock,
  makeMove: makeMoveMock,
};


Medium.args = {
  dimensions: {
    height: 15,
    width: 15
  },
  getLockedValue: getLockedValueMock,
  getCurrentTurn: getCurrentTurnMock,
  makeMove: makeMoveMock,
};
