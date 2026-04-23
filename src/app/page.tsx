import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8 text-center">
      <div>
        <h1 className="text-4xl font-bold text-science">Sen Lab Visa</h1>
        <p className="mt-2 text-ink/70">Laboratoires virtuels STEM pour les élèves sénégalais</p>
      </div>
      <Link
        href="/login"
        className="inline-flex min-h-touch items-center justify-center rounded-lg bg-science px-6 text-base font-medium text-white transition hover:bg-science/90"
      >
        Se connecter
      </Link>
    </main>
  );
}
