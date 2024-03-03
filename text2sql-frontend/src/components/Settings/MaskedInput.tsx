import { useRef, useEffect } from 'react';
import { Input } from '@catalyst/input';

interface MaskedInputProps {
    defaultValue?: string;
}

export default function MaskedInput({ defaultValue }: MaskedInputProps) {
    const passwordInputRef = useRef<HTMLInputElement | null>(null);
    const originalPasswordRef = useRef<HTMLInputElement | null>(null);

    const maskPassword = () => {
        const passwordValue = passwordInputRef.current?.value ?? '';
        const maskedPassword = passwordValue.slice(0, 6) + '*'.repeat(Math.max(0, passwordValue.length - 5));
        passwordInputRef.current!.value = maskedPassword;
        originalPasswordRef.current!.value = passwordValue;
    };

    useEffect(() => {
        if (defaultValue) {
            maskPassword();
        }
    }, [defaultValue]);

    return (
        <div>
            <input type="hidden" ref={originalPasswordRef} />
            <Input type="text" ref={passwordInputRef} onInput={maskPassword} defaultValue={defaultValue} className="font-mono" />
        </div>
    );
}
