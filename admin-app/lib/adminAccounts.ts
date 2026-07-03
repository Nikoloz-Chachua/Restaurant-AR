import { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>

export const TEMP_PASSWORD_TABLE = 'admin_initial_passwords'

export type StoredInitialPassword = {
  userId: string
  email: string
  initialPassword: string
}

export function cleanEmail(value: unknown) {
  return String(value ?? '').trim().toLowerCase()
}

export function isPlatformRole(role: unknown) {
  return ['super_admin', 'creator', 'dev'].includes(String(role))
}

export async function findAuthUserByEmail(service: AdminClient, email: string) {
  const { data, error } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) return { user: null, error }
  return {
    user: data.users.find(existing => existing.email?.toLowerCase() === email) ?? null,
    error: null,
  }
}

export async function ensureAdminAuthUser(
  service: AdminClient,
  email: string,
  password: string,
) {
  const { data: createdUser, error: createUserError } = password
    ? await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: { role: 'brand_owner' },
        user_metadata: {},
      })
    : { data: { user: null }, error: null }

  const duplicateUser = createUserError?.message?.toLowerCase().includes('already')
  if (createUserError && !duplicateUser) return { userId: '', error: createUserError }

  let user = createdUser.user
  if (!user) {
    const found = await findAuthUserByEmail(service, email)
    if (found.error) return { userId: '', error: found.error }
    user = found.user
  }

  if (!user) {
    return { userId: '', error: new Error('Auth user does not exist; provide a password to create it') }
  }

  const nextRole = isPlatformRole(user.app_metadata?.role) ? user.app_metadata?.role : 'brand_owner'
  const { error: metadataError } = await service.auth.admin.updateUserById(user.id, {
    app_metadata: { role: nextRole },
    user_metadata: user.user_metadata ?? {},
    ...(password ? { password } : {}),
  })
  if (metadataError) return { userId: '', error: metadataError }

  return { userId: user.id, error: null }
}

export async function fetchStoredInitialPasswords(service: AdminClient, userIds: string[]) {
  if (userIds.length === 0) return new Map<string, StoredInitialPassword>()
  const { data, error } = await service
    .from(TEMP_PASSWORD_TABLE)
    .select('user_id, email, initial_password')
    .in('user_id', Array.from(new Set(userIds)))

  if (error) return new Map<string, StoredInitialPassword>()

  return new Map(
    (data ?? []).map(row => [
      String(row.user_id),
      {
        userId: String(row.user_id),
        email: String(row.email ?? ''),
        initialPassword: String(row.initial_password ?? ''),
      },
    ]),
  )
}

export async function storeInitialPassword(
  service: AdminClient,
  input: { userId: string; email: string; password: string; createdBy: string },
) {
  if (!input.password) return null
  const { error } = await service
    .from(TEMP_PASSWORD_TABLE)
    .upsert(
      {
        user_id: input.userId,
        email: input.email,
        initial_password: input.password,
        created_by: input.createdBy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
  return error
}
