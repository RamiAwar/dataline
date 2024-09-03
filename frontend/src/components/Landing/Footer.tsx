const navigation = {
  solutions: [
    // { name: "Snowflake", href: "/blog" },
    // { name: "Analytics", href: "#" },
    // { name: "Commerce", href: "#" },
    // { name: "Insights", href: "#" },
  ],
  support: [
    { name: "Discord", href: "https://discord.gg/f2dC4CJK8d" },
    { name: "Email", href: "mailto:support@dataline.app" },
    { name: "GitHub", href: "https://github.com/RamiAwar/dataline" },
    // { name: "Guides", href: "#" },
    // { name: "API Status", href: "#" },
  ],
  company: [
    { name: "About", href: "/about" },
    { name: "Blog", href: "/blog" },
    { name: "FAQ", href: "/faq" },
    // { name: "Press", href: "#" },
    // { name: "Partners", href: "#" },
  ],
  legal: [
    // { name: "Claim", href: "#" },
    { name: "Privacy", href: "/privacy" },
    // { name: "Terms", href: "#" },
  ],
};

import { SVGProps } from "react";
import logomd from "../../assets/images/logo_md.png";

const socials = [
  {
    name: "Discord",
    href: "https://discord.gg/f2dC4CJK8d",
    icon: (props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) => (
      <svg viewBox="0 0 23 16" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M15.5309 14.855C15.5309 14.855 14.8932 14.1025 14.3618 13.4375C16.6824 12.79 17.5681 11.355 17.5681 11.355C16.8418 11.8275 16.1509 12.16 15.5309 12.3875C14.6452 12.755 13.7949 13 12.9624 13.14C11.2618 13.455 9.70294 13.3675 8.37437 13.1225C7.36466 12.93 6.49666 12.65 5.77037 12.37C5.36294 12.2125 4.92009 12.02 4.47723 11.775C4.45066 11.7575 4.42409 11.7444 4.39752 11.7312C4.37094 11.7181 4.34437 11.705 4.3178 11.6875C4.28237 11.67 4.26466 11.6525 4.24694 11.635C3.92809 11.46 3.75094 11.3375 3.75094 11.3375C3.75094 11.3375 4.60123 12.7375 6.85094 13.4025C6.31952 14.0675 5.66409 14.855 5.66409 14.855C1.74923 14.7325 0.26123 12.195 0.26123 12.195C0.26123 6.55999 2.81209 1.99249 2.81209 1.99249C5.36294 0.102492 7.7898 0.154992 7.7898 0.154992L7.96694 0.364992C4.77837 1.27499 3.30809 2.65749 3.30809 2.65749C3.30809 2.65749 3.6978 2.44749 4.35323 2.14999C6.24866 1.32749 7.75437 1.09999 8.37437 1.04749L8.41409 1.04086C8.50345 1.02583 8.58273 1.01249 8.67552 1.01249C9.75609 0.872492 10.9784 0.837492 12.2538 0.977492C13.9367 1.16999 15.7435 1.65999 17.5858 2.65749C17.5858 2.65749 16.1864 1.34499 13.1749 0.434992L13.4229 0.154992C13.4229 0.154992 15.8498 0.102492 18.4007 1.99249C18.4007 1.99249 20.9515 6.55999 20.9515 12.195C20.9515 12.195 19.4458 14.7325 15.5309 14.855ZM7.79271 6.99999C6.79095 6.99999 6.00009 7.90089 6.00009 8.99999C6.00009 10.0991 6.80852 11 7.79271 11C8.79446 11 9.58533 10.0991 9.58533 8.99999C9.6029 7.90089 8.79446 6.99999 7.79271 6.99999ZM12.4149 8.99999C12.4149 7.90089 13.2057 6.99999 14.2075 6.99999C15.2092 6.99999 16.0001 7.90089 16.0001 8.99999C16.0001 10.0991 15.2092 11 14.2075 11C13.2233 11 12.4149 10.0991 12.4149 8.99999Z"
          fill="currentcolor"
        ></path>
      </svg>
    ),
  },
  {
    name: "GitHub",
    href: "https://github.com/RamiAwar/dataline",
    icon: (props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) => (
      <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
        <path
          fillRule="evenodd"
          d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  {
    name: "X",
    href: "https://x.com/iamramiawar",
    icon: (props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) => (
      <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
        <path d="M13.6823 10.6218L20.2391 3H18.6854L12.9921 9.61788L8.44486 3H3.2002L10.0765 13.0074L3.2002 21H4.75404L10.7663 14.0113L15.5685 21H20.8131L13.6819 10.6218H13.6823ZM11.5541 13.0956L10.8574 12.0991L5.31391 4.16971H7.70053L12.1742 10.5689L12.8709 11.5655L18.6861 19.8835H16.2995L11.5541 13.096V13.0956Z" />
      </svg>
    ),
  },
  {
    name: "Youtube",
    href: "https://www.youtube.com/channel/UCm_LnFWz93XdNHdP89e69Rw",
    icon: (props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) => (
      <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
        <path
          fillRule="evenodd"
          d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.998 8.746 22 12 22 12s0 3.255-.418 4.814a2.504 2.504 0 0 1-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 0 1-1.768-1.768C2 15.255 2 12 2 12s0-3.255.417-4.814a2.507 2.507 0 0 1 1.768-1.768C5.744 5 11.998 5 11.998 5s6.255 0 7.814.418ZM15.194 12 10 15V9l5.194 3Z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
];

export default function Footer() {
  return (
    <footer className="relative" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">
        Footer
      </h2>
      <div className="mx-auto max-w-7xl px-6 pb-8 pt-4 sm:pt-24 lg:px-8 lg:pt-8">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          <div className="space-y-8">
            <img className="h-7 rounded-md" src={logomd} alt="DataLine" />
            <p className="text-sm leading-6 text-gray-300">
              Making data accessible to everyone.
            </p>
            <div className="flex space-x-6">
              {socials.map((item) => (
                <a
                  data-umami-event="click_socials"
                  data-umami-event-name={item.name}
                  key={item.name}
                  href={item.href}
                  className="text-gray-500 hover:text-gray-400"
                >
                  <span className="sr-only">{item.name}</span>
                  <item.icon className="h-6 w-6" aria-hidden="true" />
                </a>
              ))}
            </div>
            <div className="py-4">
              <a
                href="https://theresanaiforthat.com/ai/dataline/?ref=featured&v=1901847"
                target="_blank"
                rel="nofollow"
              >
                <img
                  width="300"
                  src="https://media.theresanaiforthat.com/featured-on-taaft.png?width=600"
                />
              </a>
            </div>
          </div>
          <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              {/* {navigation.solutions.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold leading-6 text-white">
                    Solutions
                  </h3>
                  <ul role="list" className="mt-6 space-y-4">
                    {navigation.solutions.map((item) => (
                      <li key={item.name}>
                        <a
                          href={item.href}
                          className="text-sm leading-6 text-gray-300 hover:text-white"
                        >
                          {item.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )} */}

              {navigation.support.length > 0 && (
                <div className="mt-10 md:mt-0">
                  <h3 className="text-sm font-semibold leading-6 text-white">
                    Support
                  </h3>
                  <ul role="list" className="mt-6 space-y-4">
                    {navigation.support.map((item) => (
                      <li key={item.name}>
                        <a
                          data-umami-event="click_socials"
                          data-umami-event-name={item.name}
                          href={item.href}
                          className="text-sm leading-6 text-gray-300 hover:text-white"
                        >
                          {item.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold leading-6 text-white">
                  Company
                </h3>
                <ul role="list" className="mt-6 space-y-4">
                  {navigation.company.map((item) => (
                    <li key={item.name}>
                      <a
                        href={item.href}
                        className="text-sm leading-6 text-gray-300 hover:text-white"
                      >
                        {item.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-semibold leading-6 text-white">
                  Legal
                </h3>
                <ul role="list" className="mt-6 space-y-4">
                  {navigation.legal.map((item) => (
                    <li key={item.name}>
                      <a
                        href={item.href}
                        className="text-sm leading-6 text-gray-300 hover:text-white"
                      >
                        {item.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-16 border-t border-white/10 pt-8 sm:mt-20 lg:mt-24">
          <p className="mt-8 text-sm leading-5 text-gray-400 md:order-1 md:mt-0">
            &copy; 2024 DataLine B.V. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
