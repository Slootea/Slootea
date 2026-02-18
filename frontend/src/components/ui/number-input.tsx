"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> {
  value: number | undefined | null;
  onChange: (value: number) => void;
  defaultValue?: number;
}

/**
 * A controlled number input component that handles edge cases better than
 * native number inputs with parseInt on change.
 * 
 * Features:
 * - Allows clearing the field without immediately resetting to default
 * - Applies default value on blur when field is empty
 * - Properly handles user typing without forcing intermediate values
 */
const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ className, value, onChange, defaultValue = 0, min, max, ...props }, ref) => {
    // Internal string state for controlled input behavior
    const [internalValue, setInternalValue] = React.useState<string>(
      value !== undefined && value !== null ? String(value) : ""
    );

    // Sync internal value when external value changes (e.g., form reset)
    React.useEffect(() => {
      const newVal = value !== undefined && value !== null ? String(value) : "";
      // Only update if the values are actually different (to avoid cursor jumping)
      if (newVal !== internalValue && parseFloat(internalValue) !== value) {
        setInternalValue(newVal);
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      // Allow empty string (user is clearing)
      if (inputValue === "") {
        setInternalValue("");
        return;
      }

      // Allow only valid number characters (digits, minus for negative, decimal point)
      if (!/^-?\d*\.?\d*$/.test(inputValue)) {
        return;
      }

      setInternalValue(inputValue);

      // Parse and validate the number
      const numValue = parseFloat(inputValue);
      if (!isNaN(numValue)) {
        // Apply min/max constraints
        let constrainedValue = numValue;
        if (min !== undefined && numValue < Number(min)) {
          constrainedValue = Number(min);
        }
        if (max !== undefined && numValue > Number(max)) {
          constrainedValue = Number(max);
        }
        onChange(constrainedValue);
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // On blur, if the field is empty or invalid, apply the default value
      if (internalValue === "" || isNaN(parseFloat(internalValue))) {
        const finalValue = defaultValue;
        setInternalValue(String(finalValue));
        onChange(finalValue);
      } else {
        // Ensure constraints are applied on blur
        const numValue = parseFloat(internalValue);
        let constrainedValue = numValue;
        if (min !== undefined && numValue < Number(min)) {
          constrainedValue = Number(min);
        }
        if (max !== undefined && numValue > Number(max)) {
          constrainedValue = Number(max);
        }
        if (constrainedValue !== numValue) {
          setInternalValue(String(constrainedValue));
          onChange(constrainedValue);
        }
      }

      // Call original onBlur if provided
      props.onBlur?.(e);
    };

    return (
      <input
        type="text"
        inputMode="numeric"
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        value={internalValue}
        onChange={handleChange}
        onBlur={handleBlur}
        {...props}
      />
    );
  }
);

NumberInput.displayName = "NumberInput";

export { NumberInput };
