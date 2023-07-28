import { Conversation } from "../Conversation/Conversation";
import { ErrorHandler } from "../Library/ErrorHandler";
import { Sidebar } from "./Sidebar";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export const Home = () => {
  return (
    <div className="h-screen w-full">
      <Sidebar></Sidebar>

      <main className="h-[calc(100%-4rem)] lg:pl-72 lg:h-full w-full">
        {/* <ErrorHandler /> */}
        <Conversation />
      </main>
    </div>
  );
};
