import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full border-t border-foreground/10 py-4 mt-auto">
      <div className="max-w-5xl mx-auto px-4 flex justify-center gap-6 text-sm opacity-70">
        <Link href="/tos" className="hover:underline">
          Terms of Service
        </Link>
        <Link href="/privacy" className="hover:underline">
          Privacy Policy
        </Link>
      </div>
    </footer>
  );
}
