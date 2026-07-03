import test from 'node:test'
import assert from 'node:assert/strict'
import { planCategoryOrder } from './categoryOrdering.js'

const breakfast = { id: 1, sort_order: 1 }
const salads = { id: 2, sort_order: 2 }
const mains = { id: 3, sort_order: 3 }
const desserts = { id: 4, sort_order: 4 }

test('inserts a category at the requested position and shifts following categories down', () => {
  assert.deepEqual(
    planCategoryOrder([breakfast, salads, mains], { id: 9, sort_order: 99 }, 1),
    [
      { id: 9, sort_order: 1 },
      { id: 1, sort_order: 2 },
      { id: 2, sort_order: 3 },
      { id: 3, sort_order: 4 },
    ],
  )
})

test('moves an existing category up and preserves untouched relative order', () => {
  assert.deepEqual(
    planCategoryOrder([breakfast, salads, mains, desserts], desserts, 2),
    [
      { id: 1, sort_order: 1 },
      { id: 4, sort_order: 2 },
      { id: 2, sort_order: 3 },
      { id: 3, sort_order: 4 },
    ],
  )
})

test('moves an existing category down and normalizes gaps deterministically', () => {
  assert.deepEqual(
    planCategoryOrder(
      [
        { id: 1, sort_order: 10 },
        { id: 2, sort_order: 20 },
        { id: 3, sort_order: 30 },
      ],
      { id: 1, sort_order: 10 },
      3,
    ),
    [
      { id: 2, sort_order: 1 },
      { id: 3, sort_order: 2 },
      { id: 1, sort_order: 3 },
    ],
  )
})
