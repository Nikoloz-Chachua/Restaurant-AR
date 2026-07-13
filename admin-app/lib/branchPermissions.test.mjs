import test from 'node:test'
import assert from 'node:assert/strict'
import {
  canCreateBranchesForRole,
  hasBranchCreationEntitlement,
} from './branchPermissions.js'

test('branch creation entitlement is explicit and defaults denied', () => {
  assert.equal(hasBranchCreationEntitlement(true), true)
  assert.equal(hasBranchCreationEntitlement(false), false)
  assert.equal(hasBranchCreationEntitlement(null), false)
  assert.equal(hasBranchCreationEntitlement(undefined), false)
  assert.equal(hasBranchCreationEntitlement('true'), false)
})

test('super admins bypass tenant entitlement while tenant users require it', () => {
  assert.equal(canCreateBranchesForRole('super_admin', false), true)
  assert.equal(canCreateBranchesForRole('brand_owner', true), true)
  assert.equal(canCreateBranchesForRole('brand_owner', false), false)
  assert.equal(canCreateBranchesForRole('branch_manager', true), false)
  assert.equal(canCreateBranchesForRole('branch_staff', true), false)
})
