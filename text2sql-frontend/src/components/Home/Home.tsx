import { Alert, AlertTitle } from "@components/Catalyst/alert";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { OpenAIKeyPopup } from "../Settings/OpenAIKeyPopup";
import { Spinner } from "../Spinner/Spinner";
import {
  useGetBackendStatus,
  useGetConnections,
  useGetConversations,
  useGetUserProfile,
} from "@/hooks";

export const Home = () => {
  const { data } = useGetBackendStatus();

  const { data: profile, isLoading } = useGetUserProfile({
    enabled: Boolean(data),
  });
  const { isPending: isPendingConnections } = useGetConnections();
  const { isPending: isPendingConversations } = useGetConversations();

  return isLoading ||
    isPendingConnections ||
    isPendingConversations ||
    profile === undefined ? (
    <Alert open={true} onClose={() => {}} size="sm">
      <AlertTitle className="flex">
        <Spinner />
        Loading...
      </AlertTitle>
    </Alert>
  ) : profile?.openai_api_key ? (
    <div className="w-full bg-gray-900">
      <Sidebar></Sidebar>
      <main className="lg:pl-72 w-full mt-16 lg:mt-0">
        <Outlet></Outlet>
      </main>
    </div>
  ) : (
    <div>
      <OpenAIKeyPopup />
    </div>
  );
};
