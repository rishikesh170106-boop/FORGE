import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const category = ((formData.get('category') as string) || 'complaints').toLowerCase();

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only JPEG, PNG, WEBP, and GIF images are allowed.' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File size exceeds maximum limit of 10MB.' }, { status: 400 });
    }

    const safeCategory = ['complaints', 'resolutions', 'profiles'].includes(category) ? category : 'complaints';
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', safeCategory);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
    const uniqueName = `${safeCategory}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
    const filePath = path.join(uploadDir, uniqueName);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${safeCategory}/${uniqueName}`;
    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: uniqueName,
      size: file.size,
      mimeType: file.type,
    });
  } catch (err) {
    console.error('File upload error:', err);
    return NextResponse.json({ error: 'Failed to process file upload' }, { status: 500 });
  }
}

