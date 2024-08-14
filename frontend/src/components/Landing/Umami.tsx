import { useEffect } from "react";

const UmamiScript = () => {
  useEffect(() => {
    // <script defer src="https://cloud.umami.is/script.js" data-website-id="66c60900-bb00-44c7-b498-e3a71ee93e55"></script>
    const script = document.createElement("script");

    script.src = "https://cloud.umami.is/script.js";
    script.defer = true;
    script.setAttribute(
      "data-website-id",
      "66c60900-bb00-44c7-b498-e3a71ee93e55"
    );

    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);
  return null;
};

export default UmamiScript;
