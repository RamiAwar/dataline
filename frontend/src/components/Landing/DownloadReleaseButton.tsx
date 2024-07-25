import { useState, useEffect } from "react";
import { ArrowDownTrayIcon } from "@heroicons/react/20/solid";

type OS = "darwin" | "windows" | "linux";

const DownloadReleaseButton = ({ os }: { os: OS }) => {
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
        const asset = data.assets.find((asset) => asset.name === assetName);
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

export default DownloadReleaseButton;
