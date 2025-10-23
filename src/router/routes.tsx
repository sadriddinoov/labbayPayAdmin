import { lazy } from "react";
import { APP_ROUTES } from "./path";

const Home = lazy(() => import("../pages/home.jsx"));
const Kiosks = lazy(() => import("../pages/kiosks-page.jsx"))
const Transactions = lazy(() => import("../pages/transactions-page.jsx"))
const Users = lazy(() => import("../pages/users-page.jsx"))
const Providers = lazy(() => import("../pages/providers-page.jsx"))
const Commision = lazy(() => import("../pages/commission-page"))
const Collection = lazy(() => import("../pages/collection-page"))
const Chats = lazy(() => import("../pages/chats-page"))
const Sms = lazy(() => import("../pages/sms-page"))

export const appRoutes = [
  { path: APP_ROUTES.HOME, element: <Home /> },
  { path: APP_ROUTES.KIOSKS, element: <Kiosks /> },
  { path: APP_ROUTES.TRANSACTIONS, element: <Transactions /> },
  { path: APP_ROUTES.USERS, element: <Users /> },
  { path: APP_ROUTES.PROVIDERS, element: <Providers /> },
  { path: APP_ROUTES.COMMISION, element: <Commision /> },
  { path: APP_ROUTES.COLLECTION, element: <Collection /> },
  { path: APP_ROUTES.CHATS, element: <Chats /> },
  { path: APP_ROUTES.SMS, element: <Sms /> },
]