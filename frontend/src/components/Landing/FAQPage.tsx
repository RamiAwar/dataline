// Create component that shows how privacy works + privacy policy

import Header from "@components/Layouts/Header";

const FAQPage = () => {
  const faqs = [
    {
      question: "How do you store convos, messages, others?",
      answer:
        "Our query flow currently runs everything locally on your machine. Any stored data (conversations, messages, etc.) is stored on your machine in SQLite. No servers, no cloud, no risk of leaks. We don't even own a server, this site is statically hosted 🙂",
    },
    {
      question: "How do you query my data sources?",
      answer:
        "Since everything is local, we connect to your data sources (files, databases, etc.) locally. Most secure way of transmitting data is not transmitting any 😎. This also makes you responsible for providing us with a secure connection to your data, giving you maximum control over everything 🔥",
    },
    {
      question: "Does the LLM see my data?",
      answer:
        "Nope, not by default! The LLM only has access to descriptions of your data, including table names, column names, and their types. You can choose to let the LLM see sample rows + results if you choose however, not everyone has sensitive data.",
    },
  ];

  return (
    <>
      <Header></Header>

      <div className="pt-40 h-full lg:-mt-20">
        <div className="mx-auto max-w-7xl px-6 h-full lg:px-8 lg:flex lg:items-center">
          <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-none">
            <p className="text-base font-semibold leading-7 text-indigo-600">
              FAQs
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-100 sm:text-4xl">
              Frequently Asked Questions
            </h1>
            <div className="mt-10 grid max-w-xl grid-cols-1 gap-8 text-base leading-7 text-gray-300 lg:max-w-none lg:grid-cols-2">
              <div>
                <h1 className="text-xl font-semibold mb-2">
                  {faqs[0].question}
                </h1>
                <p>{faqs[0].answer}</p>
                <h1 className="text-xl font-semibold mt-8 mb-2">
                  {faqs[1].question}
                </h1>
                <p>{faqs[1].answer}</p>
              </div>
              <div>
                <h1 className="text-xl font-semibold mb-2">
                  {faqs[2].question}
                </h1>
                <p>{faqs[2].answer}</p>
              </div>
            </div>
            <div className="mt-10 flex"></div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FAQPage;
