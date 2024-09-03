import { useState, useEffect } from "react";
import { ArrowDownTrayIcon } from "@heroicons/react/20/solid";

export type OS = "darwin" | "windows" | "linux";

interface GithubReleaseAsset {
  browser_download_url: string;
  content_type: string;
  created_at: string;
  download_count: number;
  id: number;
  label: null;
  name: string;
  node_id: string;
  size: number;
  state: string;
  updated_at: string;
  uploader: {
    login: string;
    id: number;
    node_id: string;
    avatar_url: string;
    gravatar_id: string;
    // Add other properties of the uploader object here
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any; // For any additional properties
  };
  url: string;
}

export const DownloadReleaseButton = ({ os }: { os: OS }) => {
  const [downloadUrl, setDownloadUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const getOSName = (os: OS) => {
    switch (os) {
      case "darwin":
        return "macOS";
      case "windows":
        return "Windows";
      case "linux":
        return "Linux";
      default:
        return "";
    }
  };

  const getAssetName = (os: OS) => {
    switch (os) {
      case "darwin":
        return "dataline-macos-latest.tar.zip";
      case "windows":
        return "windows-artifact.zip";
      case "linux":
        return "dataline-linux.tar.zip";
      default:
        throw new Error("Unsupported operating system");
    }
  };

  useEffect(() => {
    const fetchLatestRelease = async () => {
      try {
        const response = await fetch(
          "https://api.github.com/repos/RamiAwar/dataline/releases/latest"
        );
        if (!response.ok) {
          throw new Error("Failed to fetch latest release");
        }
        const data = await response.json();
        const assetName = getAssetName(os);
        const asset: GithubReleaseAsset = data.assets.find(
          (asset: GithubReleaseAsset) => asset.name === assetName
        );
        if (asset) {
          setDownloadUrl(asset.browser_download_url);
        } else {
          throw new Error(
            `Artifact ${assetName} not found in the latest release`
          );
        }
      } catch (err) {
        console.error("Error fetching latest release:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLatestRelease();
  }, [os]);

  if (isLoading) {
    return (
      <button className="opacity-50 cursor-not-allowed bg-gray-700 rounded-xl px-4 py-2 flex items-center text-white">
        Loading...
      </button>
    );
  }

  return (
    <a
      data-umami-event="click_download_release"
      data-umami-event-os={os}
      href={downloadUrl}
      download
      className="bg-gray-700 rounded-xl px-4 py-2 flex items-center text-white hover:bg-gray-600"
      onClick={(e) => {
        if (!downloadUrl) {
          e.preventDefault();
          alert(
            "Download link is not available. Please visit the GitHub releases page manually."
          );
        }
      }}
    >
      <ArrowDownTrayIcon className="mr-2 h-6 w-6" />
      <span>Download for {getOSName(os)}</span>
    </a>
  );
};
