import { redirect } from "react-router";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  return redirect(`/app/contact${url.search}`);
};

export default function ContactUsRedirect() {
  return null;
}
