import { useState } from "react";
import anthony from "../../assets/images/anthony.jpg";
import rami from "../../assets/images/rami.jpeg";
import {
  AcademicCapIcon,
  HandRaisedIcon,
  LockClosedIcon,
  SparklesIcon,
  SunIcon,
  UserGroupIcon,
} from "@heroicons/react/20/solid";
import Footer from "./Footer";
import Header from "../Layouts/Header";


const stats = [
  { label: "First prototype", value: "Apr 2023" },
  { label: "Team formed", value: "Jan 2024" },
  { label: "Open sourced", value: "Feb 2024" },
  // { label: "Paid out to creators", value: "$70M" },
];
const values = [
  {
    name: "Never compromise on privacy.",
    description:
      "This is a value we hold dear. We won't store your data. We won't even look at your data without your permission.",
    icon: LockClosedIcon,
  },
  {
    name: "Data is a collaborative effort.",
    description:
      "We're not trying to take data analysts out of the loop. We're making it easier for everyone to work with data collaboratively.",
    icon: UserGroupIcon,
  },
  {
    name: "Always open source.",
    description:
      "Not sure if we'll ever be able to move out of the garage, but we'll always be open source. We believe in the power of the community.",
    icon: SparklesIcon,
  },
  // {
  //   name: "Always learning.",
  //   description:
  //     "Iure sed ab. Aperiam optio placeat dolor facere. Officiis pariatur eveniet atque et dolor.",
  //   icon: AcademicCapIcon,
  // },
  // {
  //   name: "Share everything you know.",
  //   description:
  //     "Laudantium tempora sint ut consectetur ratione. Ut illum ut rem numquam fuga delectus.",
  //   icon: SparklesIcon,
  // },
  // {
  //   name: "Enjoy downtime.",
  //   description:
  //     "Culpa dolorem voluptatem velit autem rerum qui et corrupti. Quibusdam quo placeat.",
  //   icon: SunIcon,
  // },
];
const team = [
  {
    name: "Rami Awar",
    // role: "Founder",
    imageUrl: rami,
  },
  {
    name: "Anthony Malkoun",
    // role: "Founder",
    imageUrl: anthony,
  },
];

export default function About() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="bg-gray-900">
      {/* Header */}
      <Header />

      <main className="relative isolate">
        {/* Background */}
        <div
          className="absolute inset-x-0 top-4 -z-10 flex transform-gpu justify-center overflow-hidden blur-3xl"
          aria-hidden="true"
        >
          <div
            className="aspect-[1108/632] w-[69.25rem] flex-none bg-gradient-to-r from-[#80caff] to-[#4f46e5] opacity-25"
            style={{
              clipPath:
                "polygon(73.6% 51.7%, 91.7% 11.8%, 100% 46.4%, 97.4% 82.2%, 92.5% 84.9%, 75.7% 64%, 55.3% 47.5%, 46.5% 49.4%, 45% 62.9%, 50.3% 87.2%, 21.3% 64.1%, 0.1% 100%, 5.4% 51.1%, 21.4% 63.9%, 58.9% 0.2%, 73.6% 51.7%)",
            }}
          />
        </div>

        {/* Header section */}
        <div className="px-6 pt-14 lg:px-8">
          <div className="mx-auto max-w-2xl pt-24 text-center sm:pt-40">
            <h2 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
              We love data. We want to make it accessible.
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              Gone are the days of waiting for your data team to get back to you. Or rustling through hundreds of table schemas and column names to find knowledge you need to draft a query.
            </p>
          </div>
        </div>

        {/* Content section */}
        <div className="mx-auto mt-20 max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-none">
            <div className="grid max-w-xl grid-cols-1 gap-8 text-base leading-7 text-gray-300 lg:max-w-none lg:grid-cols-2">
              <div>
                <p>
                  We really believe in focusing on what matters. And when it comes to data, the question is what matters most. Not how we get to the answer.
                </p>
                <p className="mt-8">
                  We're here to make data accessible to everyone. By doing so, we'll be saving you time and lots of money. Need a table? Get it in seconds. Need a chart? Great. Need to build a report? A dashboard? You can do it all without writing a single query.
                </p>
              </div>
              <div>
                <p>
                  Our committment to privacy is unwavering. We don't like the direction the big corps are leading us in. DataLine and all our future products will definitely be privacy-first as well, so you can sign up for our journey if you appreciate that kind of thing.
                </p>
                <p className="mt-8">
                  We're far from done working on this product, but we already have something that works for a large majority of users. It fuels us to see the impact DataLine is having on our first few users, and we wish we could build even faster to get it in the hands of more people and cover more usecases.
                </p>
              </div>
            </div>
            <dl className="mt-16 grid grid-cols-1 gap-x-8 gap-y-12 sm:mt-20 sm:grid-cols-2 sm:gap-y-16 lg:mt-28 lg:grid-cols-4">
              {stats.map((stat, statIdx) => (
                <div
                  key={statIdx}
                  className="flex flex-col-reverse gap-y-3 border-l border-white/20 pl-6"
                >
                  <dt className="text-base leading-7 text-gray-300">
                    {stat.label}
                  </dt>
                  <dd className="text-3xl font-semibold tracking-tight text-white">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Image section */}
        {/* <div className="mt-32 sm:mt-40 xl:mx-auto xl:max-w-7xl xl:px-8">
          <img
            src="https://images.unsplash.com/photo-1521737852567-6949f3f9f2b5?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2894&q=80"
            alt=""
            className="aspect-[9/4] w-full object-cover xl:rounded-3xl"
          />
        </div> */}

        {/* Values section */}
        <div className="mx-auto mt-32 max-w-7xl px-6 sm:mt-40 lg:px-8">
          <div className="mx-auto max-w-2xl lg:mx-0">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Our values
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              More important than a roadmap, our values will tell you everything you need to know about where we're headed and what we're trying to build here.
            </p>
          </div>
          <dl className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 text-base leading-7 text-gray-300 sm:grid-cols-2 lg:mx-0 lg:max-w-none lg:gap-x-16">
            {values.map((value) => (
              <div key={value.name} className="relative pl-9">
                <dt className="inline font-semibold text-white">
                  <value.icon
                    className="absolute left-1 top-1 h-5 w-5 text-indigo-500"
                    aria-hidden="true"
                  />
                  {value.name}
                </dt>{" "}
                <dd className="inline">{value.description}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Team section */}
        <div className="mx-auto mt-32  mb-40 max-w-7xl px-6 sm:mt-40 lg:px-8">
          <div className="mx-auto max-w-2xl lg:mx-0">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Our team
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              The delightful duo behind DataLine.
            </p>
          </div>
          <ul
            role="list"
            className="mx-auto mt-20 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-14 sm:grid-cols-2 lg:mx-0 lg:max-w-none lg:grid-cols-3 xl:grid-cols-4"
          >
            {team.map((person) => (
              <li key={person.name}>
                <img
                  className="aspect-[14/13] w-full rounded-2xl object-cover"
                  src={person.imageUrl}
                  alt=""
                />
                <h3 className="mt-6 text-lg font-semibold leading-8 tracking-tight text-white">
                  {person.name}
                </h3>
                {/* <p className="text-base leading-7 text-gray-300">
                  {person.role}
                </p>
                <p className="text-sm leading-6 text-gray-500">
                  {person.location}
                </p> */}
              </li>
            ))}
          </ul>
        </div>


      </main>

      <Footer />
    </div>
  );
}
