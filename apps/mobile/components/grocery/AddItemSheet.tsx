import React, { useState, useCallback } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import {
  Modal,
  Portal,
  Text,
  TextInput,
  Button,
  Chip,
  SegmentedButtons,
  IconButton,
  useTheme,
} from 'react-native-paper'
import type { CategoryData } from '../../hooks/use-categories'

type Props = {
  visible: boolean
  onDismiss: () => void
  onSubmit: (data: {
    name: string
    quantity: string | null
    category_id: string
    destination: 'fridge' | 'freezer' | 'pantry' | 'none'
  }) => void
  categories: CategoryData[]
  isLoading?: boolean
}

export function AddItemSheet({
  visible,
  onDismiss,
  onSubmit,
  categories,
  isLoading,
}: Props) {
  const theme = useTheme()
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [destination, setDestination] = useState<string>('fridge')

  const selectedCategory = categories.find((c) => c.id === categoryId)

  const handleSubmit = useCallback(() => {
    if (!name.trim() || !categoryId) return

    onSubmit({
      name: name.trim(),
      quantity: quantity.trim() || null,
      category_id: categoryId,
      destination: destination as 'fridge' | 'freezer' | 'pantry' | 'none',
    })

    // Reset form
    setName('')
    setQuantity('')
    setCategoryId(null)
    setDestination('fridge')
  }, [name, quantity, categoryId, destination, onSubmit])

  const handleCategorySelect = useCallback(
    (catId: string) => {
      setCategoryId(catId)
      // Auto-set destination based on category default
      const cat = categories.find((c) => c.id === catId)
      if (cat?.default_destination) {
        setDestination(cat.default_destination)
      }
    },
    [categories]
  )

  if (!visible) return null

  const isValid = name.trim().length > 0 && categoryId !== null

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.modal,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.header}>
            <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>
              Add Item
            </Text>
            <IconButton
              icon="close"
              onPress={onDismiss}
              accessibilityLabel="Close"
            />
          </View>

          {/* Name input */}
          <TextInput
            label="Item name"
            placeholder="Item name"
            value={name}
            onChangeText={setName}
            maxLength={200}
            mode="outlined"
            style={styles.input}
            autoFocus
          />

          {/* Quantity input */}
          <TextInput
            label="Quantity (optional)"
            placeholder="e.g. 2 lbs, 1 gallon"
            value={quantity}
            onChangeText={setQuantity}
            maxLength={50}
            mode="outlined"
            style={styles.input}
          />

          {/* Category picker */}
          <Text
            variant="labelLarge"
            style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}
          >
            Category
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {categories.map((cat) => (
              <Chip
                key={cat.id}
                selected={categoryId === cat.id}
                onPress={() => handleCategorySelect(cat.id)}
                style={styles.categoryChip}
                showSelectedCheck={false}
                mode={categoryId === cat.id ? 'flat' : 'outlined'}
              >
                {cat.emoji} {cat.name}
              </Chip>
            ))}
          </ScrollView>

          {/* Destination picker */}
          <Text
            variant="labelLarge"
            style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}
          >
            Store in
          </Text>
          <SegmentedButtons
            value={destination}
            onValueChange={setDestination}
            buttons={[
              { value: 'fridge', label: 'Fridge', icon: 'fridge-outline' },
              { value: 'freezer', label: 'Freezer', icon: 'snowflake' },
              { value: 'pantry', label: 'Pantry', icon: 'cupboard' },
              { value: 'none', label: 'None' },
            ]}
            style={styles.segmented}
          />

          {/* Submit button */}
          <Button
            mode="contained"
            onPress={handleSubmit}
            disabled={!isValid || isLoading}
            loading={isLoading}
            style={styles.submitButton}
          >
            Add to List
          </Button>
        </KeyboardAvoidingView>
      </Modal>
    </Portal>
  )
}

const styles = StyleSheet.create({
  modal: {
    margin: 16,
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  sectionLabel: {
    marginBottom: 8,
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 12,
  },
  categoryChip: {
    marginRight: 0,
  },
  segmented: {
    marginBottom: 16,
  },
  submitButton: {
    marginTop: 8,
  },
})
