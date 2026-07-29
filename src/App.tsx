import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/hooks/use-cart";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { FreteGratisBar } from "@/components/frete-gratis-bar";
import Home from "@/pages/home";

const Product = lazy(() => import("@/pages/product"));
const Cart = lazy(() => import("@/pages/cart"));
const Checkout = lazy(() => import("@/pages/checkout"));
const Success = lazy(() => import("@/pages/success"));
const NotFound = lazy(() => import("@/pages/not-found"));
const RastrearPedido = lazy(() => import("@/pages/rastrear-pedido"));
const PoliticaDeTrocas = lazy(() => import("@/pages/politica-de-trocas"));
const DuvidasFrequentes = lazy(() => import("@/pages/duvidas-frequentes"));
const FaleConosco = lazy(() => import("@/pages/fale-conosco"));
const Admin = lazy(() => import("@/pages/admin"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="w-8 h-8 rounded-full border-4 border-gray-200 border-t-green-600 animate-spin" />
    </div>
  );
}

function Router() {
  return (
    <div className="flex flex-col min-h-screen" style={{ overflowX: "hidden", maxWidth: "100%", width: "100%" }}>
      <FreteGratisBar />
      <div className="h-[38px] shrink-0" aria-hidden="true" />
      <Header />
      <main className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/produto/:slug" component={Product} />
            <Route path="/carrinho" component={Cart} />
            <Route path="/checkout" component={Checkout} />
            <Route path="/sucesso" component={Success} />
            <Route path="/rastrear-pedido" component={RastrearPedido} />
            <Route path="/politica-de-trocas" component={PoliticaDeTrocas} />
            <Route path="/duvidas-frequentes" component={DuvidasFrequentes} />
            <Route path="/fale-conosco" component={FaleConosco} />
            <Route path="/admin" component={Admin} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </CartProvider>
    </QueryClientProvider>
  );
}

export default App;
