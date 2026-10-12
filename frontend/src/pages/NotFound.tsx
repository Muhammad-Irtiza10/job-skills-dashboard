import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { buttonVariants } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen">
      <AppHeader subtitle="Off the map" />
      <main className="grid place-items-center gap-4 px-4 py-[12vh] text-center">
        <div className="news-block inline-grid gap-1 px-7 py-4">
          <span className="font-display text-6xl font-extrabold leading-none">404</span>
          <span className="eyebrow">Station not found</span>
        </div>
        <h1 className="text-3xl font-extrabold">Oops! Page not found</h1>
        <p className="text-ink-2">This stop isn't on the map.</p>
        <a href="/" className={buttonVariants()}>
          <ArrowLeft />
          Return to Home
        </a>
      </main>
    </div>
  );
};

export default NotFound;
