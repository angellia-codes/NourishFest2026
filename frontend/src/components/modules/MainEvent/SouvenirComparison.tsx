import { EntityCrudTable, type FieldConfig } from '@/components/shared/EntityCrudTable';
import { EventRequiredNotice } from '@/components/shared/EventRequiredNotice';
import { useSelectedEvent } from '@/context/SelectedEventContext';
import type { SouvenirComparison } from '@/types';

const FIELDS: FieldConfig<SouvenirComparison>[] = [
  { key: 'ItemName', label: 'Item Name', type: 'text' },
  { key: 'VendorName', label: 'Vendor Name', type: 'text' },
  { key: 'ContactName', label: 'Contact Name', type: 'text' },
  { key: 'ContactPhone', label: 'Contact Phone', type: 'text' },
  { key: 'Quantity', label: 'Quantity', type: 'number' },
  { key: 'Unit', label: 'Unit', type: 'text' },
  { key: 'Price', label: 'Price (IDR)', type: 'number' },
  {
    key: 'TotalEstimationCost',
    label: 'Total Estimation Cost',
    type: 'number',
    computed: (f) => (Number(f.Quantity) || 0) * (Number(f.Price) || 0),
  },
  { key: 'EstimationCost', label: 'Estimated Cost', type: 'number' },
  { key: 'DesignImageLink', label: 'Design Image', type: 'file' },
  { key: 'BenefitsInclude', label: 'Benefits Included', type: 'textarea', hideInTable: true },
  { key: 'BenefitsExclude', label: 'Benefits Excluded', type: 'textarea', hideInTable: true },
  { key: 'ApprovalStatus', label: 'Approval', type: 'select', options: ['Pending', 'Approved', 'Rejected'] },
];

export function SouvenirComparisonScreen() {
  const { mainEventId } = useSelectedEvent();
  if (!mainEventId) return <EventRequiredNotice label="the Main Event" />;
  return (
    <EntityCrudTable<SouvenirComparison>
      entity="SouvenirComparison"
      title="Merchandise"
      fields={FIELDS}
      eventId={mainEventId}
      addLabel="Add Merchandise"
    />
  );
}
