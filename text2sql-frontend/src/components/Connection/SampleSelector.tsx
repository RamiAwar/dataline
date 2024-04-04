import { Description, Fieldset, Label, Legend } from '@catalyst/fieldset'
import { Radio, RadioField, RadioGroup } from '@catalyst/radio'
import { Text } from '@catalyst/text'
import { useEffect, useState } from 'react'
import { api, SampleResult } from "../../api"
import { enqueueSnackbar } from 'notistack'
import { isAxiosError } from 'axios'
import { useNavigate } from 'react-router-dom'
import { Routes } from '@/router'
import { useConnectionList } from '@/components/Providers/ConnectionListProvider'
import { Button } from '@catalyst/button'

export const SampleSelector = ({ name = null }: { name: string | null }) => {
    const [samples, setSamples] = useState<SampleResult[]>([])
    const [selectedSample, setSelectedSample] = useState<SampleResult | null>(null);
    const [, , fetchConnections] = useConnectionList();
    const navigate = useNavigate();

    // Get samples from API
    useEffect(() => {
        const fetchSamples = async () => {
            try {
                const res = await api.getSamples()
                setSamples(res.data);
            } catch (exception) {
                if (isAxiosError(exception)) {
                    // Connection already exists, skip creation but don't close or clear modal
                    enqueueSnackbar({
                        variant: "error",
                        message: "Error fetching samples",
                    });
                    return;
                }
            }
        }
        fetchSamples()
    }, [])

    const handleButtonClick = async () => {
        if (selectedSample !== null) {
            try {
                if (name === null || name === "") {
                    name = selectedSample.title + " (Sample)"
                } else {
                    name = name + " (Sample)"
                }

                await api.createConnection(selectedSample.file, name, true)
                fetchConnections();
                enqueueSnackbar({
                    variant: "success",
                    message: "Sample connection created",
                });
                navigate(Routes.Root)
            } catch (exception) {
                if (isAxiosError(exception) && exception.response?.status === 409) {
                    // Connection already exists, skip creation but don't close or clear modal
                    enqueueSnackbar({
                        variant: "info",
                        message: "Connection already exists, skipping creation",
                    });
                    return;
                } else {
                    enqueueSnackbar({
                        variant: "error",
                        message: "Error creating connection",
                    });
                    return;
                }
            }
        } else {
            enqueueSnackbar('Please select a sample dataset.', { variant: 'info' })
        }
    }

    const handleRadioChange = (selection: string) => {
        const selectedValue = selection as string;
        const selectedSample = samples.find(sample => sample.file === selectedValue);
        setSelectedSample(selectedSample || null);
    }

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

            <Button className="cursor-pointer mt-4" onClick={handleButtonClick}>Create sample</Button>
        </Fieldset>
    )
};