import { redirect } from "react-router";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const searchParams = url.searchParams.toString();
  return redirect(`/app/premade${searchParams ? `?${searchParams}` : ""}`);
};

export default function PremadeRedirect() {
  return null;
}
