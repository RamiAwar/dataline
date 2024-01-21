import { createContext, useContext, useEffect, useState } from "react";
import { IConversationResult } from "../Library/types";
import { api } from "../../api";
import { useAuth } from "../Providers/AuthProvider";
import { supabase } from "../../supabase";

type ProfilePictureContextType = [
  string | null,
  React.Dispatch<React.SetStateAction<string | null>>
];

const ProfilePictureContext = createContext<ProfilePictureContextType>([
  null,
  () => {},
]);

export const useProfilePicture = () => {
  const context = useContext(ProfilePictureContext);
  if (context === undefined) {
    throw new Error(
      "useProfilePicture must be used within a ProfilePictureProvider"
    );
  }
  return context;
};

export const ProfilePictureProvider = ({
  children,
}: React.PropsWithChildren) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const { profile } = useAuth();

  async function downloadImage(path: string) {
    try {
      const { data, error } = await supabase.storage
        .from("avatars")
        .download(path);
      if (error) {
        throw error;
      }
      const url = URL.createObjectURL(data);
      setAvatarUrl(url);
    } catch (error) {
      console.log("Error downloading image: ", error);
    }
  }

  useEffect(() => {
    if (profile?.avatarUrl) downloadImage(profile.avatarUrl);
  }, [profile]);

  return (
    <ProfilePictureContext.Provider value={[avatarUrl, setAvatarUrl]}>
      {children}
    </ProfilePictureContext.Provider>
  );
};
