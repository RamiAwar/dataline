import {  Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";


export const Home = () => {

  return <div className="w-full bg-gray-900">
      <Sidebar></Sidebar>
      <main className="lg:pl-72 w-full mt-16 lg:mt-0">
        <Outlet></Outlet>
      </main>
    </div>
};
