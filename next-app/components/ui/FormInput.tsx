'use client';

interface FormInputProps {
  label: string;
  id: string;
  type?: string;
  value: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  readOnly?: boolean;
}

export default function FormInput({ label, id, type = 'text', value, onChange, placeholder, readOnly = false }: FormInputProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-foreground/80 mb-2">{label}</label>
      <input
        type={type}
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`w-full p-3 rounded-md bg-secondary border border-accent focus:outline-none focus:ring-2 focus:ring-primary ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
        required={!readOnly}
      />
    </div>
  );
}