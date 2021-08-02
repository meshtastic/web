import React from 'react';

import { Switch } from '@headlessui/react';

interface ToggleSwitchProps {
  active: boolean;
}

export const ToggleSwitch = (props: ToggleSwitchProps): JSX.Element => {
  const [active, setActive] = React.useState(false);

  React.useEffect(() => {
    setActive(props.active);
  }, []);

  return (
    <Switch
      checked={active}
      onChange={setActive}
      className={`w-12 h-6 flex items-center bg-gray-300 rounded-full p-1 duration-300 ease-in-out my-auto ${
        active ? 'bg-green-400' : null
      }`}
    >
      <span
        className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${
          active ? 'translate-x-6' : null
        }`}
      ></span>
    </Switch>
  );
};
