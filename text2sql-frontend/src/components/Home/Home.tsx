import { Alert, AlertTitle } from "@components/Catalyst/alert";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { useUserInfo } from "../Providers/UserInfoProvider";
import { OpenAIKeyPopup } from "../Settings/OpenAIKeyPopup";
import { Spinner } from "../Spinner/Spinner";

export const Home = () => {
  const [userInfo] = useUserInfo();

  return userInfo === null || !userInfo.isLoaded ? (
    <Alert open={true} onClose={() => {}} size="sm">
      <AlertTitle className="flex">
        <Spinner />
        Loading...
      </AlertTitle>
    </Alert>
  ) : userInfo.openaiApiKey ? (
    <div className="w-full bg-gray-900">
      <Sidebar></Sidebar>
      <main className="lg:pl-72 w-full mt-16 lg:mt-0">
        <Outlet></Outlet>
      </main>
    </div>
  ) : (
    <div>
      <OpenAIKeyPopup></OpenAIKeyPopup>
    </div>
  );
};
