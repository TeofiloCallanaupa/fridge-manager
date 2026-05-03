import React, { useState, useCallback, useMemo } from 'react'
import { View, StyleSheet } from 'react-native'
import { Text, ActivityIndicator, Snackbar, Button, useTheme } from 'react-native-paper'
import { GroceryList } from '../../components/grocery/GroceryList'
import { GroceryFAB } from '../../components/grocery/GroceryFAB'
import { AddItemSheet } from '../../components/grocery/AddItemSheet'
import { OfflineBanner } from '../../components/OfflineBanner'
import {
  useGroceryItems,
  useAddGroceryItem,
  useToggleGroceryItem,
  useFinishShopping,
  useDeleteGroceryItem,
} from '../../hooks/use-grocery-items'
import { useCategories } from '../../hooks/use-categories'
import { useAuth } from '../../contexts/AuthContext'

export default function GroceryScreen() {
  const theme = useTheme()
  const { user, householdId } = useAuth()
  const [showAddSheet, setShowAddSheet] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const {
    data: items = [],
    isLoading,
    isRefetching,
    refetch,
    error: fetchError,
  } = useGroceryItems(householdId ?? undefined)

  const { data: categories = [] } = useCategories()
  const toggleMutation = useToggleGroceryItem()
  const finishMutation = useFinishShopping()
  const addMutation = useAddGroceryItem()
  const deleteMutation = useDeleteGroceryItem()

  // Debug: log any fetch errors
  if (fetchError) {
    console.error('[GroceryScreen] fetch error:', fetchError)
  }

  // Count checked items for the "Finish Shopping" button
  const checkedCount = useMemo(
    () => items.filter((i) => i.checked).length,
    [items]
  )

  const handleToggle = useCallback(
    (item: any) => {
      if (!user) return
      toggleMutation.mutate(
        { item, userId: user.id },
        {
          onError: (err) => {
            console.error('[GroceryScreen] toggle error:', err)
            setErrorMessage(`Toggle failed: ${err.message}`)
          },
        }
      )
    },
    [user, toggleMutation]
  )

  const handleDelete = useCallback(
    (itemId: string) => {
      if (!householdId) return
      deleteMutation.mutate(
        { itemId, householdId },
        {
          onError: (err) => {
            console.error('[GroceryScreen] delete error:', err)
            setErrorMessage(`Delete failed: ${err.message}`)
          },
        }
      )
    },
    [householdId, deleteMutation]
  )

  const handleAdd = useCallback(
    (data: {
      name: string
      quantity: string | null
      category_id: string
      destination: 'fridge' | 'freezer' | 'pantry' | 'none'
    }) => {
      if (!user || !householdId) {
        setErrorMessage('Not authenticated or no household')
        return
      }

      addMutation.mutate(
        {
          ...data,
          household_id: householdId,
          added_by: user.id,
        },
        {
          onSuccess: () => {
            setShowAddSheet(false)
          },
          onError: (err) => {
            console.error('[GroceryScreen] add error:', err)
            setErrorMessage(`Add failed: ${err.message}`)
          },
        }
      )
    },
    [user, householdId, addMutation]
  )

  const handleFinishShopping = useCallback(() => {
    if (!user || !householdId) return

    finishMutation.mutate(
      { householdId, userId: user.id },
      {
        onSuccess: (data) => {
          if (data.completedCount > 0) {
            setErrorMessage(null)
          }
        },
        onError: (err) => {
          console.error('[GroceryScreen] finish shopping error:', err)
          setErrorMessage(`Finish shopping failed: ${err.message}`)
        },
      }
    )
  }, [user, householdId, finishMutation])

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <OfflineBanner />

      {/* Header */}
      <View style={styles.header}>
        <Text variant="headlineMedium" style={{ fontWeight: 'bold' }}>
          Grocery List
        </Text>
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          {items.length} item{items.length !== 1 ? 's' : ''}
          {checkedCount > 0 ? ` · ${checkedCount} checked` : ''}
        </Text>
      </View>

      <GroceryList
        items={items}
        isLoading={isLoading}
        isRefetching={isRefetching}
        onRefresh={() => refetch()}
        onCheckOff={handleToggle}
        onDelete={handleDelete}
      />

      {/* Finish Shopping button — only appears when items are checked */}
      {checkedCount > 0 && (
        <View style={[styles.finishBar, { backgroundColor: theme.colors.surface }]}>
          <Button
            mode="contained"
            onPress={handleFinishShopping}
            loading={finishMutation.isPending}
            disabled={finishMutation.isPending}
            icon="cart-check"
            style={styles.finishButton}
            contentStyle={styles.finishButtonContent}
          >
            Finish Shopping ({checkedCount})
          </Button>
        </View>
      )}

      <GroceryFAB onPress={() => setShowAddSheet(true)} />

      <AddItemSheet
        visible={showAddSheet}
        onDismiss={() => setShowAddSheet(false)}
        onSubmit={handleAdd}
        categories={categories}
        isLoading={addMutation.isPending}
      />

      {/* Error snackbar */}
      <Snackbar
        visible={!!errorMessage}
        onDismiss={() => setErrorMessage(null)}
        duration={4000}
        action={{ label: 'Dismiss', onPress: () => setErrorMessage(null) }}
      >
        {errorMessage ?? ''}
      </Snackbar>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  finishBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  finishButton: {
    borderRadius: 12,
  },
  finishButtonContent: {
    paddingVertical: 4,
  },
})
