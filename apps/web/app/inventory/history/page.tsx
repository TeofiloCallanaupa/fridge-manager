import { RemovalHistoryPage } from '@/components/inventory/removal-history-page'

export const metadata = {
  title: 'Removal History | Fridge Manager',
  description: 'View your household food removal history by month — track consumed, wasted, and expired items.',
}

export default function HistoryPage() {
  return <RemovalHistoryPage />
}
