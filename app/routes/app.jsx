import { useEffect } from "react";
import { Link, Outlet, useLoaderData, useNavigation, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "../shopify.server";
import ConfettiLoadingScreen from "../components/ConfettiLoadingScreen";

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
  };
};

export default function App() {
  const { apiKey } = useLoaderData();
  const navigation = useNavigation();
  const isPageLoading = navigation.state === "loading";

  useEffect(() => {
    if (navigation.state === "loading" && typeof window !== "undefined") {
      window.__hasClientNavigated = true;
    }
  }, [navigation.state]);

  useEffect(() => {
    // Preload premade library images into browser cache during idle time
    const premadeImages = [
      "/Gemini_Generated_Image_baugy0baugy0baug-1.webp",
      "/Gemini_Generated_Image_baugy0baugy0baug-2.webp",
      "/Gemini_Generated_Image_baugy0baugy0baug-3.webp",
      "/Gemini_Generated_Image_baugy0baugy0baug-4.webp",
      "/Gemini_Generated_Image_baugy0baugy0baug-5.webp",
      "/Gemini_Generated_Image_baugy0baugy0baug-6.webp",
    ];

    const preload = () => {
      premadeImages.forEach((src) => {
        const img = new Image();
        img.src = src;
      });
    };

    if (typeof window !== "undefined") {
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(preload);
      } else {
        setTimeout(preload, 1000);
      }
    }
  }, []);

  return (
    <AppProvider embedded apiKey={apiKey}>
      <ui-nav-menu>
        <Link to="/app" rel="home">
          Home
        </Link>
        <Link to="/app/analytics">Analytics</Link>
        <Link to="/app/contact">Contact Us</Link>
      </ui-nav-menu>
      {isPageLoading ? <ConfettiLoadingScreen /> : <Outlet />}
    </AppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (args) => boundary.headers(args);
