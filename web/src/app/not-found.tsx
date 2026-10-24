import Link from "next/link";
export default function NotFound() {
  return (
    <div className="p-8 max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">No encontramos este aviso</h1>
      <p>Puede haber cambiado o no estar disponible.</p>
      <Link className="underline" href="/buscar">
        Volver al buscador
      </Link>
    </div>
  );
}
