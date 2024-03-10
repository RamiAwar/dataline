import { Menu, Transition } from "@headlessui/react";
import { UserCircleIcon } from "@heroicons/react/24/solid";
import { Fragment } from "react";
import { Link } from "react-router-dom";
import { Routes } from "../../router";
import { useUserInfo } from "../Providers/UserInfoProvider";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

// Create component with prop topRight boolean
export const ProfileDropdown = ({ topRight }: { topRight?: boolean }) => {
  const userNavigation = [
    { name: "Your profile", href: Routes.UserProfile, onClick: () => {} },
  ];

  const [userInfo] = useUserInfo();

  return (
    <>
      {/* Profile dropdown */}
      <Menu as="div" className="relative">
        <Menu.Button className="flex items-center p-1.5 cursor-pointer">
          <Link
            to={Routes.UserProfile}
            className="block px-3 py-2 m-1 rounded-md text-sm leading-6 text-white overflow-hidden transition-colors duration-100"
          >
            {userInfo?.avatarUrl ? (
              <img
                className="h-10 w-10 rounded-full bg-gray-600 object-cover"
                src={userInfo.avatarUrl}
                alt=""
              />
            ) : (
              <UserCircleIcon className="text-gray-300 h-10 w-10 rounded-full " />
            )}
          </Link>
        </Menu.Button>
      </Menu>
    </>
  );
};
