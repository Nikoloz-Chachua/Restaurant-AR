import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createClient } from '@/lib/supabase/server'

function missingR2Env() {
  return ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL']
    .filter(key => !process.env[key])
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const missing = missingR2Env()
  if (missing.length) {
    return NextResponse.json({ error: `R2 upload is not configured. Missing env vars: ${missing.join(', ')}` }, { status: 500 })
  }

  const { filename, restaurantId, restaurantSlug } = await req.json()
  const lower = String(filename || '').toLowerCase()
  const isGlb  = lower.endsWith('.glb')
  const isUsdz = lower.endsWith('.usdz')
  const isWebp = lower.endsWith('.webp')
  if (!filename || (!isGlb && !isUsdz && !isWebp)) {
    return NextResponse.json({ error: 'Only .glb, .usdz, or .webp files allowed' }, { status: 400 })
  }

  // Content-Type must match what the browser sends on the PUT, or R2 rejects the
  // presigned request. .usdz is Apple Quick Look's format (a zipped USD bundle).
  const contentType = isUsdz ? 'model/vnd.usdz+zip' : isWebp ? 'image/webp' : 'model/gltf-binary'

  const restaurantIdNumber = Number(restaurantId)
  if (!Number.isInteger(restaurantIdNumber)) {
    return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 })
  }
  const requestedSlug = String(restaurantSlug || '').trim().toLowerCase()
  if (!requestedSlug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(requestedSlug)) {
    return NextResponse.json({ error: 'restaurantSlug is required' }, { status: 400 })
  }

  const { data: canManage, error: accessError } = await supabase.rpc('can_manage_restaurant', {
    target_restaurant_id: restaurantIdNumber,
  })
  if (accessError || !canManage) {
    return NextResponse.json({ error: 'Restaurant not found or not allowed' }, { status: 403 })
  }

  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .select('id, slug')
    .eq('id', restaurantIdNumber)
    .maybeSingle()

  if (restaurantError || !restaurant) {
    return NextResponse.json({ error: 'Restaurant not found or not allowed' }, { status: 403 })
  }
  if (restaurant.slug !== requestedSlug) {
    return NextResponse.json({ error: 'Restaurant id/slug mismatch' }, { status: 403 })
  }

  const cleanName = String(filename).replace(/[^a-zA-Z0-9._-]/g, '_')
  const key = `${restaurant.slug}/${Date.now()}_${cleanName}`
  const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: true,
  })

  const uploadUrl = await getSignedUrl(
    r2,
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 300 },
  )

  return NextResponse.json({
    uploadUrl,
    publicUrl: `${process.env.R2_PUBLIC_URL}/${key}`,
  })
}
