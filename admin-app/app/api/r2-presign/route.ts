import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createClient } from '@/lib/supabase/server'

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { filename } = await req.json()
  const lower = String(filename || '').toLowerCase()
  const isGlb  = lower.endsWith('.glb')
  const isUsdz = lower.endsWith('.usdz')
  if (!filename || (!isGlb && !isUsdz)) {
    return NextResponse.json({ error: 'Only .glb or .usdz files allowed' }, { status: 400 })
  }

  // Content-Type must match what the browser sends on the PUT, or R2 rejects the
  // presigned request. .usdz is Apple Quick Look's format (a zipped USD bundle).
  const contentType = isUsdz ? 'model/vnd.usdz+zip' : 'model/gltf-binary'

  const key = `${Date.now()}_${String(filename).replace(/[^a-zA-Z0-9._-]/g, '_')}`

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
