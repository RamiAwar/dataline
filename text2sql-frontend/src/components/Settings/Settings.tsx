import { useState, useRef, useEffect } from "react";
import { UserCircleIcon } from "@heroicons/react/20/solid";
import MaskedInput from "./MaskedInput";
import {
  useGetAvatar,
  useGetUserProfile,
  useUpdateUserInfo,
  useUpdateUserAvatar,
} from "@/hooks";

export default function Account() {
  const { data: profile } = useGetUserProfile();
  const { data: avatarUrl } = useGetAvatar();
  const { mutate: updateUserInfo } = useUpdateUserInfo();
  const { mutate: updateAvatar, isPending } = useUpdateUserAvatar();

  const avatarUploadRef = useRef<HTMLInputElement>(null);

  // Store values from inputs
  const [name, setName] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);

  // Update name and api key when user info changes
  // TODO - use a form manager, this is not necessary
  useEffect(() => {
    setName(profile?.name || null);
    setApiKey(profile?.openai_api_key || null);
  }, [profile]);

  function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    if (!event.target.files || event.target.files.length === 0) {
      throw new Error("You must select an image to upload.");
    }
    // Update profile avatar URL
    updateAvatar(event.target.files[0]);
  }

  // TODO - debounce this
  function _updateName() {
    if (!name) return;
    updateUserInfo({ name });
  }

  // TODO - debounce this
  function _updateApiKey() {
    if (!apiKey) return;
    updateUserInfo({ openai_api_key: apiKey });
  }

  return (
    <>
      <div>
        <div className="">
          <main>
            <h1 className="sr-only">Settings</h1>

            {/* Settings forms */}
            <div className="divide-y divide-white/5">
              <div className="grid max-w-7xl grid-cols-1 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8">
                <div>
                  <h2 className="text-base font-semibold leading-7 text-white">
                    Personal Information
                  </h2>
                  {/* <p className="mt-1 text-sm leading-6 text-gray-400">
                    Customize how your account looks in the chats
                  </p> */}
                </div>

                <div className="md:col-span-2">
                  <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:max-w-xl sm:grid-cols-6">
                    <div className="col-span-full flex items-center gap-x-8">
                      {avatarUrl ? (
                        <img
                          className="h-24 w-24 flex-none rounded-lg bg-gray-800 object-cover"
                          src={avatarUrl}
                          alt=""
                        />
                      ) : (
                        <UserCircleIcon className="text-gray-300 h-8 w-8 rounded-full " />
                      )}
                      <div>
                        <button
                          type="button"
                          className="rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-white/20"
                          onClick={() => avatarUploadRef.current?.click()}
                        >
                          Change profile pic
                        </button>
                        <p className="mt-2 text-xs leading-5 text-gray-400">
                          Images only, 5MB max.
                        </p>
                        <input
                          style={{
                            visibility: "hidden",
                            position: "absolute",
                          }}
                          type="file"
                          id="avatar-upload"
                          accept="image/*"
                          onChange={(
                            event: React.ChangeEvent<HTMLInputElement>
                          ) => uploadAvatar(event)}
                          disabled={isPending}
                          ref={avatarUploadRef}
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-3">
                      <label
                        htmlFor="first-name"
                        className="block text-sm font-medium leading-6 text-white"
                      >
                        First name
                      </label>
                      <div className="mt-2">
                        <input
                          type="text"
                          name="first-name"
                          id="first-name"
                          autoComplete="given-name"
                          className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                          value={name || ""}
                          onChange={(event) => setName(event.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex">
                    <button
                      type="submit"
                      className="rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                      onClick={_updateName}
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid max-w-7xl grid-cols-1 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8">
                <div>
                  <h2 className="text-base font-semibold leading-7 text-white">
                    API Keys
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-gray-400">
                    Update your OpenAI API key.
                  </p>
                </div>

                <div className="md:col-span-2">
                  <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:max-w-xl sm:grid-cols-6">
                    <div className="col-span-full">
                      <label
                        htmlFor="current-password"
                        className="block text-sm font-medium leading-6 text-white"
                      >
                        API Key
                      </label>
                      <div className="mt-2">
                        <MaskedInput
                          value={apiKey || ""}
                          onChange={setApiKey}
                        />
                      </div>
                      <p className="text-xs text-gray-400 pt-2">
                        Please setup your API key with{" "}
                        <a
                          className="underline"
                          target="_blank"
                          href="https://help.openai.com/en/articles/8867743-assign-api-key-permissions"
                        >
                          full permissions{" "}
                        </a>
                        to use DataLine.
                      </p>
                    </div>
                  </div>
                  <div className="mt-8 flex">
                    <button
                      type="submit"
                      className="rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                      onClick={_updateApiKey}
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
