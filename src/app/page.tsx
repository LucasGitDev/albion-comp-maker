import Link from "next/link";

export default function Home() {
  return (
    <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col outline-none">
      <section className="flex flex-col items-center gap-4 border-b border-[var(--color-border)] px-6 py-16 text-center">
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Monte comps de Albion Online prontas para o Discord
        </h1>
        <p className="max-w-xl text-base text-foreground/70">
          Escolha builds, equipamentos e habilidades reais de cada item, e
          exporte um card em PNG para compartilhar com sua guilda em segundos.
        </p>
        <Link
          href="/build/new"
          className="mt-2 rounded-full bg-[var(--color-accent)] px-6 py-3 font-medium text-[var(--color-accent-foreground)] transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:transition-none"
        >
          Nova build
        </Link>
      </section>

      <section className="flex flex-1 flex-col gap-4 px-6 py-12">
        <h2 className="text-lg font-semibold text-foreground">
          Minhas comps
        </h2>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] py-16 text-center">
          <p className="text-base font-medium text-foreground">
            Nenhuma comp ainda
          </p>
          <p className="max-w-sm text-sm text-foreground/60">
            Crie sua primeira build para começar a montar uma comp.
          </p>
        </div>
      </section>
    </main>
  );
}
