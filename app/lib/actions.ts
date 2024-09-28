'use server';

import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { signIn } from '../auth';
import { AuthError } from 'next-auth';

export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    try {
        const success = await signIn("credentials", formData);
        console.log("==> ERROR!", { prevState, success });
    } catch (error) {
        console.log('==>error', error);
        if (error instanceof AuthError) {
            switch (error?.type) {
                case "CredentialsSignin":
                    return "Invalid credentials.";
                case "CallbackRouteError":
                    return error?.cause?.err?.toString();
                default:
                    return "Something went wrong.";
            }
        }
        throw error;
    }
}

const FromSchema = z.object({
    id: z.string(),
    customerId: z.string({
        invalid_type_error: 'Please select a customer',
    }),
    amount: z.coerce.number()
        .gt(0, { message: 'Please enter an amount greater than $0.' }),
    status: z.enum(['pending', 'paid'], {
        invalid_type_error: 'Please select a valid status',
    }),
    date: z.string(),
});

const CreateInvoice = FromSchema.omit({ id: true, date: true });
const UpdateInvoice = FromSchema.omit({ id: true, date: true });

export type State = {
    errors:
    {
        customerId?: string[];
        amount?: string[];
        status?: string[];
    };
    message?: string | null;
}

export const createInvoice = async (prevState: State, formData: FormData) => {
    const validatedFields = CreateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Create Invoice.',
        };
    }

    const { customerId, amount, status } = validatedFields.data;
    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];

    try {
        await sql`
            INSERT INTO invoices (customer_id, amount, status, date)
            VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
        `;
    } catch {
        throw Error('Database Error: creating invoice');
    }

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

export const updateInvoiceById = async (prevState: State, id: string, formData: FormData) => {
    const validatedFields = UpdateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Update Invoice.',
        };
    }

    const { customerId, amount, status } = validatedFields.data;
    const amountInCents = Math.round(amount * 100);

    try {
        await sql`
            UPDATE invoices
            SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
            WHERE id = ${id}
        `;
    } catch {
        throw Error('Database Error: updating invoice');
    }

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

export const deleteInvoiceById = async (id: string) => {
    try {
        await sql`
            DELETE FROM invoices
            WHERE id = ${id}
        `;
    } catch {
        throw Error('Error deleting invoice');
    }

    revalidatePath('/dashboard/invoices');
}