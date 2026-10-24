"use client";
import { useState } from "react";
import Image from "next/image";
import { Car } from "lucide-react";
export function CarImage({
  src,
  alt,
  priority = false,
}: {
  src?: string;
  alt: string;
  priority?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  return src && !broken && src !== "/placeholder-car.jpg" ? (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      className="object-cover"
      priority={priority}
      onError={() => setBroken(true)}
    />
  ) : (
    <div className="absolute inset-0 flex items-center justify-center bg-muted">
      <Car size={48} aria-hidden="true" />
      <span className="sr-only">Imagen no disponible</span>
    </div>
  );
}
export function CarGallery({ urls, title }: { urls: string[]; title: string }) {
  const [index, setIndex] = useState(0);
  return (
    <div className="space-y-3">
      <div className="relative aspect-[16/9]">
        <CarImage
          key={urls[index]}
          src={urls[index]}
          alt={`${title}, foto ${index + 1}`}
          priority
        />
      </div>
      {urls.length > 1 && (
        <div
          className="flex flex-wrap gap-2 px-4 pb-4"
          aria-label="Fotos del vehículo"
        >
          {urls.map((_, i) => (
            <button
              key={i}
              className="border rounded px-3 py-2"
              aria-pressed={index === i}
              aria-label={`Ver foto ${i + 1}`}
              onClick={() => setIndex(i)}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
