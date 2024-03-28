import { useRef, useEffect, useCallback } from "react";
import { Input } from "@catalyst/input";

interface MaskedInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onKeyUp?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  autoFocus?: boolean;
}

export default function MaskedInput({
  value,
  onChange,
  onKeyUp,
  autoFocus = true,
}: MaskedInputProps) {
  const passwordInputRef = useRef<HTMLInputElement | null>(null);
  const originalPasswordRef = useRef<HTMLInputElement | null>(null);

  const maskPassword = useCallback(() => {
    const passwordValue = passwordInputRef.current?.value ?? "";
    const maskedPassword =
      passwordValue.slice(0, 6) +
      "*".repeat(Math.max(0, passwordValue.length - 5));
    passwordInputRef.current!.value = maskedPassword;
    originalPasswordRef.current!.value = passwordValue;
    if (onChange) {
      onChange(passwordValue);
    }
  }, [onChange]);

  useEffect(() => {
    if (value) {
      passwordInputRef.current!.value = value;
      maskPassword();
    }
  }, [value, maskPassword]);

  return (
    <div>
      <input type="hidden" ref={originalPasswordRef} />
      <Input
        type="text"
        autoFocus={autoFocus}
        ref={passwordInputRef}
        onInput={maskPassword}
        onKeyUp={onKeyUp}
        defaultValue={value}
        className="font-mono"
      />
    </div>
  );
}
