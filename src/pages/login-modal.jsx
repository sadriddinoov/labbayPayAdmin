import React, { useState } from "react";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { useCustomPost } from "../hooks/useCustomPost";
import { endpoints } from "../config/endpoints";
import { setToken } from "../config/api";
import { toast } from "react-toastify";

export default function Login() {
  const [credentials, setCredentials] = useState({ login: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { mutate: login } = useCustomPost({
    key: "auth",
    endpoint: endpoints.authLogin,
    onSuccess: (data) => {
      setToken(data.accessToken);
      setCredentials({ login: "", password: "" });
      setIsLoading(false);
      toast.success("Успешно вошли в систему");
      window.location.reload()
    },
    onError: (error) => {
      setIsLoading(false);
      const errorMessage =
        error?.response?.status === 401
          ? "Неверный логин или пароль"
          : error?.response?.data?.message || "Ошибка при входе";
      toast.error(errorMessage);
    },
  });

  const handleLogin = () => {
    if (!credentials.login || !credentials.password) {
      toast.error("Заполните все поля");
      return;
    }
    setIsLoading(true);
    login({
      endpoint: endpoints.authLogin,
      body: {
        login: credentials.login,
        password: credentials.password,
      },
    });
  };

  return (
    <div className="sm:max-w-[425px] mx-auto mt-10 p-6 flex flex-col gap-[20px]">
      <div className="flex flex-col justify-center items-center gap-[5px]">
        <h2 className="text-2xl font-bold text-center" >Вход в админ-панель</h2>
        <p className="text-gray-500 mt-4">Введите логин и пароль для доступа к системе.</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="login">Логин</Label>
          <Input
            id="login"
            type="text"
            placeholder="Введите логин"
            value={credentials.login}
            onChange={(e) => setCredentials({ ...credentials, login: e.target.value })}
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Пароль</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Введите пароль"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              disabled={isLoading}
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
            >
              {showPassword ? (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.418 0-8-3.582-8-8s3.582-8 8-8a10.05 10.05 0 011.875.175M15 12a3 3 0 11-6 0 3 3 0 016 0zM2 2l20 20"></path>
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
        <Button
          onClick={handleLogin}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <span className="flex items-center">
              <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Вход...
            </span>
          ) : (
            "Войти"
          )}
        </Button>
      </div>
      </div>
    </div>
  );
}