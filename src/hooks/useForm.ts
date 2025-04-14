import { useState } from 'react';

interface FormErrors {
  [key: string]: string;
}

export function useForm<T extends Record<string, any>>(initialValues: T) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setValues(prev => ({
      ...prev,
      [name]: type === 'number' ? (value ? Number(value) : '') : value
    }));
    
    if (touched[name]) {
      validateField(name, value);
    }
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
    
    validateField(name, value);
  };

  const validateField = (name: string, value: any) => {
    let error = '';
    
    // Basic validation
    if (values.required?.includes(name) && !value) {
      error = 'This field is required';
    } else if (name === 'email' && value && !/\S+@\S+\.\S+/.test(value)) {
      error = 'Please enter a valid email address';
    } else if (name === 'phone' && value && !/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/.test(value)) {
      error = 'Please enter a valid phone number';
    } else if (name === 'website' && value && !/^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/.test(value)) {
      error = 'Please enter a valid website URL';
    }
    
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
    
    return error === '';
  };

  const validateForm = () => {
    const newErrors: FormErrors = {};
    let isValid = true;
    
    Object.entries(values).forEach(([key, value]) => {
      // Skip validation for keys that don't need it
      if (key === 'required') return;
      
      const error = validateField(key, value);
      if (!error) {
        newErrors[key] = error;
        isValid = false;
      }
    });
    
    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = (onSubmit: (values: T) => void) => {
    return (e: React.FormEvent) => {
      e.preventDefault();
      
      if (validateForm()) {
        onSubmit(values);
      }
    };
  };

  const setValue = (name: keyof T, value: any) => {
    setValues(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const reset = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  };

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    setValue,
    setValues,
    reset,
    validateForm
  };
}

export default useForm;