import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * Offline mutation queue — persists pending mutations to AsyncStorage.
 *
 * When the app is offline and a mutation fires, it succeeds optimistically
 * in the UI. If the network call fails, the mutation is queued here.
 * On next app launch (or when connectivity returns), queued mutations
 * are replayed.
 *
 * This ensures check-offs in the supermarket survive app kills.
 */

const QUEUE_KEY = '@fridge-manager/mutation-queue'

export type QueuedMutation = {
  id: string
  type: 'check-off' | 'add' | 'delete'
  payload: Record<string, any>
  createdAt: string
}

export async function getQueuedMutations(): Promise<QueuedMutation[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export async function addToQueue(mutation: QueuedMutation): Promise<void> {
  const queue = await getQueuedMutations()
  queue.push(mutation)
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

export async function removeFromQueue(id: string): Promise<void> {
  const queue = await getQueuedMutations()
  const filtered = queue.filter((m) => m.id !== id)
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered))
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY)
}
