import { useState, useRef } from "react";
import { UserCircleIcon } from "@heroicons/react/20/solid";
import MaskedInput from "./MaskedInput";
import {
  useGetAvatar,
  useGetUserProfile,
  useUpdateUserInfo,
  useUpdateUserAvatar,
} from "@/hooks";
import { enqueueSnackbar } from "notistack";
import { Switch } from "@components/Catalyst/switch";
import _ from "lodash";
import { Input } from "@catalyst/input";
import { Button } from "../Catalyst/button";
import { IUserInfo } from "../Library/types";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export default function Account() {
  const { data: profile } = useGetUserProfile();
  const [userInfo, setUserInfo] = useState(profile);
  const { data: avatarUrl } = useGetAvatar();
  const { mutate: updateUserInfo } = useUpdateUserInfo({
    onSuccess(data: IUserInfo) {
      enqueueSnackbar({
        variant: "success",
        message: "User info updated",
      });
      setUserInfo(data);
    },
  });
  const { mutate: updateAvatar, isPending } = useUpdateUserAvatar();

  const avatarUploadRef = useRef<HTMLInputElement>(null);

  // Store values from inputs

  function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    if (!event.target.files || event.target.files.length === 0) {
      throw new Error("You must select an image to upload.");
    }
    // Update profile avatar URL
    updateAvatar(event.target.files[0]);
  }
  const settingsChanged = !_.isEqual(userInfo, profile);

  function updateUserInfoWithKeys() {
    if (userInfo == null || profile == null) return;
    // filter out values that are unchanged between userInfo state and profile tanstack state
    const updatedUserInfo = Object.fromEntries(
      Object.entries(userInfo).filter(
        // @ts-expect-error, we don't care that profile[key] is "any". It's not.
        ([key, value]) => profile[key] !== value
      )
    );
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
                      className="block text-md font-medium leading-6 text-white"
                    >
                      OpenAI API Key
                    </label>
                    <div className="mt-2">
                      <MaskedInput
                        value={userInfo?.openai_api_key || ""}
                        autoFocus={false}
                        onChange={(value) =>
                          setUserInfo((prevUserInfo) => ({
                            ...prevUserInfo!,
                            openai_api_key: value,
                          }))
                        }
                      />
                    </div>
                    <p className="text-xs sm:text-sm text-gray-400 pt-2">
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
                      htmlFor="base-url"
                      className="block text-md font-medium leading-6 text-white"
                    >
                      OpenAI Base URL
                    </label>
                    <div className="mt-2 mr-9 sm:mr-11">
                      <Input
                        type="text"
                        autoComplete="off"
                        name="base-url"
                        id="base-url"
                        onChange={(event) =>
                          setUserInfo((prevUserInfo) => ({
                            ...prevUserInfo!,
                            openai_base_url: event.target.value,
                          }))
                        }
                        value={userInfo?.openai_base_url || ""}
                        className="font-mono"
                      />
                    </div>
                    <p className="text-xs sm:text-sm text-gray-400 pt-2">
                      Base URL path for API requests, leave blank if not using a
                      proxy or service emulator.
                    </p>
                  </div>

                  <div className="col-span-full">
                    <label
                      htmlFor="current-password"
                      className="block text-md font-medium leading-6 text-white"
                    >
                      LangSmith API Key (tracing)
                    </label>
                    <div className="mt-2">
                      <MaskedInput
                        value={userInfo?.langsmith_api_key || ""}
                        autoFocus={false}
                        onChange={(value) =>
                          setUserInfo((prevUserInfo) => ({
                            ...prevUserInfo!,
                            langsmith_api_key: value,
                          }))
                        }
                      />
                    </div>
                    <p className="text-xs md:text-sm text-gray-400 pt-2">
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
                    <div className="flex items-center gap-x-6 cursor-pointer">
                      <label
                        htmlFor="current-password"
                        className="block text-md font-medium leading-6 text-white"
                      >
                        Send error reports
                      </label>
                      <Switch
                        name="allow_sentry"
                        color="green"
                        checked={userInfo?.sentry_enabled ?? true}
                        onChange={(value) =>
                          setUserInfo((prevUserInfo) => ({
                            ...prevUserInfo!,
                            sentry_enabled: value,
                          }))
                        }
                      />
                    </div>
                    <p className="text-xs md:text-sm text-gray-400 pt-2">
                      Send technical errors to our Sentry instance to help us
                      debug errors. Disable this if you're using sensitive data.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-8 sm:max-w-xl sm:grid-cols-6">
                  <div className="col-span-full">
                    <div className="flex items-center gap-x-6 cursor-pointer">
                      <label
                        htmlFor="current-password"
                        className="block text-md font-medium leading-6 text-white"
                      >
                        Send anonymized & safe analytics
                      </label>
                      <Switch
                        name="allow_analytics"
                        color="green"
                        checked={userInfo?.analytics_enabled ?? true}
                        onChange={(value) =>
                          setUserInfo((prevUserInfo) => ({
                            ...prevUserInfo!,
                            analytics_enabled: value,
                          }))
                        }
                      />
                    </div>
                    <p className="text-xs md:text-sm text-gray-400 pt-2">
                      No user data or IP addresses collected, only generic
                      events to improve product development. Code is open
                      source, zero trust needed!
                    </p>
                  </div>
                </div>

                <div className="mt-8 flex">
                  <Button
                    color="green"
                    disabled={!settingsChanged}
                    className={classNames(
                      "rounded-md px-3 py-2 text-sm font-semibold shadow-sm",
                      settingsChanged
                        ? "bg-indigo-500 text-white hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                        : "text-gray-300 bg-indigo-700"
                    )}
                    onClick={updateUserInfoWithKeys}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid max-w-7xl grid-cols-1 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8">
              <div></div>
              <div className="md:col-span-2">
                <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:max-w-xl sm:grid-cols-6">
                  <div className="col-span-full">
                    <div className="max-w-2xl text-white">
                      Enjoying DataLine? Subscribe to our newsletter for
                      updates.
                    </div>
                    <form
                      className="mt-4 flex max-w-md gap-x-4"
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
          </div>
        </main>
      </div>
    </>
  );
}
