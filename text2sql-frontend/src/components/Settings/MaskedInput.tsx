import { useRef, useEffect, useState } from 'react';
import { Input } from '@catalyst/input';

interface MaskedInputProps {
    value?: string;
    onChange?: (value: string) => void;
}

export default function MaskedInput({ value, onChange }: MaskedInputProps) {
    const passwordInputRef = useRef<HTMLInputElement | null>(null);
    const originalPasswordRef = useRef<HTMLInputElement | null>(null);
    const [maskedValue, setMaskedValue] = useState<string>('');

    const maskPassword = () => {
        const passwordValue = passwordInputRef.current?.value ?? '';
        const maskedPassword = passwordValue.slice(0, 6) + '*'.repeat(Math.max(0, passwordValue.length - 5));
        passwordInputRef.current!.value = maskedPassword;
        originalPasswordRef.current!.value = passwordValue;
        setMaskedValue(maskedPassword);
        if (onChange) {
            onChange(passwordValue);
        }
    };

    useEffect(() => {
        if (value) {
            passwordInputRef.current!.value = value;
            maskPassword();
        }
    }, [value]);

    return (
        <div>
            <input type="hidden" ref={originalPasswordRef} />
            <Input type="text" ref={passwordInputRef} onInput={maskPassword} defaultValue={value} className="font-mono" />
        </div>
    );
}
