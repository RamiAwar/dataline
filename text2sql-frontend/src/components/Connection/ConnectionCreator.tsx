import { Field, Fieldset, Label, Legend } from '@catalyst/fieldset'
import { Radio, RadioField, RadioGroup } from '@catalyst/radio'
import { useEffect, useRef, useState } from 'react'
import { api } from "@/api"
import { Input } from '@catalyst/input'
import { Button } from '@catalyst/button'
import { enqueueSnackbar } from 'notistack'
import { Routes } from '@/router'
import { useNavigate } from 'react-router-dom'
import { useConnectionList } from '@components/Providers/ConnectionListProvider'
import { isAxiosError } from 'axios'
import { CloudArrowUpIcon, DocumentCheckIcon } from '@heroicons/react/24/solid'
import { XCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'


function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}


const ConnectionCreator = ({ name = null }: { name: string | null }) => {

  type RadioValue = "database" | "file" | null;
  const [selectedRadio, setSelectedRadio] = useState<RadioValue>(null);
  const [dsn, setDsn] = useState<string | null>(null);
  const [file, setFile] = useState<File>();
  const [, , fetchConnections] = useConnectionList();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const navigate = useNavigate();

  const handleCustomCreate = async () => {
    // Call api with name and dsn
    if (name === null || name === "" || dsn === null || dsn === "") {
      enqueueSnackbar({
        variant: "info",
        message: "Please enter a name and dsn for this connection",
      });
    } else if (name && dsn) {
      try {
        await api.createConnection(dsn, name, false);
        fetchConnections();
        enqueueSnackbar({
          variant: "success",
          message: "Connection created",
        });
        navigate(Routes.Root);
      } catch (exception) {
        if (isAxiosError(exception) && exception.response?.status === 409) {
          enqueueSnackbar({
            variant: "info",
            message: "Connection already exists, skipping creation",
          });
        } else if (isAxiosError(exception) && exception.response?.status === 422) {
          enqueueSnackbar({
            variant: "error",
            message: exception.response?.data.detail[0].msg,
          });
        } else if (isAxiosError(exception) && exception.response?.status === 400) {
          enqueueSnackbar({
            variant: "error",
            message: exception.response?.data.detail,
          });
        } else {
          if (isAxiosError(exception) && exception.response?.data?.detail) {
            enqueueSnackbar({
              variant: "error",
              message: exception.response?.data?.detail
            });
          } else {
            enqueueSnackbar({
              variant: "error",
              message: "Error creating connection, please check your DSN.",
            });
          }
        }
      }
    }
  }

  const handleFileCreate = async () => {
    if (!file) {
      enqueueSnackbar({
        variant: "info",
        message: "Please add a file",
      });
      return
    }

    if (name === null || name === "") {
      enqueueSnackbar({
        variant: "info",
        message: "Please add a name",
      });
      return
    }

    // Limit file size to 500MB
    if (file.size > 1024 * 1024 * 500) {
      enqueueSnackbar({
        variant: "info",
        message: "File size exceeds 500MB limit",
      });
      return
    }

    try {
      await api.createFileConnection(file, name);
      fetchConnections();
      enqueueSnackbar({
        variant: "success",
        message: "Connection created",
      });
      navigate(Routes.Root);
    } catch (exception) {
      if (isAxiosError(exception) && exception.response?.status === 409) {
        enqueueSnackbar({
          variant: "info",
          message: "Connection already exists, skipping creation",
        });
      } else if (isAxiosError(exception) && exception.response?.status === 422) {
        enqueueSnackbar({
          variant: "error",
          message: exception.response?.data.detail[0].msg,
        });
      } else if (isAxiosError(exception) && exception.response?.status === 400) {
        enqueueSnackbar({
          variant: "error",
          message: exception.response?.data.detail,
        });
      } else {
        if (isAxiosError(exception) && exception.response?.data?.detail) {
          enqueueSnackbar({
            variant: "error",
            message: exception.response?.data?.detail
          });
        } else {
          enqueueSnackbar({
            variant: "error",
            message: "Error creating connection, please check your DSN.",
          });
        }
      }
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log("her");
    const files = event.target.files;
    console.log(files);
    if (files && files.length > 0) {
      setFile(files[0]);
    }
  }

  return (
    <div>
      <Fieldset>
        <Legend>Create a custom connection</Legend>
        <RadioGroup defaultValue="" onChange={(selection: string) => setSelectedRadio(selection as RadioValue)}>
          <RadioField>
            <Radio value="database" color="white" />
            <Label className="cursor-pointer">Postgres, MySQL connection</Label>
          </RadioField>
          <RadioField>
            <Radio value="file" color="white" />
            <Label className="cursor-pointer">SQLite file</Label>
          </RadioField>
        </RadioGroup>
      </Fieldset>
      <div className="mt-10 max-w-2xl">
        {selectedRadio === "database" && (
          <div>
            <Field>
              <Label>Connection DSN</Label>
              <Input type="text" placeholder="postgres://myuser:mypassword@localhost:5432/mydatabase" onChange={(e) => setDsn(e.target.value)} />
            </Field>
            <Button className="cursor-pointer mt-4" onClick={handleCustomCreate}>Create connection</Button>
          </div>
        )}
        {selectedRadio === "file" && (
          <div>
            <Field>
              <Label>SQLite data file</Label>
              <div className="mt-2 flex justify-center rounded-lg border border-dashed border-white/60 px-6 py-10">
                <div className={classNames(file ? "" : "hidden", "text-center")}>
                  <div className="relative inline-block">
                    <DocumentCheckIcon className="h-12 w-12 text-gray-300" aria-hidden="true" />
                    <div onClick={() => setFile(undefined)} className="absolute -right-1 -top-1 cursor-pointer block h-3 w-3 rounded-full bg-red-500 ring-4 ring-red-500">
                      <XMarkIcon className="h-3 w-3 text-white [&>path]:stroke-[4]" aria-hidden="true" />
                    </div>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-gray-400">{file && file.name}</p>
                </div>
                <div className={classNames(file ? "hidden" : "", "text-center")}>
                  <CloudArrowUpIcon onClick={handleFileClick} className="cursor-pointer mx-auto h-12 w-12 text-gray-300" aria-hidden="true" />
                  <div className="mt-4 flex text-sm leading-6 text-gray-400">
                    <label
                      htmlFor="file-upload"
                      className="px-1 relative cursor-pointer rounded-md bg-gray-900 font-semibold text-white focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 focus-within:ring-offset-gray-900 hover:text-indigo-500"
                    >
                      <span>Upload a file</span>
                      {/** Set a key so that the input is re-rendered and cleared when the file is removed */}
                      <input ref={fileInputRef} id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} key={file?.name} />
                    </label>
                    <p>or drag and drop</p>
                  </div>
                  <p className="text-xs leading-5 text-gray-400">SQLite file</p>
                </div>
              </div>
            </Field>
            <Button className="cursor-pointer mt-4" onClick={handleFileCreate}>Create connection</Button>
          </div>
        )
        }
      </div >
    </div>
  );
}


export default ConnectionCreator;