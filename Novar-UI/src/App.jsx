import { Toaster } from "sonner";
import ErrorBoundary from "./components/ErrorBoundary";
import Home from "./components/Home";
import { ThemeProvider } from "./contexts/ThemeContext";

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <Toaster theme="dark" position="top-center" richColors />
        <Home />
      </ThemeProvider>
    </ErrorBoundary>
  );
}