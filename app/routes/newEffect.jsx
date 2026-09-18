import { redirect } from "react-router";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const searchParams = url.searchParams.toString();
  return redirect(`/app/newEffect${searchParams ? `?${searchParams}` : ""}`);
};

export default function NewEffectRedirect() {
  return null;
}
