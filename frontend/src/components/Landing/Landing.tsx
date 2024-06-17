import { SVGProps } from "react";

import { BackgroundLayout } from "@components/Layouts/BackgroundLayout";

import headline_image from "@/assets/images/headline_image.avif";
import demo_gif from "@/assets/images/demo.gif";
import data_security_image from "@/assets/images/data_security.avif";
import ReactGA from "react-ga4";

import "./Landing.css";
import { EmailSignupForm } from "@/components/Landing/EmailSignupForm";
import SquareBackground from "@components/Layouts/SquareBackground";
import SquareBackgroundInverted from "@components/Layouts/SquareBackgroundInverted";
import BackgroundHighlight from "@components/Layouts/BackgroundHighlight";
import FeatureComparisonTable from "./FeatureComparisonTable";
import { InstallSection } from "@components/Landing/InstallSection";
import Header from "@components/Layouts/Header";
import { Element } from "react-scroll";

const socials = [
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
    name: "Twitter",
    href: "https://twitter.com/iamramiawar",
    icon: (props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) => (
      <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
        <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
      </svg>
    ),
  },
];

// Randomly select cohort
const selectedCohort = "ab-test-1-landing";

const CohortData = {
  "ab-test-1-landing": {
    headline: "Your data just learned to talk. What do you wanna know?",
    description:
      "DataLine is an AI-driven open source and privacy-first platform for data exploration. Your data is accessed using your device and stored on your device. No clouds, only sunshine.",
    feature_group_1: {
      title: "Plugs into your database. Securely.",
      description:
        "You don't have to worry about data security if none of it leaves your device.",
    },
    feature_group_2: {
      title: "Ask, Explore, Edit, Iterate.",
      description:
        "Your time is too valuable to be looking up column names.<br>Focus on the questions. We'll handle the rest, instantly.",
    },
    comparison: {
      title: "How do we compare?",
      description:
        'This is probably the 10th AI tool you see today, so we\'ll make this easy for you.<br>If you\'re still hungry for more, <a style="text-decoration-line: underline;" href="/faq"> check our FAQ page</a>',
    },
    cta_title: "Stay up to date.",
    cta_description: "Promise we won't annoy you, ever.",
    demo: {
      title: "Still here?",
      description: "Here's a 3 minute demo showcasing the core features.",
    },
  },
};

if (process.env.NODE_ENV !== "local") {
  ReactGA.initialize("G-9LG8MD1T1B");
  // Send cohort data to GA
}

export const Landing = () => {
  return (
    <>
      <Header />

      <div className="bg-gray-900 overflow-hidden border-r border-white/5">
        <div className="relative isolate pt-12">
          <BackgroundLayout />
          <div className="pt-24 sm:pt-20 lg:pt-24">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <div className="mx-auto max-w-2xl py-12 text-center">
                <h1 className="text-3xl font-bold tracking-tight text-white sm:text-6xl">
                  {CohortData[selectedCohort].headline}
                </h1>
                <p
                  className="mt-6 text-lg leading-8 text-gray-300 "
                  dangerouslySetInnerHTML={{
                    __html: CohortData[selectedCohort].description,
                  }}
                ></p>
              </div>
              <img
                src={headline_image}
                alt="DataLine platform screenshot"
                width={2432}
                height={1442}
                className="mt-4 bg-white/5 ring-1 ring-white/10 rounded-xl shadow-2xl"
              />
            </div>
          </div>
        </div>

        <BackgroundHighlight>
          <div className="overflow-hidden pt-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 sm:gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-2">
                <div className="lg:pr-8 lg:pt-4">
                  <div className="lg:max-w-lg">
                    <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                      {CohortData[selectedCohort].feature_group_1.title}
                    </p>
                    <p
                      className="mt-6 text-lg leading-8 text-gray-300"
                      dangerouslySetInnerHTML={{
                        __html:
                          CohortData[selectedCohort].feature_group_1
                            .description,
                      }}
                    ></p>
                  </div>
                </div>
                <img
                  src={data_security_image}
                  alt="App screenshot showing data security badge"
                  className="w-[40rem] max-w-none rounded-xl shadow-xl ring-1 ring-white/10 sm:w-[57rem] md:-ml-4 lg:-ml-0"
                />
              </div>
            </div>
          </div>
        </BackgroundHighlight>

        <SquareBackground>
          <div className="pt-16 lg:pt-8">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <div className="mx-auto max-w-2xl sm:text-center">
                {/* <h2 className="text-base font-semibold leading-7 text-indigo-400">Everything you need</h2> */}
                <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  {CohortData[selectedCohort].feature_group_2.title}
                </p>
                <p
                  className="mt-6 text-lg leading-8 text-gray-300"
                  dangerouslySetInnerHTML={{
                    __html:
                      CohortData[selectedCohort].feature_group_2.description,
                  }}
                ></p>
              </div>
            </div>
            <div className="relative pt-16">
              <div className="mx-auto max-w-4xl px-6 lg:px-8 flex justify-center">
                <img
                  loading="lazy"
                  src={demo_gif}
                  alt="Platform demo gif"
                  className="mb-[-12%] max-h-[60vh] rounded-xl shadow-2xl ring-1 ring-white/10"
                />
              </div>
            </div>
          </div>
        </SquareBackground>

        <BackgroundHighlight>
          <div className="pt-48">
            <div className="mx-auto max-w-6xl px-6 lg:px-8">
              <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 sm:gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-2">
                <div className="lg:max-w-md">
                  <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                    {CohortData[selectedCohort].comparison.title}
                  </p>
                  <p
                    className="mt-6 text-lg leading-8 text-gray-300"
                    dangerouslySetInnerHTML={{
                      __html: CohortData[selectedCohort].comparison.description,
                    }}
                  ></p>
                </div>
                <FeatureComparisonTable />
              </div>
            </div>
          </div>
        </BackgroundHighlight>

        {/* CTA section */}
        <Element name="install">
          <InstallSection></InstallSection>
        </Element>

        <SquareBackgroundInverted>
          {/* <div className="overflow-hidden pt-20">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 sm:gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-2">
                <div className="lg:pr-8 lg:pt-4">
                  <div className="lg:max-w-lg">
                    <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                      {CohortData[selectedCohort].demo.title}
                    </p>
                    <p
                      className="mt-6 text-lg leading-8 text-gray-300"
                      dangerouslySetInnerHTML={{
                        __html: CohortData[selectedCohort].demo.description,
                      }}
                    ></p>
                  </div>
                </div>
                <iframe
                  loading="lazy"
                  className="rounded-xl shadow-xl ring-1 ring-white/10 md:-ml-4 lg:-ml-0 w-full h-[20rem] s:w-["
                  src="https://www.youtube.com/embed/3sKIoVp8QRw?si=e4CJ4X3xdLAMBRke"
                  title="YouTube video player"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
          </div> */}

          <div className="pt-36 pb-36">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <div className="mx-auto max-w-2xl sm:text-center">
                <EmailSignupForm
                  title={CohortData[selectedCohort].cta_title}
                  description={CohortData[selectedCohort].cta_description}
                />
              </div>
            </div>
          </div>

          <footer aria-labelledby="footer-heading" className="relative">
            <h2 id="footer-heading" className="sr-only">
              Footer
            </h2>
            <div className="mx-auto max-w-7xl px-6 pb-8 pt-4 lg:px-8 overflow-hidden">
              <div className="border-t border-white/10 pt-8 md:flex md:items-center md:justify-between">
                <div className="flex space-x-6 md:order-2">
                  {socials.map((item) => (
                    <a
                      key={item.name}
                      href={item.href}
                      className="text-gray-500 hover:text-gray-400"
                    >
                      <span className="sr-only">{item.name}</span>
                      <item.icon
                        className="h-6 w-6 lg:h-10 lg:w-10"
                        aria-hidden="true"
                      />
                    </a>
                  ))}
                </div>
                <p className="mt-8 text-sm leading-5 text-gray-400 md:order-1 md:mt-0">
                  &copy; 2024 DataLine B.V. All rights reserved.
                </p>
              </div>
            </div>
          </footer>
        </SquareBackgroundInverted>
      </div>
    </>
  );
};
