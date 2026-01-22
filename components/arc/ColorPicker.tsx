"use client";

type ColorPickerProps = {
  name: string;
  defaultValue?: string;
};

export function ColorPicker({ name, defaultValue = "#3b82f6" }: ColorPickerProps) {
  return (
    <div className="mt-1 flex gap-3">
      <input
        name={name}
        type="color"
        className="h-10 w-16 rounded-md border bg-background cursor-pointer"
        defaultValue={defaultValue}
        onInput={(e) => {
          const colorInput = e.target as HTMLInputElement;
          const hexInput = colorInput.form?.querySelector(
            `input[name="${name}Hex"]`
          ) as HTMLInputElement;
          if (hexInput) {
            hexInput.value = colorInput.value;
          }
        }}
      />
      <input
        type="text"
        name={`${name}Hex`}
        placeholder={defaultValue}
        defaultValue={defaultValue}
        className="flex-1 rounded-md border bg-background px-3 py-2 text-sm font-mono"
        onInput={(e) => {
          const hexInput = e.target as HTMLInputElement;
          const colorInput = hexInput.form?.querySelector(
            `input[type="color"][name="${name}"]`
          ) as HTMLInputElement;
          if (colorInput && hexInput.value.match(/^#[0-9A-Fa-f]{6}$/)) {
            colorInput.value = hexInput.value;
          }
        }}
      />
    </div>
  );
}
