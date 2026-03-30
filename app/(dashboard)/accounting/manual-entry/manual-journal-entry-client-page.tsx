'use client';

import { useState, useTransition } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { createManualJournalEntry } from './actions';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';

const monetaryAmountSchema = z.number().min(0, { message: 'Amount cannot be negative.' });

const journalLineSchema = z.object({
  accountId: z.string().min(1, { message: 'Account is required.' }),
  debit: monetaryAmountSchema,
  credit: monetaryAmountSchema,
  description: z.string().optional(),
}).refine(
  (data) => {
    // Can't have both a debit and a credit
    if (data.debit > 0 && data.credit > 0) {
      return false;
    }
    return true;
  },
  {
    message: 'Enter either a debit or a credit, not both.',
    path: ['credit'], // Show error on the credit field
  }
);

const formSchema = z.object({
  date: z.date(),
  description: z.string().min(1, { message: 'Description is required.' }),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  lines: z.array(journalLineSchema).min(2, { message: 'At least two journal lines are required.' }),
}).refine(
  (data) => {
    const totalDebit = data.lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = data.lines.reduce((sum, line) => sum + line.credit, 0);
    return Math.abs(totalDebit - totalCredit) < 0.01; // Allow for floating point inaccuracies
  },
  {
    message: 'Total Debits must equal Total Credits.',
    path: ['lines'], // Associate error with the 'lines' field
  }
);

type Account = {
  id: string;
  code: string;
  name: string;
  type: string;
  subtype?: string | null;
};

interface ManualJournalEntryClientPageProps {
  accounts: Account[];
}



export function ManualJournalEntryClientPage({ accounts }: ManualJournalEntryClientPageProps) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      description: '',
      referenceType: '',
      referenceId: '',
      lines: [{ accountId: '', debit: 0, credit: 0, description: '' }, { accountId: '', debit: 0, credit: 0, description: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lines',
  });

  const [journalEntryId, setJournalEntryId] = useState<string | null>(null);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    startTransition(async () => {
      const result = await createManualJournalEntry({
        ...values,
        date: values.date.toISOString(),
        lines: values.lines.map(line => ({ ...line, accountId: line.accountId })),
      });

      if (result.success && result.entryId) {
        toast.success(result.message);
        setJournalEntryId(result.entryId);
        form.reset({
          date: new Date(),
          description: '',
          lines: [{ accountId: '', debit: 0, credit: 0, description: '' }, { accountId: '', debit: 0, credit: 0, description: '' }],
        });
      } else {
        toast.error(result.message || 'An unknown error occurred.');
      }
    });
  };

  const handleDownloadPDF = () => {
    if (journalEntryId) {
      window.open(`/api/accounting/journal-voucher/${journalEntryId}`, '_blank');
    } else {
      toast.error('Please create a journal entry first.');
    }
  };

  const totalDebit = form.watch('lines').reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
  const totalCredit = form.watch('lines').reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
  const balance = totalDebit - totalCredit;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Entry Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={'outline'}
                      className={cn(
                        'w-[240px] pl-3 text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      {field.value ? (
                        format(field.value, 'PPP')
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date > new Date() || date < new Date('1900-01-01')
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormDescription>
                The date of the journal entry.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Enter a brief description for this journal entry" {...field} />
              </FormControl>
              <FormDescription>
                A clear description of the transaction.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="referenceType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reference Type (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., INVOICE, CUSTOMER, EXPENSE" {...field} />
                </FormControl>
                <FormDescription>
                  Type of the document or entity this entry refers to.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="referenceId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reference ID (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Invoice #123, Customer ID" {...field} />
                </FormControl>
                <FormDescription>
                  ID of the document or entity.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <h3 className="text-lg font-semibold">Journal Lines</h3>
        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="flex flex-col md:flex-row gap-2 md:gap-4 items-end">
              <FormField
                control={form.control}
                name={`lines.${index}.accountId`}
                render={({ field: accountField }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Account</FormLabel>
                    <Select onValueChange={accountField.onChange} defaultValue={accountField.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.code} - {account.name} ({account.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`lines.${index}.debit`}
                render={({ field }) => (
                  <FormItem className="w-full md:w-1/5">
                    <FormLabel>Debit</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} onChange={e => {
                        const value = e.target.valueAsNumber || 0;
                        field.onChange(value);
                        if (value > 0) {
                          form.setValue(`lines.${index}.credit`, 0);
                        }
                      }} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`lines.${index}.credit`}
                render={({ field }) => (
                  <FormItem className="w-full md:w-1/5">
                    <FormLabel>Credit</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} onChange={e => {
                        const value = e.target.valueAsNumber || 0;
                        field.onChange(value);
                        if (value > 0) {
                          form.setValue(`lines.${index}.debit`, 0);
                        }
                      }} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`lines.${index}.description`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Line Description (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => remove(index)}
                disabled={fields.length <= 2}
                className="mt-8 md:mt-0"
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ accountId: '', debit: 0, credit: 0, description: '' })}
            className="mt-4"
          >
            Add Line
          </Button>
        </div>

        <div className="flex justify-between items-center font-bold text-lg mt-4 border-t pt-4">
          <span>Total Debit: {totalDebit.toFixed(2)}</span>
          <span>Total Credit: {totalCredit.toFixed(2)}</span>
          <span className={cn(Math.abs(balance) < 0.01 ? 'text-green-600' : 'text-red-600')}>
            Balance: {balance.toFixed(2)}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <Button type="submit" disabled={isPending || Math.abs(balance) > 0.01}>
            {isPending ? 'Submitting...' : 'Create Journal Entry'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleDownloadPDF}
            disabled={!journalEntryId}
          >
            Download PDF
          </Button>
        </div>
      </form>
    </Form>
  );
}
