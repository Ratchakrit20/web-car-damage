// app/page.tsx
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function Page() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')

  if (!token) {
    redirect("/login");
  }

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <h1 className="text-2xl font-bold text-indigo-700">Welcome to the Insurance Portal</h1>
    </div>
  );
}
