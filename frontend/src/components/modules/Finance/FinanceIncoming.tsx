import { EntityCrudTable, type FieldConfig } from '@/components/shared/EntityCrudTable';
import type { FinanceIncoming } from '@/types';

const FIELDS: FieldConfig<FinanceIncoming>[] = [
  { key: 'Type', label: 'Type', type: 'select', options: ['Cash', 'Non-Cash'] },
  { key: 'SupplierName', label: 'Supplier Name', type: 'text' },
  { key: 'SupplierCategory', label: 'Supplier Category', type: 'text' },
  { key: 'PaymentType', label: 'Payment Type', type: 'select', options: ['Bank Transfer', 'Cash', 'Cheque', 'Other'] },
  { key: 'NonCashItemName', label: 'Non-Cash Item', type: 'text' },
  { key: 'AmountIDR', label: 'Amount', type: 'number' },
  { key: 'DateReceived', label: 'Date Received', type: 'text' },
  { key: 'LetterFileLink', label: 'Letter', type: 'file' },
  { key: 'ReceiptFileLink', label: 'Receipt', type: 'file' },
  { key: 'Description', label: 'Description', type: 'textarea', hideInTable: true },
];

/** Org-wide — Finance_Incoming has no EventID, spans all events. */
export function FinanceIncomingScreen() {
  return (
    <EntityCrudTable<FinanceIncoming>
      entity="Finance_Incoming"
      title="Incoming"
      fields={FIELDS}
      addLabel="Add Incoming"
    />
  );
}
