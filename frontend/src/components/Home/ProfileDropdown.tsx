import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Transition,
} from "@headlessui/react";
import { UserCircleIcon } from "@heroicons/react/24/solid";
import { Link, useNavigate } from "@tanstack/react-router";
import { useGetAvatar } from "@/hooks";
import { Fragment } from "react";
import { hasAuthQuery, useLogout } from "@/hooks/auth";
import { useQuery } from "@tanstack/react-query";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

// Create component with prop topRight boolean
export const ProfileDropdown = ({ topRight }: { topRight?: boolean }) => {
  const { data: avatarUrl } = useGetAvatar();
  const navigate = useNavigate();
  const { mutate: logout } = useLogout({
    onLogout: () => navigate({ to: "/" }),
  });
  const { data: hasAuthEnabled } = useQuery(hasAuthQuery());

  const userNavigation = [{ name: "Settings", href: "/user" }];

  return (
    <>
      {/* Profile dropdown */}
      <Menu as="div" className="relative">
        <MenuButton className="flex items-center p-1.5 cursor-pointer">
          {avatarUrl ? (
            <img
              className="h-10 w-10 rounded-full bg-gray-600 object-cover"
              src={avatarUrl}
              alt=""
            />
          ) : (
            <UserCircleIcon className="text-gray-300 h-10 w-10 rounded-full " />
          )}
        </MenuButton>

        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <MenuItems
            className={classNames(
              topRight
                ? "right-0 top-12 origin-top-right"
                : "left-0 bottom-14 origin-bottom-left",
              "absolute z-10 mt-2.5 w-32 rounded-md bg-gray-700 shadow-lg ring-1 ring-gray-500 focus:outline-none"
            )}
          >
            {userNavigation.map((item) => (
              <MenuItem key={item.name}>
                <Link
                  to={item.href}
                  className="cursor-pointer block px-3 py-2 m-1 rounded-md text-sm leading-6 text-white overflow-hidden transition-colors duration-100 data-[focus]:bg-gray-600"
                >
                  {item.name}
                </Link>
              </MenuItem>
            ))}

            {/* Add logout */}
            {hasAuthEnabled && (
              <MenuItem key="logout">
                <div
                  onClick={async () => await logout()}
                  className="cursor-pointer block px-3 py-2 m-1 rounded-md text-sm leading-6 text-white overflow-hidden transition-colors duration-100 data-[focus]:bg-gray-600"
                >
                  Logout
                </div>
              </MenuItem>
            )}
          </MenuItems>
        </Transition>
      </Menu>
    </>
  );
};
