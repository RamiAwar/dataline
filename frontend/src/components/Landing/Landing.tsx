import { BackgroundLayout } from "@components/Layouts/BackgroundLayout";

import headline_image from "@/assets/images/headline_image.png";
import devhunt_orange from "@/assets/images/devhunt_orange.svg";
import demo_gif from "@/assets/images/demo.gif";
import data_security_image from "@/assets/images/data_security.avif";

import "./Landing.css";
import { EmailSignupForm } from "@/components/Landing/EmailSignupForm";
import SquareBackground from "@components/Layouts/SquareBackground";
import SquareBackgroundInverted from "@components/Layouts/SquareBackgroundInverted";
import BackgroundHighlight from "@components/Layouts/BackgroundHighlight";
import FeatureComparisonTable from "./FeatureComparisonTable";
import { InstallSection } from "@components/Landing/InstallSection";
import Header from "@components/Layouts/Header";
import { Element } from "react-scroll";
import Footer from "./Footer";

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
        "Your time is too valuable to be looking up column names.<br>Focus on the questions. DataLine will handle the rest, instantly.",
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
                  className="mt-6 text-lg leading-8 text-gray-300"
                  dangerouslySetInnerHTML={{
                    __html: CohortData[selectedCohort].description,
                  }}
                ></p>
              </div>

              <div className="pb-6 sm:pb-12">
                <div className="mx-auto max-w-7xl px-6 lg:px-8 flex gap-4 sm:gap-8 justify-center">
                  {/* <div className="mx-auto grid max-w-lg grid-cols-4 items-center gap-x-8 gap-y-12 sm:max-w-xl sm:grid-cols-6 sm:gap-x-10 sm:gap-y-14 lg:mx-0 lg:max-w-none lg:grid-cols-5"> */}
                  <div className="shrink">
                    <a href="https://devhunt.org/tool/dataline">
                      <img
                        className="mx-auto col-span-2 max-h-12 w-full object-contain lg:col-span-1"
                        src={devhunt_orange}
                        alt="Reform"
                        width="158"
                        height="48"
                      />
                    </a>
                  </div>
                  <div className="shrink">
                    <a
                      href="https://theresanaiforthat.com/ai/dataline/?ref=featured&v=1901847"
                      target="_blank"
                      rel="nofollow"
                    >
                      <img
                        className="max-h-12"
                        src="https://media.theresanaiforthat.com/featured-on-taaft.png?width=600"
                      />
                    </a>
                  </div>
                  {/* </div> */}
                </div>
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
          {/* Removed until we update the demo video */}
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

          <Footer />
        </SquareBackgroundInverted>
      </div>
    </>
  );
};
