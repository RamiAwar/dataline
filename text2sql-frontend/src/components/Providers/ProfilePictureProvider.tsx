import { createContext, useContext, useEffect, useState } from "react";
import { IConversationResult } from "../Library/types";
import { api } from "../../api";
import { Buffer } from 'buffer';

type ProfilePictureContextType = [
  string | null,
  React.Dispatch<React.SetStateAction<string | null>>,
  (blob: string) => Promise<void>
];

const ProfilePictureContext = createContext<ProfilePictureContextType>([
  null,
  () => {},
  async () => {}
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

  async function decodeBase64Data(base64Data: string) {
    const byteCharacters = Buffer.from(base64Data, "base64").toString("binary");
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = Uint8Array.from(byteNumbers);
    const blob = new Blob([byteArray])
    const url = URL.createObjectURL(blob);
    return url;
  }

  async function getAvatar() {
    try {
      const response = await api.getAvatar();
      if (response.status !== "ok") {
        console.log("Error downloading image: ", response.message);
        return;
      }

      setAvatarBlob(response.blob);
    } catch (error) {
      console.log("Error downloading image: ", error);
    }
  }

  async function setAvatarBlob(blob: string) {
    const url = await decodeBase64Data(blob);
    setAvatarUrl(url);
  }

  useEffect(() => {
    getAvatar();
  }, []);

  return (
    <ProfilePictureContext.Provider value={[avatarUrl, setAvatarUrl, setAvatarBlob]}>
      {children}
    </ProfilePictureContext.Provider>
  );
};
