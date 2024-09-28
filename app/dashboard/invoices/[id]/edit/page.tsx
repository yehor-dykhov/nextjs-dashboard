import Breadcrumbs from '@/app/ui/invoices/breadcrumbs';
import { fetchCustomers, fetchInvoiceById } from '@/app/lib/data';
import EditInvoiceForm from '@/app/ui/invoices/edit-form';
import { notFound } from 'next/navigation'

export default async function Page({ params }: { params: { id: string } }) {
    const invoice = await fetchInvoiceById(params.id);
    const customers = await fetchCustomers();

    if (!invoice) {
        return notFound();
    }

    return (
        <main>
            <Breadcrumbs
                breadcrumbs={[
                    { label: 'Invoices', href: '/dashboard/invoices' },
                    {
                        label: 'Create Invoice',
                        href: `/dashboard/invoices/${params.id}/edit`,
                        active: true,
                    },
                ]}
            />
            <EditInvoiceForm invoice={invoice} customers={customers} />
        </main>
    );
}