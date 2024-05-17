import { Menu } from "@headlessui/react";
import { UserCircleIcon } from "@heroicons/react/24/solid";
import { Link } from "react-router-dom";
import { Routes } from "../../router";
import { useGetAvatar } from "@/hooks";

// Create component with prop topRight boolean
export const ProfileDropdown = () => {
  const { data: avatarUrl } = useGetAvatar();

  return (
    <>
      {/* Profile dropdown */}
      <Menu as="div" className="relative">
        <Menu.Button className="flex items-center p-1.5 cursor-pointer">
          <Link
            to={Routes.UserProfile}
            className="block px-3 py-2 m-1 rounded-md text-sm leading-6 text-white overflow-hidden transition-colors duration-100"
          >
            {avatarUrl ? (
              <img
                className="h-10 w-10 rounded-full bg-gray-600 object-cover"
                src={avatarUrl}
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
