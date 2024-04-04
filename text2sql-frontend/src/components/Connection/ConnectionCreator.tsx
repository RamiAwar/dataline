import { Description, Fieldset, Label, Legend } from '@catalyst/fieldset'
import { Radio, RadioField, RadioGroup } from '@catalyst/radio'
import { Text } from '@catalyst/text'
import { useEffect, useState } from 'react'
import {api} from "../../api"



const ConnectionCreator = () => {

  const [samples, setSamples] = useState<string[]>([])
  
  // Get samples from API
  useEffect(() => {
    const fetchSamples = async () => {
      try {
        const res = await api.getSamples()
        setSamples(res.data.map((sample) => sample.file));
      } catch (exception) {
        console.error(exception)
      }
    }
    fetchSamples()
  }, [])

  return (
    <Fieldset>
      <Legend>Resale and transfers</Legend>
      <Text>Decide if people buy tickets from you or from scalpers.</Text>
      <RadioGroup name="resale" defaultValue="permit">
        <RadioField>
          <Radio value="permit" />
          <Label>Allow tickets to be resold</Label>
          <Description>Customers can resell or transfer their tickets if they can’t make it to the event.</Description>
        </RadioField>
        <RadioField>
          <Radio value="forbid" />
          <Label>Don’t allow tickets to be resold</Label>
          <Description>Tickets cannot be resold or transferred to another person.</Description>
        </RadioField>
      </RadioGroup>
    </Fieldset>
  )
}

export default ConnectionCreator;