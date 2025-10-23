
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { appRoutes } from "./router/routes";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ASSETS } from "./assets";
import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  Monitor,
  CreditCard,
  Banknote,
  Users,
  LogOut,
  Briefcase,
  MessageSquare,
  MessageCircle,
  Percent,
} from "lucide-react";
import { Button } from "./components/ui/button";
import ProtectedRoute from "./components/protectedroute";
import { initApp, removeToken, tokenName } from "./config/api";
import { useState, useEffect } from "react";

const queryClient = new QueryClient();

const menuItems = [
  { id: "/", label: "Дашборд", icon: LayoutDashboard },
  { id: "/kiosks", label: "Киоски", icon: Monitor },
  { id: "/transactions", label: "Транзакции", icon: CreditCard },
  { id: "/collection", label: "Инкассация", icon: Banknote },
  { id: "/users", label: "Пользователи", icon: Users },
  { id: "/providers", label: "Поставщики", icon: Briefcase },
  { id: "/commission", label: "Комиссия", icon: Percent },
  { id: "/chats", label: "Чаты", icon: MessageSquare },
  { id: "/sms", label: "СМС", icon: MessageCircle },
];

function Sidebar() {
  const location = useLocation();
  const activeMenu = menuItems.find((item) => item.id === location.pathname)?.id || "/";

  const handleLogout = () => {
    removeToken();
    window.location.href = "/";
  };

  return (
    <div className="w-64 bg-white shadow-lg flex flex-col h-full">
      <div className="p-6 border-b">
        <img
          className="w-24 h-8 object-contain mb-2"
          src={ASSETS.labbaylogo}
          alt=""
        />
        <p className="text-sm text-gray-500">Админ-панель</p>
      </div>
      <nav className="flex flex-col p-4 gap-2 flex-1">
        {menuItems.map((item) => (
          <Link
            to={item.id}
            key={item.id}
            className={`w-full flex justify-start gap-3 text-[15px] p-2 rounded-md transition-colors ${
              activeMenu === item.id
                ? "bg-blue-100 text-blue-700"
                : "text-gray-700 hover:bg-blue-50"
            }`}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-red-600 hover:bg-red-50"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          Выход
        </Button>
      </div>
    </div>
  );
}

function App() {
  initApp();
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem(tokenName));

  useEffect(() => {
    const token = localStorage.getItem(tokenName);
    setIsAuthenticated(!!token);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
        <div className="h-screen bg-gray-50 flex w-full">
          {isAuthenticated && <Sidebar />}
          <div className={isAuthenticated ? "flex-1 overflow-auto p-6" : "flex-1 flex items-center justify-center"}>
            <Routes>
              {appRoutes.map((route, index) => (
                <Route
                  key={index}
                  path={route.path}
                  element={
                    <ProtectedRoute
                      onAuthChange={(auth) => setIsAuthenticated(auth)}
                    >
                      {route.element}
                    </ProtectedRoute>
                  }
                />
              ))}
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;


// ism familiya otchestvo
// tugilgan kuni
// passport seriya raqam, amal qlish mudati
// passport rasm
// grajdanstvo
// input file zagruzkaga 
// nechinchidan nechinchigacha
// qaysi shaxarga kevotganini 
// safar turi -> komandirvoka yoki turizim