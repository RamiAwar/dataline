// Create component that shows how privacy works + privacy policy

import SquareBackground from "./Layouts/SquareBackground";
import { Disclosure } from '@headlessui/react'
import { MinusSmallIcon, PlusSmallIcon } from '@heroicons/react/24/outline'


const FAQPage = () => {

    const faqs = [
        {
            question: "How do you store convos, messages, etc.?",
            answer:
                "Our query flow currently runs everything locally on your machine. Any stored data (conversations, messages, etc.) is stored on your machine in SQLite. No servers, no cloud, no risk of leaks. We don't even own a server, this site is statically hosted 🙂",
        },
        {
            question: "How do you query my data sources?",
            answer: "Since everything is local, we connect to your data sources (files, databases, etc.) locally. Most secure way of transmitting data is not transmitting any 😎. This also makes you responsible for providing us with a secure connection to your data, giving you maximum control over everything 🔥"
        },
        {
            question: "Does the LLM see my data?",
            answer: "Nope, not by default! Let's say we executed SQL, fetched a bunch of rows. The LLM only has access to descriptions of your data, including table names, column names, and their types. You can choose to let the LLM see sample rows + results if you choose however, not everyone has sensitive data."
        }
    ]

    return (
        <SquareBackground>

            <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8 lg:py-40">
                <div className="mx-auto max-w-4xl divide-y divide-white/10">
                    <h2 className="text-2xl font-bold leading-10 tracking-tight text-white">Frequently asked questions</h2>
                    <dl className="mt-10 space-y-6 divide-y divide-white/10">
                        {faqs.map((faq) => (
                            <Disclosure as="div" key={faq.question} className="pt-6">
                                {({ open }) => (
                                    <>
                                        <dt>
                                            <Disclosure.Button className="flex w-full items-start justify-between text-left text-white">
                                                <span className="text-base font-semibold leading-7">{faq.question}</span>
                                                <span className="ml-6 flex h-7 items-center">
                                                    {open ? (
                                                        <MinusSmallIcon className="h-6 w-6" aria-hidden="true" />
                                                    ) : (
                                                        <PlusSmallIcon className="h-6 w-6" aria-hidden="true" />
                                                    )}
                                                </span>
                                            </Disclosure.Button>
                                        </dt>
                                        <Disclosure.Panel as="dd" className="mt-2 pr-12">
                                            <p className="text-base leading-7 text-gray-300">{faq.answer}</p>
                                        </Disclosure.Panel>
                                    </>
                                )}
                            </Disclosure>
                        ))}
                    </dl>
                </div>
            </div>
        </SquareBackground>
    );
}

export default FAQPage;