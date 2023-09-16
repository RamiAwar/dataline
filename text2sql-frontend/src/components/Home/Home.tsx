import { Conversation } from "../Conversation/Conversation";
import { ErrorHandler } from "../Library/ErrorHandler";
import { Sidebar } from "./Sidebar";

export const Home = () => {
  return (
    <div className="h-screen w-full bg-gray-900">
      <Sidebar></Sidebar>

      <main className="h-[calc(100%-8rem)] lg:pl-72 lg:h-full w-full mt-16 lg:mt-0">
        {/* <ErrorHandler /> */}
        <Conversation />
      </main>
    </div>
  );
};
