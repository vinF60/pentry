import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-20 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Page not found</h1>
      <p className="mt-3 text-base text-slate-600">
        The page you’re looking for doesn’t exist.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center justify-center rounded-xl bg-[#4F46E5] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4338CA]"
      >
        Back to inbox
      </Link>
    </main>
  );
}

