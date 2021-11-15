import { ComponentStory, ComponentMeta } from '@storybook/react';


import DMNKMainMenu from "../components/MainMenu";


export default {
  title: 'DMNK/MainMenu',
  component: DMNKMainMenu,
} as ComponentMeta<typeof DMNKMainMenu>;


const Template: ComponentStory<typeof DMNKMainMenu> = (args) => <DMNKMainMenu {...args} />;


export const BalanceNotNull = Template.bind({});
export const BalanceNull = Template.bind({});


function getBalanceMock(): Promise<number> {
  return new Promise(
    (resolve, reject) => {
      setTimeout(() => { resolve(100) }, 50)
    }
  )
}


BalanceNotNull.args = {
  getBalance: getBalanceMock,
  onGameSettingsReady: (settings) => { console.log(settings) },
};
