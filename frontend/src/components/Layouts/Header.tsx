import { Dialog } from "@headlessui/react";
import logo from "../../assets/images/logo_xl.png";
import logomd from "../../assets/images/logo_md.png";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { scroller } from "react-scroll";

const Header = () => {
  type NavigationItem = {
    id: string;
    name: string;
    href: string;
  };

  const navigation: NavigationItem[] = [
    { name: "Home", href: "/", id: "home" },
    { name: "Install", id: "install", href: "/#install" },
    { name: "Blog", id: "blog", href: "/blog" },
    { name: "FAQ", href: "/faq", id: "faq" },
  ];

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const elemId = location.hash.substring(1);
      setTimeout(() => {
        scroller.scrollTo(elemId, {
          duration: 500,
          delay: 100,
          offset: -150,
          smooth: "easeInOutQuart",
        });
      }, 100);
    } else {
      window.scrollTo(0, 0);
    }
  }, [location]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 backdrop-blur-sm ">
      <nav
        className="flex items-center justify-between p-6 lg:px-8"
        aria-label="Global"
      >
        <div className="flex lg:flex-1">
          <a href="/" className="-m-1.5 p-1.5 flex">
            <span className="sr-only">DataLine</span>
            <img
              className="h-6 w-auto mt-1.5"
              src={logo}
              alt="DataLine logo made"
            />
            <h1 className="ml-3 text-2xl font-semibold tracking-tight text-center text-white sm:text-3xl">
              DataLine
            </h1>
          </a>
        </div>

        {/* Mobile menu button */}
        <div className="flex lg:hidden">
          <button
            type="button"
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-400"
            onClick={() => setMobileMenuOpen(true)}
          >
            <span className="sr-only">Open main menu</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        <div className="hidden lg:flex lg:flex-1 lg:gap-x-12 lg:justify-end items-center lg:mr-12">
          <a
            href="https://github.com/RamiAwar/dataline"
            className="flex group border rounded-xl transition-colors w-fit shrink-0 p-1 hover:bg-gray-700 duration-150"
          >
            <div className="flex items-center">
              {/* <div className="h-4 w-4 border-y-8 border-l-0 border-r-8 border-solid border-gray-700 group-hover:border-gray-600 border-y-transparent group-hover:border-y-transparent transition-colors"></div> */}
              <div className="flex h-10 items-center rounded-md font-medium text-white px-2">
                ⭐️ us on GitHub
              </div>
            </div>
            <div className="flex h-10 w-10 items-center pr-2 justify-center">
              <svg
                fill="currentColor"
                viewBox="0 0 24 24"
                className="w-8 h-8 text-gray-300 group-hover:text-white"
              >
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </a>

          {navigation.map((item) => {
            return (
              <Link
                key={item.name}
                to={item.href}
                className="text-md font-medium leading-6 text-white"
              >
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>

      <Dialog
        as="div"
        className="lg:hidden"
        open={mobileMenuOpen}
        onClose={setMobileMenuOpen}
      >
        <div className="fixed inset-0 z-50" />
        <Dialog.Panel className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-gray-900 px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-white/10">
          <div className="flex items-center justify-between">
            <a href="#" className="-m-1.5 p-1.5">
              <span className="sr-only">DataLine</span>
              <img className="h-8 w-auto" src={logomd} alt="" />
            </a>
            <div className="text-md -mx-3 px-3 py-2 text-base font-semibold leading-7">
              <a
                href="https://github.com/RamiAwar/dataline"
                className="flex group border rounded-xl transition-colors w-fit p-1 hover:bg-gray-700 duration-150"
              >
                <div className="flex items-center">
                  {/* <div className="h-4 w-4 border-y-8 border-l-0 border-r-8 border-solid border-gray-700 group-hover:border-gray-600 border-y-transparent group-hover:border-y-transparent transition-colors"></div> */}
                  <div className="flex h-10 items-center rounded-md font-medium text-white px-2">
                    ⭐️ us on GitHub
                  </div>
                </div>
                <div className="flex h-10 w-10 items-center pr-2 justify-center">
                  <svg
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    className="w-8 h-8 text-gray-300 group-hover:text-white"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </a>
            </div>
            <button
              type="button"
              className="-m-2.5 rounded-md p-2.5 text-gray-400"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="sr-only">Close menu</span>
              <XMarkIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-6 flow-root">
            <div className="-my-6 divide-y divide-gray-500/25">
              <div className="space-y-2 py-6">
                {navigation.map((item) => {
                  return (
                    <a
                      key={item.name}
                      href={item.href}
                      className="text-md -mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-white hover:bg-gray-800"
                    >
                      {item.name}
                    </a>
                  );
                })}
              </div>
              {/* <div className="py-6">
                  <a
                    href="#"
                    className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-white hover:bg-gray-800"
                  >
                    Log in
                  </a>
                </div> */}
            </div>
          </div>
        </Dialog.Panel>
      </Dialog>
    </header>
  );
};

export default Header;
