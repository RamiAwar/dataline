import { Description, Fieldset, Label, Legend } from "@catalyst/fieldset";
import { Radio, RadioField, RadioGroup } from "@catalyst/radio";
import { Text } from "@catalyst/text";
import { useState } from "react";
import { SampleResult } from "../../api";
import { enqueueSnackbar } from "notistack";
import { Button } from "@catalyst/button";
import { useCreateConnection, useGetSamples } from "@/hooks";
import { useNavigate } from "react-router-dom";
import { Routes } from "@/router";

export const SampleSelector = ({ name = null }: { name: string | null }) => {
  const navigate = useNavigate();

  const { data } = useGetSamples();
  const samples = data || [];
  const { mutate } = useCreateConnection({
    onSuccess: () => {
      enqueueSnackbar({
        variant: "success",
        message: "Sample connection created",
      });
      navigate(Routes.Root);
    },
  });

  const [selectedSample, setSelectedSample] = useState<SampleResult | null>(
    null
  );

  const handleButtonClick = async () => {
    if (selectedSample !== null) {
      if (name === null || name === "") {
        name = selectedSample.title + " (Sample)";
      } else {
        name = name + " (Sample)";
      }
      mutate({ dsn: selectedSample.file, name, isSample: true });
    } else {
      enqueueSnackbar("Please select a sample dataset.", { variant: "info" });
    }
  };

  const handleRadioChange = (selection: string) => {
    const selectedValue = selection as string;
    const selectedSample = samples.find(
      (sample) => sample.file === selectedValue
    );
    setSelectedSample(selectedSample || null);
  };

  return (
    <Fieldset>
      <Legend>Data Samples</Legend>
      <Text>Pick a sample dataset to get started.</Text>
      <RadioGroup name="sample" defaultValue="" onChange={handleRadioChange}>
        {samples.map((sample, index) => (
          <RadioField key={index}>
            <Radio value={sample.file} color="white" />
            <Label className="cursor-pointer">{sample.title}</Label>
            <Description>{sample.link}</Description>
          </RadioField>
        ))}
      </RadioGroup>

      <Button className="cursor-pointer mt-4" onClick={handleButtonClick}>
        Create sample
      </Button>
    </Fieldset>
  );
};
