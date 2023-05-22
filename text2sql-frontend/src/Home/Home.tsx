import { Conversation } from "../Conversation/Conversation";
import { Sidebar } from "./Sidebar";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export const Home = () => {
  return (
    <div className="h-screen w-full overflow-hidden">
      <Sidebar></Sidebar>

      <main className="lg:pl-72 h-full w-full">
        <Conversation />
      </main>
    </div>
  );
};
