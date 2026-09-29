import { redirect } from "react-router";
import type { LoaderFunctionArgs } from "react-router";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const searchParams = url.searchParams.toString();
  return redirect(`/app/preMadeEditEffect${searchParams ? `?${searchParams}` : ""}`);
};

export default function PreMadeEditEffectRedirect() {
  return null;
}
