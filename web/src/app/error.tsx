"use client";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-xl mx-auto p-8 space-y-4" role="alert">
      <h1 className="text-2xl font-bold">No pudimos cargar esta página</h1>
      <p>
        La fuente de datos puede no estar disponible. Tus favoritos siguen
        guardados en este navegador.
      </p>
      <button className="border rounded px-4 py-2" onClick={reset}>
        Reintentar
      </button>
    </div>
  );
}
