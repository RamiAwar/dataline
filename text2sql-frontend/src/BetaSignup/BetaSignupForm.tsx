export const BetaSignupForm = () => {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
        Seamlessly explore.
        <br />
        Join our beta today.
      </h2>
      <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-300">
        Incididunt sint fugiat pariatur cupidatat consectetur sit cillum anim id
        veniam aliqua proident excepteur commodo do ea.
      </p>
      <form
        className="mx-auto mt-10 flex max-w-md gap-x-4"
        action="https://submit-form.com/4TBuuwZW"
      >
        <label htmlFor="email-address" className="sr-only">
          Email address
        </label>
        <input
          id="email-address"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="min-w-0 flex-auto rounded-md border-0 bg-white/5 px-3.5 py-2 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-white sm:text-sm sm:leading-6"
          placeholder="Enter your email"
        />
        <button
          type="submit"
          className="flex-none rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Notify me
        </button>
      </form>
    </div>
  );
};
