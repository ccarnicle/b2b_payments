import { NextResponse } from "next/server";
import { pinata } from "@/utils/pinata"; // Use our new server-only config

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Create a signed URL that is valid for 1 minute (60 seconds)
    const url = await pinata.upload.public.createSignedURL({
      expires: 60,
    });

    // Return the signed upload URL to the client
    return NextResponse.json({ url: url }, { status: 200 });
    
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error creating signed URL" }, { status: 500 });
  }
}