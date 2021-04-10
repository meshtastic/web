import React from 'react';

// import Flags from 'country-flag-icons/react/3x2';
import { FaCog, FaLaptop, FaMoon, FaSun } from 'react-icons/fa';

import type { languageTemplate } from '../../App';
import { LanguageEnum } from '../../App';
import ToggleSwitch from '../basic/ToggleSwitch';
import NavItem from '../NavItem';

interface SidebarUISettingsProps {
  Language: LanguageEnum;
  SetLanguage: Function;
  Translations: languageTemplate;
}

const SidebarUISettings = (props: SidebarUISettingsProps) => {
  return (
    <NavItem
      isDropdown={true}
      isNested={false}
      titleContent={
        <div className="flex">
          <FaCog className="my-auto mr-2" />
          {props.Translations.ui_settings_title}
        </div>
      }
      dropdownContent={
        <>
          <NavItem
            isDropdown={false}
            isNested={true}
            titleContent={
              <>
                <div className="my-auto">
                  {props.Translations.color_scheme_title}
                </div>
                <div className="flex shadow-md rounded-md ml-2">
                  <div className="bg-gray-200 flex group p-2 rounded-l-md border border-gray-300 hover:bg-gray-200 cursor-pointer">
                    <FaSun className="m-auto group-hover:text-gray-700" />
                  </div>
                  <div className="flex group p-2 border border-gray-300 hover:bg-gray-200 cursor-pointer">
                    <FaMoon className="m-auto group-hover:text-gray-700" />
                  </div>
                  <div className="flex group p-2 rounded-r-md border border-gray-300 hover:bg-gray-200 cursor-pointer">
                    <FaLaptop className="m-auto group-hover:text-gray-700" />
                  </div>
                </div>
              </>
            }
          />
          <NavItem
            isDropdown={true}
            isNested={true}
            open={false}
            titleContent={
              <div className="flex my-auto">
                {/* {props.Translations.language_title}
                {props.Language === LanguageEnum.ENGLISH ? (
                  <Flags.US className="ml-2 w-8 shadow-md" />
                ) : props.Language === LanguageEnum.JAPANESE ? (
                  <Flags.JP className="ml-2 w-8 shadow-md" />
                ) : (
                  ''
                )} */}
              </div>
            }
            dropdownContent={
              <>
                <NavItem
                  onClick={() => {
                    props.SetLanguage(LanguageEnum.ENGLISH);
                  }}
                  isDropdown={false}
                  isNested={true}
                  titleContent={
                    <>{/* English <Flags.US className="w-8 shadow-md" /> */}</>
                  }
                />
                <NavItem
                  onClick={() => {
                    props.SetLanguage(LanguageEnum.JAPANESE);
                  }}
                  isDropdown={false}
                  isNested={true}
                  titleContent={
                    <>{/* 日本語 <Flags.JP className="w-8 shadow-md" /> */}</>
                  }
                />
              </>
            }
          />
          <NavItem
            isDropdown={false}
            isNested={true}
            open={false}
            titleContent={
              <>
                <div className="">Test</div>
                <ToggleSwitch active={true} />
              </>
            }
          />
        </>
      }
    />
  );
};

export default SidebarUISettings;
