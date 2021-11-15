import { ComponentStory, ComponentMeta } from '@storybook/react';


import { NewGameBeingCreated } from "../components/WaitScreens";


export default {
  title: 'DMNK/GameCreatedScreen',
  component: NewGameBeingCreated,
} as ComponentMeta<typeof NewGameBeingCreated>;


const Template: ComponentStory<typeof NewGameBeingCreated> = (args) => <NewGameBeingCreated {...args} />;


export const GameJustCreated = Template.bind({});


function getBalanceMock(): Promise<number | null> {
  return new Promise(
    (resolve, reject) => {
      setTimeout(() => { resolve(100) }, 50)
    }
  )
}


function getGameAddressMock(): Promise<string> {
  return new Promise(
    (resolve, reject) => {
      setTimeout(() => { resolve("0x7a3fca3550312744610fce88df33cb255815ca11") }, 1500)
    }
  )
}


function cancelTheGameMock(): Promise<boolean> {
  return new Promise(
    (resolve, reject) => {
      setTimeout(() => { resolve(true) }, 1500)
    }
  )
}



GameJustCreated.args = {
  getGameSettings: () => { return { bid: 10, range_from: 9.9, range_to: 10.1 } },
  getGameAddress: getGameAddressMock,
  cancelGame: cancelTheGameMock,
  proceedAfterCancellation: () => {console.log("Leave this page being clicked")},
};
