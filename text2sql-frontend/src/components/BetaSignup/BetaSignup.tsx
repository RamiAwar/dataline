import { BackgroundLayout } from "../Layouts/BackgroundLayout";
import { Footer } from "../Layouts/Footer";
import logo from "../../assets/images/logo_xl.png";
import { BetaSignupForm } from "./BetaSignupForm";

export const BetaSignup = () => {
  return (
    <div className="bg-gray-900 h-full overflow-hidden">
      <div className="relative isolate h-full">
        <BackgroundLayout></BackgroundLayout>

        <div className="h-full flex flex-col justify-between">
          <div className="flex items-center justify-between p-6 lg:px-8">
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
          </div>

          <BetaSignupForm></BetaSignupForm>
          <Footer></Footer>
        </div>
      </div>
    </div>
  );
};
