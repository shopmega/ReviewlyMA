import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../form';
import { Input } from '../input';

type FormValues = { email: string };

function TestForm() {
  const form = useForm<FormValues>({
    defaultValues: { email: '' },
  });

  return (
    <Form {...form}>
      <form>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage>Helper text</FormMessage>
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

describe('Form Components', () => {
  it('renders label and input', () => {
    render(<TestForm />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders message content', () => {
    render(<TestForm />);
    expect(screen.getByText('Helper text')).toBeInTheDocument();
  });
});
