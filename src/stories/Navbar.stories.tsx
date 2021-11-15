import { ComponentStory, ComponentMeta } from '@storybook/react';


import { DMNKNavbar } from "../components/navbar/Navbar";


export default {
  title: 'DMNK/Navbar',
  component: DMNKNavbar,
} as ComponentMeta<typeof DMNKNavbar>;


const Template: ComponentStory<typeof DMNKNavbar> = (args) => <DMNKNavbar {...args} />;


export const NavbarMain = Template.bind({});


async function getBalanceMock(_: any): Promise<number> {
  return 100
}


NavbarMain.args = {
  getAccount: () => {return {kind: "not_exists", value: null}},
  createAccount: (password: string) => {},
  getBalance: getBalanceMock
};
