"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/me")
      .then((r) => {
        if (r.ok) router.replace("/calendar");
        else router.replace("/login");
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-400">読み込み中...</p>
    </div>
  );
}
