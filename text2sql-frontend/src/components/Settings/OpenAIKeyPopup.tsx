import { Alert, AlertActions, AlertBody, AlertDescription, AlertTitle } from '@components/Catalyst/alert'
import { Button } from "@components/Catalyst/button"
import { Input } from '@components/Catalyst/input'
import { useState } from 'react'

export function OpenAIKeyPopup() {
  let [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button type="button" onClick={() => setIsOpen(true)}>
        Edit OpenAI api key
      </Button>
      <Alert open={isOpen} onClose={setIsOpen} size="sm">
        <AlertTitle>Configure OpenAI</AlertTitle>
        <AlertDescription>To continue, please enter your OpenAI api key.</AlertDescription>
        <AlertBody>
          <Input autoFocus name="password" type="password" aria-label="Password" placeholder="•••••••" />
        </AlertBody>
        <AlertActions>
          <Button plain onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => setIsOpen(false)}>Continue</Button>
        </AlertActions>
      </Alert>
    </>
  )
}