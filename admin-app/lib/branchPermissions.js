export function hasBranchCreationEntitlement(value) {
  return value === true
}

export function canCreateBranchesForRole(role, entitlement) {
  if (role === 'super_admin') return true
  return role === 'brand_owner' && hasBranchCreationEntitlement(entitlement)
}
