const bar = "animate-pulse rounded-lg bg-surface";

export default function Loading() {
  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-10" aria-busy="true">
      <p role="status" className="sr-only">
        Caricamento della pagina…
      </p>
      <div className="flex flex-col gap-6" aria-hidden="true">
        <div className={`h-4 w-40 ${bar}`} />
        <div className={`h-11 w-2/3 max-w-[520px] ${bar}`} />
        <div className={`h-24 w-full rounded-2xl ${bar}`} />
        <div className={`h-11 w-full ${bar}`} />
      </div>
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`aspect-[4/3] rounded-2xl ${bar}`} />
        ))}
      </div>
    </div>
  );
}
