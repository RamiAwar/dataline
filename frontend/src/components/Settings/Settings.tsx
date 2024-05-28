import { useState, useRef } from "react";
import { UserCircleIcon } from "@heroicons/react/20/solid";
import MaskedInput from "./MaskedInput";
import {
  useGetAvatar,
  useGetUserProfile,
  useUpdateUserInfo,
  useUpdateUserAvatar,
} from "@/hooks";
import { Switch, SwitchField } from "@components/Catalyst/switch";
import { Label } from "@components/Catalyst/fieldset";
import _ from "lodash";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export default function Account() {
  const { data: profile } = useGetUserProfile();
  const { data: avatarUrl } = useGetAvatar();
  const { mutate: updateUserInfo } = useUpdateUserInfo();
  const { mutate: updateAvatar, isPending } = useUpdateUserAvatar();

  const avatarUploadRef = useRef<HTMLInputElement>(null);

  // Store values from inputs
  const [userInfo, setUserInfo] = useState(profile);

  function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    if (!event.target.files || event.target.files.length === 0) {
      throw new Error("You must select an image to upload.");
    }
    // Update profile avatar URL
    updateAvatar(event.target.files[0]);
  }
  const settingsChanged = !_.isEqual(userInfo, profile);

  function updateUserInfoWithKeys() {
    if (userInfo == null) return;
    const updatedUserInfo = {
      ...userInfo,
      openai_api_key:
        userInfo.openai_api_key === "**********"
          ? undefined
          : userInfo.openai_api_key,
      langsmith_api_key:
        userInfo.langsmith_api_key === "**********"
          ? undefined
          : userInfo.langsmith_api_key,
    };
    updateUserInfo(updatedUserInfo);
  }

  return (
    <>
      <div>
        <main>
          <h1 className="sr-only">Settings</h1>

          {/* Settings forms */}
          <div className="divide-y divide-white/5">
            {/* Personal info */}
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
                          width: "1rem",
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
                        value={userInfo?.name || ""}
                        onChange={(event) =>
                          setUserInfo((prevUserInfo) => ({
                            ...prevUserInfo!,
                            name: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Keys */}
            <div className="grid max-w-7xl grid-cols-1 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8">
              <div>
                <h2 className="text-base font-semibold leading-7 text-white">
                  API Keys
                </h2>
                <p className="mt-1 text-sm leading-6 text-gray-400">
                  Update your API keys.
                </p>
              </div>

              <div className="md:col-span-2">
                <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:max-w-xl sm:grid-cols-6">
                  <div className="col-span-full">
                    <label
                      htmlFor="current-password"
                      className="block text-sm font-medium leading-6 text-white"
                    >
                      OpenAI API Key
                    </label>
                    <div className="mt-2">
                      <MaskedInput
                        value={userInfo?.openai_api_key || ""}
                        onChange={(value) =>
                          setUserInfo((prevUserInfo) => ({
                            ...prevUserInfo!,
                            openai_api_key: value,
                          }))
                        }
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

                  <div className="col-span-full">
                    <label
                      htmlFor="current-password"
                      className="block text-sm font-medium leading-6 text-white"
                    >
                      LangSmith API Key (tracing)
                    </label>
                    <div className="mt-2">
                      <MaskedInput
                        value={userInfo?.langsmith_api_key || ""}
                        onChange={(value) =>
                          setUserInfo((prevUserInfo) => ({
                            ...prevUserInfo!,
                            langsmith_api_key: value,
                          }))
                        }
                      />
                    </div>
                    <p className="text-xs text-gray-400 pt-2">
                      Useful to visualize the LLM query graph and different
                      tools used.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sentry Preference */}
            <div className="grid max-w-7xl grid-cols-1 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8">
              <div>
                <h2 className="text-base font-semibold leading-7 text-white">
                  Preferences
                </h2>
              </div>

              <div className="md:col-span-2">
                <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:max-w-xl sm:grid-cols-6">
                  <div className="col-span-full">
                    <SwitchField>
                      <Label>Send Error Reports</Label>
                      <Switch
                        name="allow_sentry"
                        checked={userInfo?.sentry_enabled ?? true}
                        onChange={(value) =>
                          setUserInfo((prevUserInfo) => ({
                            ...prevUserInfo!,
                            sentry_enabled: value,
                          }))
                        }
                      />
                    </SwitchField>
                  </div>
                </div>
                <div className="mt-8 flex">
                  <button
                    disabled={!settingsChanged}
                    type="submit"
                    className={classNames(
                      "rounded-md px-3 py-2 text-sm font-semibold shadow-sm",
                      settingsChanged
                        ? "bg-indigo-500 text-white hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                        : "text-gray-300 bg-indigo-700"
                    )}
                    onClick={updateUserInfoWithKeys}
                  >
                    Save
                  </button>
                </div>
                <div className="p-10">
                  <div className="mx-auto max-w-2xl text-center text-white">
                    Enjoying DataLine? Subscribe to our newsletter for updates.
                  </div>
                  <form
                    className="mx-auto mt-4 flex max-w-md gap-x-4"
                    method="POST"
                    action="https://listmonk.dataline.app/subscription/form"
                  >
                    <input type="hidden" name="nonce" />
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

                    {/* Subscribe to "Subscribers" list, add more here if needed */}
                    <input
                      className="hidden"
                      type="checkbox"
                      name="l"
                      readOnly
                      checked
                      value="e675d172-5277-4e0b-9b79-f4f21f164f44"
                    />
                    <button
                      type="submit"
                      className="flex-none rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    >
                      Subscribe
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
