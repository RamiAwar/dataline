import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { useUserInfo } from "../Providers/UserInfoProvider";
import { OpenAIKeyPopup } from "../Settings/OpenAIKeyPopup";
import { useEffect, useState } from "react";

export const Home = () => {
  const [userInfo] = useUserInfo();
  const [hasKey, setHasKey] = useState<boolean>(false);

  useEffect(() => {
    setHasKey(userInfo?.openaiApiKey !== "" && userInfo?.openaiApiKey !== null);
  }, [userInfo]);

  return hasKey ? (
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

// TODO: Why is there an empty page? Should default to new conversation
