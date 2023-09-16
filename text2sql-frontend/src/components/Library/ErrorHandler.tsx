import { XMarkIcon } from "@heroicons/react/20/solid";

export const ErrorHandler = () => {
  return (
    <>
      <div className="lg:ml-72 pointer-events-none fixed inset-x-0 top-0 sm:px-6 sm:py-5 lg:px-8 z-50">
        <div className="pointer-events-auto flex items-center justify-between gap-x-6 bg-red-700 px-6 py-2.5 sm:rounded-xl sm:py-3 sm:pl-4 sm:pr-3.5">
          <p className="text-sm leading-6 text-white">
            <a href="#">
              <strong className="font-semibold">GeneriCon 2023</strong>
              <svg
                viewBox="0 0 2 2"
                className="mx-2 inline h-0.5 w-0.5 fill-current"
                aria-hidden="true"
              >
                <circle cx={1} cy={1} r={1} />
              </svg>
              Join us in Denver from June 7 – 9 to see what’s coming next&nbsp;
              <span aria-hidden="true">&rarr;</span>
            </a>
          </p>
          <button
            type="button"
            className="-m-3 flex-none p-3 focus-visible:outline-offset-[-4px]"
          >
            <span className="sr-only">Dismiss</span>
            <XMarkIcon className="h-5 w-5 text-white" aria-hidden="true" />
          </button>
        </div>
      </div>
    </>
  );
};
