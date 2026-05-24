"use client";

import Link from "next/link";
import { useStoreI18n } from "@/components/storefront/store-i18n";
import { SITE_NAME } from "@/lib/store";

export function AboutSection() {
  const { t, dir } = useStoreI18n();

  return (
    <section id="about" className="scroll-mt-28 overflow-hidden rounded-[18px] border border-zinc-800/90 bg-gradient-to-br from-hagor-olive/25 via-[#141810] to-hagor-black">
      <div className="grid gap-0 md:grid-cols-2" dir={dir}>
        <div className="relative min-h-[220px] bg-[url('/hagor-hero-fallback.svg')] bg-cover bg-center md:min-h-[320px]">
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/20 md:bg-gradient-to-l md:from-black/60 md:to-transparent" />
          <div className="absolute bottom-4 start-4 end-4 md:bottom-8 md:start-8">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-hagor-gold">{SITE_NAME}</p>
          </div>
        </div>
        <div className="flex flex-col justify-center p-6 sm:p-8 md:p-10">
          <h2 className="text-2xl font-black text-white sm:text-3xl">{t("aboutTitle")}</h2>
          <p className="mt-4 text-sm leading-relaxed text-zinc-300 sm:text-base">{t("aboutText")}</p>
          <Link href="/#about" className="hagor-btn-outline mt-6 w-fit">
            {t("heroContact")}
          </Link>
        </div>
      </div>
    </section>
  );
}
