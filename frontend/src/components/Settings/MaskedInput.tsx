import { useState } from "react";
import { Input } from "@catalyst/input";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

interface MaskedInputProps {
  value?: string;
  onChange: (value: string) => void;
  onKeyUp?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  autoFocus?: boolean;
}

export default function MaskedInput({
  value,
  onChange,
  onKeyUp,
  autoFocus = true,
}: MaskedInputProps) {
  const [isMasked, setIsMasked] = useState(true);

  const Icon = isMasked ? EyeSlashIcon : EyeIcon;
  return (
    <div className="flex items-center gap-1 sm:gap-3">
      <Input
        type={isMasked ? "password" : "text"}
        autoFocus={autoFocus}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        onKeyUp={(e) => {
          if (onKeyUp) onKeyUp(e);
        }}
        value={value}
        className="font-mono"
      />
      <div className="rounded-full hover:bg-white hover:bg-opacity-10 p-1">
        <Icon
          className="h-6 w-6 text-white opacity-25 cursor-pointer"
          onClick={() => setIsMasked((prev) => !prev)}
        />
      </div>
    </div>
  );
}
