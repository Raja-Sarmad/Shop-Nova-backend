import { v2 as cloudinary } from "cloudinary";
import { assertCloudinaryConfigured, env } from "./env.js";

let configured = false;

export function getCloudinary() {
  if (!configured) {
    assertCloudinaryConfigured();
    cloudinary.config({
      cloud_name: env.cloudinary.cloudName,
      api_key: env.cloudinary.apiKey,
      api_secret: env.cloudinary.apiSecret,
      secure: true,
    });
    configured = true;
  }
  return cloudinary;
}

export async function uploadImageBuffer(
  buffer: Buffer,
  folder = "velora/products",
): Promise<{ url: string; publicId: string }> {
  const client = getCloudinary();
  return new Promise((resolve, reject) => {
    const stream = client.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        transformation: [{ quality: "auto", fetch_format: "auto" }],
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed"));
          return;
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );
    stream.end(buffer);
  });
}

export async function deleteCloudinaryImage(publicId: string) {
  if (!publicId) return;
  const client = getCloudinary();
  await client.uploader.destroy(publicId);
}
