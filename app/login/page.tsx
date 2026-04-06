"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      router.replace("/calendar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-5xl">🌿</span>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-sky-700">
            wapicoco <span className="text-sky-400 font-light">calendar</span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">家族みんなの予定をひとつに</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-sky-100 border border-sky-50 overflow-hidden">
          <div className="bg-gradient-to-r from-sky-500 to-teal-400 px-6 py-4">
            <p className="text-white font-bold text-sm">ログイン</p>
          </div>
          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-sky-500 uppercase tracking-widest mb-1.5">メールアドレス</label>
              <input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border-2 border-sky-100 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-800 focus:outline-none focus:border-sky-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-sky-500 uppercase tracking-widest mb-1.5">パスワード</label>
              <input
                type="password" required value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-2 border-sky-100 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-800 focus:outline-none focus:border-sky-400 transition-colors"
              />
            </div>
            {error && <p className="text-red-500 text-xs font-medium bg-red-50 rounded-xl px-3 py-2">{error}</p>}
            <button
              type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-sky-500 to-teal-400 text-white rounded-xl py-3 text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity shadow-md shadow-sky-100"
            >
              {loading ? "ログイン中..." : "ログイン"}
            </button>
          </form>
          <div className="px-6 pb-6 text-center">
            <p className="text-sm text-gray-400">
              アカウントがない方は{" "}
              <Link href="/register" className="text-sky-600 font-bold hover:underline">新規登録</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
