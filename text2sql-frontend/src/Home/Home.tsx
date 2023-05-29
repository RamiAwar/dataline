import { Conversation } from "../Conversation/Conversation";
import { Sidebar } from "./Sidebar";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export const Home = () => {
  return (
    <div className="h-screen w-full">
      <Sidebar></Sidebar>

      <main className="h-[calc(100%-4rem)] lg:pl-72 lg:h-full w-full">
        <Conversation />
      </main>
    </div>
  );
};
