import { Dialog } from "@headlessui/react";
import logo from "../../assets/images/logo_xl.png";
import logomd from "../../assets/images/logo_md.png";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

const Header = () => {

    const navigation: any[] = [
        { name: "Home", href: "/" },
        // { name: "Features", href: "#" },
        // { name: "Marketplace", href: "#" },
        { name: "FAQ", href: "/faq" },
    ];

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <header className="absolute inset-x-0 top-0 z-50">
            <nav
                className="flex items-center justify-between p-6 lg:px-8"
                aria-label="Global"
            >
                <div className="flex lg:flex-1">
                    <a href="#" className="-m-1.5 p-1.5 flex">
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
                {/* <div className="flex lg:hidden">
            <button
              type="button"
              className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-400"
              onClick={() => setMobileMenuOpen(true)}
            >
              <span className="sr-only">Open main menu</span>
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div> */}

                <div className="hidden lg:flex lg:flex-1 lg:gap-x-12 lg:justify-end lg:mr-12">
                    {navigation.map((item) => (
                        <a
                            key={item.name}
                            href={item.href}
                            className="text-md font-medium leading-6 text-white"
                        >
                            {item.name}
                        </a>
                    ))}
                </div>

                {/* <div className="hidden lg:flex lg:flex-1 lg:justify-end">
                    <a
              href="/beta-signup"
              className="text-sm font-semibold leading-6 text-white"
            >
              Sign Up <span aria-hidden="true">&rarr;</span>
            </a>
                </div> */}
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
                                {navigation.map((item) => (
                                    <a
                                        key={item.name}
                                        href={item.href}
                                        className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-white hover:bg-gray-800"
                                    >
                                        {item.name}
                                    </a>
                                ))}
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

}

export default Header;