import { Menu, Transition } from "@headlessui/react";
import { ChevronDownIcon, UserCircleIcon } from "@heroicons/react/24/solid";
import { Fragment, useEffect, useState } from "react";
import { useAuth } from "../Providers/AuthProvider";
import { Link } from "react-router-dom";
import { Routes } from "../../router";
import { supabase } from "../../supabase";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

// Create component with prop topRight boolean
export const ProfileDropdown = ({ topRight }: { topRight?: boolean }) => {
  const { signOut } = useAuth();
  const userNavigation = [
    { name: "Your profile", href: Routes.UserProfile, onClick: () => {} },
    { name: "Sign out", href: "#", onClick: () => signOut() },
  ];
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const { profile } = useAuth();

  async function downloadImage(path: string) {
    try {
      const { data, error } = await supabase.storage
        .from("avatars")
        .download(path);
      if (error) {
        throw error;
      }
      const url = URL.createObjectURL(data);
      setAvatarUrl(url);
    } catch (error) {
      console.log("Error downloading image: ", error);
    }
  }

  useEffect(() => {
    console.log(profile);
    if (profile?.avatarUrl) downloadImage(profile.avatarUrl);
  }, [profile]);

  return (
    <>
      {/* Profile dropdown */}
      <Menu as="div" className="relative">
        <Menu.Button className="flex items-center p-1.5">
          <span className="sr-only">Open user menu</span>
          {avatarUrl ? (
            <img
              className="h-8 w-8 rounded-full bg-gray-600"
              src={avatarUrl}
              alt=""
            />
          ) : (
            <UserCircleIcon className="text-gray-300 h-8 w-8 rounded-full " />
          )}
          {/* <img
            className="h-8 w-8 rounded-full bg-gray-600"
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
            alt=""
          /> */}
          <span className="hidden lg:flex lg:items-center">
            <span
              className="ml-4 text-sm font-semibold leading-6 text-white"
              aria-hidden="true"
            >
              {profile?.fullName}
            </span>
          </span>
        </Menu.Button>
        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items
            className={classNames(
              topRight
                ? "left-0 bottom-14 origin-bottom-left"
                : "right-0 origin-top-right",
              "absolute z-10 mt-2.5 w-32 rounded-md bg-gray-600 shadow-lg ring-1 ring-gray-500 focus:outline-none"
            )}
          >
            {userNavigation.map((item) => (
              <Menu.Item key={item.name}>
                {({ active }) => (
                  <Link
                    to={item.href}
                    onClick={item.onClick}
                    className={classNames(
                      active ? "bg-gray-500" : "",
                      "block px-3 py-2 m-1 rounded-md text-sm leading-6 text-white overflow-hidden transition-colors duration-100"
                    )}
                  >
                    {item.name}
                  </Link>
                )}
              </Menu.Item>
            ))}
          </Menu.Items>
        </Transition>
      </Menu>
    </>
  );
};
