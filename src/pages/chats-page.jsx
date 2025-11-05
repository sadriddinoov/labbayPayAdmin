"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { jwtDecode } from "jwt-decode";
import { io } from "socket.io-client";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Label } from "../components/ui/label";
import {
  Search,
  Star,
  Send,
  Paperclip,
  ChevronRight,
  StarOff,
  X,
  File as FileIcon,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  ExternalLink
} from "lucide-react";
import { Avatar, AvatarFallback } from "../components/ui/avatar";

import { tokenName, socketUrl, LOCAL_BASE, PUBLIC_BASE } from "../config/api";

const SOCKET_EVENTS = {
  GET_CHATS: "get_chats",
  GET_CHAT_FAVORITE: "get_chat_favorite",
  USER_CHAT: "user_chats",
  GET_PROBLEM_TOPIC: "get_problem_topic",
  ADD_PROBLEM_TOPIC: "add_problem_topic",
  DELETE_PROBLEM_TOPIC: "delete_problem_topic",
  READ_MESSAGE: "read_messages",
  CLOSE_TICKET: "close_ticket",
  TOGGLE_FAVORITE: "toggle_favorite",
};

const NEW_MESSAGE_ALIASES = ["new_message", "operator_message", "chat_updated"];
const EXTRA_BROADCAST_ALIASES = ["new_chat_inserted", "chat_updated"];
const DEBUG = true;

// ---------- Pagination ----------
const PAGE_SIZE = 7;
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const maxPagesToShow = 5;
  const pages = [];
  const halfRange = Math.floor(maxPagesToShow / 2);

  let startPage = Math.max(1, currentPage - halfRange);
  let endPage = Math.min(totalPages, currentPage + halfRange);

  if (endPage - startPage + 1 < maxPagesToShow) {
    if (currentPage <= halfRange) {
      endPage = Math.min(totalPages, maxPagesToShow);
    } else if (currentPage + halfRange >= totalPages) {
      startPage = Math.max(1, totalPages - maxPagesToShow + 1);
    }
  }
  for (let i = startPage; i <= endPage; i++) pages.push(i);

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
      <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      {startPage > 1 && (
        <>
          <Button variant="outline" size="sm" onClick={() => onPageChange(1)}>1</Button>
          {startPage > 2 && <span className="text-gray-500">...</span>}
        </>
      )}
      {pages.map((p) => (
        <Button key={p} variant={currentPage === p ? "default" : "outline"} size="sm" onClick={() => onPageChange(p)}>
          {p}
        </Button>
      ))}
      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && <span className="text-gray-500">...</span>}
          <Button variant="outline" size="sm" onClick={() => onPageChange(totalPages)}>
            {totalPages}
          </Button>
        </>
      )}
      <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>
        <ChevronRightIcon className="h-4 w-4" />
      </Button>
    </div>
  );
};

// ---------- helpers ----------
function normalizeUploadsPath(s) {
  // приводит './uploads/..' или 'uploads/..' к '/uploads/..'
  const str = String(s || "").trim();
  if (!str) return str;
  const m = /^\.?\/?uploads(\/.*)$/i.exec(str);
  if (m) return "/uploads" + m[1];
  return str;
}

function normalizeMediaUrl(raw) {
  let s = String(raw || "").trim();
  if (!s) return s;

  // приведение локального относительного пути к /uploads
  s = normalizeUploadsPath(s);

  // не трогаем эти схемы
  if (/^(data:|blob:)/i.test(s)) return s;

  const pubBaseStr = String(PUBLIC_BASE || "").replace(/\/+$/, "");
  if (!pubBaseStr) return s;

  let pub;
  try {
    pub = new URL(pubBaseStr + "/");
  } catch {
    return s;
  }

  // распарсим URL (для относительных используем PUBLIC_BASE как базу)
  let u;
  try {
    u = new URL(s, pub);
  } catch {
    // если совсем не распарсилось, но похоже на uploads — склеим вручную
    if (/^\.?\/?uploads\//i.test(s)) return pub.origin + normalizeUploadsPath(s);
    return s;
  }

  // 1) любые ссылки, у которых путь содержит /uploads — форсим PUBLIC_BASE
  if (/\/uploads(\/|$)/i.test(u.pathname)) {
    return pub.origin + u.pathname + u.search + u.hash;
  }

  // 2) всё, что пришло с LOCAL_BASE → переводим на PUBLIC_BASE
  try {
    if (LOCAL_BASE) {
      const local = new URL(String(LOCAL_BASE));
      if (u.hostname === local.hostname) {
        return pub.origin + u.pathname + u.search + u.hash;
      }
    }
  } catch {
    /* ignore bad LOCAL_BASE */
  }

  // 3) тот же hostname, но отличается порт/протокол → нормализуем к PUBLIC_BASE
  if (u.hostname === pub.hostname && u.origin !== pub.origin) {
    return pub.origin + u.pathname + u.search + u.hash;
  }

  // 4) уже публичный — оставляем
  if (u.origin === pub.origin) return u.href;

  // 5) внешние http(s) CDN и т.п. — возвращаем как есть
  return u.href;
}

// устойчивое открытие ссылок для http(s), blob:, data:
function openLinkSmart(url, filename) {
  try {
    const href = normalizeMediaUrl(url || "");
    if (/^data:/i.test(href)) {
      const m = /^data:([^;]+);base64,(.+)$/i.exec(href);
      if (m) {
        const mime = m[1];
        const b64 = m[2];
        const binary = atob(b64);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: mime });
        const obj = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = obj;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        if (filename) a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          URL.revokeObjectURL(obj);
          a.remove();
        }, 2000);
        return;
      }
    }
    const a = document.createElement("a");
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    if (/^blob:/i.test(href) && filename) a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

const extractListFromPacket = (packet) => {
  const v = packet?.data ?? packet?.result ?? packet;
  return Array.isArray(v) ? v : Array.isArray(v?.items) ? v.items : [];
};

const unwrap = (packet) => {
  if (!packet || typeof packet !== "object") return packet;
  if (Array.isArray(packet)) return packet;
  if ("result" in packet) return packet.result;
  if ("data" in packet) return packet.data;
  return packet;
};

const unwrapList = (packet) => {
  const v = unwrap(packet);
  return Array.isArray(v) ? v : Array.isArray(v?.items) ? v.items : [];
};

const formatResponseTime = (minutes) => {
  const mins = parseInt(String(minutes), 10) || 0;
  const days = Math.floor(mins / 1440);
  const remainingMinutes = mins % 1440;
  const hours = Math.floor(remainingMinutes / 60);
  const remainingMins = remainingMinutes % 60;

  if (days > 0) {
    return `${days} ${days === 1 ? "день" : days < 5 ? "дня" : "дней"} ${hours} ${
      hours === 1 ? "час" : hours < 5 ? "часа" : "часов"
    } ${remainingMins} мин`;
  } else if (hours > 0) {
    return `${hours} ${hours === 1 ? "час" : hours < 5 ? "часа" : "часов"} ${remainingMins} мин`;
  }
  return `${mins} мин`;
};

function guessType(rawType, mime) {
  const t = String(rawType || "").toLowerCase();
  const m = String(mime || "").toLowerCase();

  if (t === "photo" || t === "image") return "photo";
  if (t === "video") return "video";
  if (t === "document" || t === "file") return "document";
  if (t === "voice" || t === "audio") return "voice";

  if (m.startsWith("image/")) return "photo";
  if (m.startsWith("video/")) return "video";
  if (m.startsWith("audio/")) return "voice";

  return t || "text";
}

function pickUrlFromMsg(msg = {}) {
  // приоритет: download_url → url → file_url → fileUrl → file → file_path
  let u =
    msg.download_url ||
    msg.url ||
    msg.file_url ||
    msg.fileUrl ||
    msg.file ||
    msg.file_path ||
    null;

  if (u) u = normalizeUploadsPath(u);
  return u ? normalizeMediaUrl(u) : null;
}

const normalizeIncomingMessage = (msg = {}) => {
  const rawType = String(msg.type || "").toLowerCase();
  const mime = msg.mime_type || msg.mimeType || "";
  const type = guessType(rawType, mime);

  const url = pickUrlFromMsg(msg);
  const text = msg.text || msg.caption || "";

  const timeStr = msg.time
    ? new Date(msg.time).toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date().toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

  let attachments;
  if (Array.isArray(msg.attachments) && msg.attachments.length > 0) {
    attachments = msg.attachments
      .map((a) => {
        const t = guessType(a?.type, a?.mime || a?.mime_type || a?.content_type);
        const au =
          a?.download_url ||
          a?.url ||
          a?.file_url ||
          a?.fileUrl ||
          a?.file_path ||
          a?.file ||
          "";
        return {
          type: t,
          name: a?.name || a?.filename || msg?.file_name || "",
          url: normalizeMediaUrl(normalizeUploadsPath(au)),
        };
      })
      .filter((a) => a.url);
  }

  return {
    id: msg.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    sender:
      msg.sender ||
      (msg.isOperator || msg.from === "operator" || msg.sender === "operator"
        ? "operator"
        : "client"),
    text,
    caption: msg.caption || null,
    media_group_id: msg.media_group_id || null,
    entities: msg.entities || [],
    caption_entities: msg.caption_entities || [],
    time: timeStr,
    type,
    url,
    name: msg.file_name || msg.name || msg.filename || null,
    path: msg.file_path || msg.path || null,
    attachments,
    mime_type: mime || undefined,
    width: msg.width,
    height: msg.height,
    duration: msg.duration,
  };
};

const pickIsFavorite = (obj) =>
  obj?.isFavorite === true ||
  obj?.isFavorite === "true" ||
  obj?.isFavorite === 1 ||
  obj?.isFavorite === "1";

const mapChatFromDoc = (chat, fallbackStatus = "new") => {
  const msgs = Array.isArray(chat?.messages)
    ? chat.messages.map((m, idx) =>
        normalizeIncomingMessage({ ...m, id: m?.id || `msg_${idx}` })
      )
    : [];

  const status = chat.status || fallbackStatus;

  return {
    id: chat.id || chat._id || `unknown_${Math.random().toString(36).slice(2, 8)}`,
    clientName: Array.isArray(chat.clientName)
      ? chat.clientName.join(", ")
      : chat.clientName || "Неизвестный клиент",
    clientPhone: chat.clientPhone || "Неизвестный номер",
    operatorName: Array.isArray(chat.operatorName)
      ? chat.operatorName.join(", ")
      : chat.operatorName || "Админ",
    date: chat.date
      ? new Date(chat.date).toLocaleString("ru-RU", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Неизвестная дата",
    messageCount: chat.messageCount || msgs.length || 0,
    messages: msgs,
    isFavorite: pickIsFavorite(chat),
    isAcknowledged: chat.isAcknowledged || false,
    user_id: chat.user_id || chat.userId || null,
    operatorId: Array.isArray(chat.operatorId) ? chat.operatorId : chat.operatorId || null,
    UnreadMessage: chat.UnreadMessage || 0,
    readAt: chat.readAt || null,
    status,
    endDate:
      status === "completed" && chat.endDate
        ? new Date(chat.endDate).toLocaleDateString("ru-RU", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
        : "",
    rating: status === "completed" ? (chat.rating || 0) : 0,
    responseTime: status === "completed" && chat.responseTime ? formatResponseTime(chat.responseTime) : "",
    topic: status === "completed" ? (chat.topic || "") : "",
    description: status === "completed" ? (chat.description || "") : "",
  };
};

// --- утилита для «жёсткого» удаления дублей по id ---
const dedupeById = (arr = []) => {
  const map = new Map();
  for (const it of arr) {
    const key = String(it?.id ?? "");
    if (!map.has(key)) map.set(key, it);
    else {
      const old = map.get(key);
      map.set(key, {
        ...old,
        ...it,
        messages: Array.isArray(it.messages) && it.length ? it.messages : old.messages,
      });
    }
  }
  return Array.from(map.values());
};

// --- стабилизация порядка (фиксируем один раз и удерживаем) ---
const ensureStableOrder = (nextList = [], prevList = [], posKey = "__pos") => {
  const prevPos = new Map(prevList.map((c, i) => [String(c.id), c[posKey] ?? i]));
  let maxPos = prevList.length
    ? Math.max(...prevList.map((c, i) => (c[posKey] ?? i)))
    : -1;

  const withPos = nextList.map((c) => {
    const id = String(c.id);
    const pos = prevPos.has(id) ? prevPos.get(id) : (++maxPos);
    return { ...c, [posKey]: pos };
  });

  withPos.sort((a, b) => (a[posKey] ?? 0) - (b[posKey] ?? 0));
  return withPos;
};

export default function ChatsPage() {
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem("activeTab") || "new");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedChat, setSelectedChat] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [isClosingTicket, setIsClosingTicket] = useState(false);
  const [closingTopic, setClosingTopic] = useState("");
  const [closingDescription, setClosingDescription] = useState("");
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState("");

  const [chats, setChats] = useState({
    new: [],
    active: [],
    completed: [],
    favorite: [],
  });

  const [pageNew, setPageNew] = useState(1);
  const [pageActive, setPageActive] = useState(1);
  const [pageCompleted, setPageCompleted] = useState(1);
  const [pageFavorite, setPageFavorite] = useState(1);

  const [problemTopics, setProblemTopics] = useState([]);
  const [isAddTopicModalOpen, setIsAddTopicModalOpen] = useState(false);
  const [newTopic, setNewTopic] = useState("");
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [addTopicLoading, setAddTopicLoading] = useState(false);
  const [deletingTopicId, setDeletingTopicId] = useState(null);

  const socketRef = useRef(null);
  const currentTabRef = useRef(localStorage.getItem("activeTab") || "new");
  const lastDeleteIdRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesRef = useRef(null);

  // >>> сохраняем скролл "Активные"
  const activeListRef = useRef(null);
  // <<<

  // >>> антидребезг запросов на «догруз» сообщений
  const FETCH_DEBOUNCE_MS = 800;
  const fetchLocksRef = useRef(new Map());
  const requestLatestThread = (uid) => {
    const userId = String(uid || "");
    if (!userId || !socketRef.current) return;
    const now = Date.now();
    const last = fetchLocksRef.current.get(userId) || 0;
    if (now - last < FETCH_DEBOUNCE_MS) return; // рано
    fetchLocksRef.current.set(userId, now);
    // Запрашиваем ленту сообщений по этому пользователю
    socketRef.current.emit(SOCKET_EVENTS.USER_CHAT, { user_id: uid });
    if (DEBUG) console.log("[FETCH LATEST]", uid);
  };
  // <<<

  const tokenVal = typeof window !== "undefined" ? localStorage.getItem(tokenName) : null;
  const decoded = tokenVal ? jwtDecode(tokenVal) : {};

  const scrollToBottom = () => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  useEffect(() => {
    localStorage.setItem("activeTab", activeTab);
  }, [activeTab]);

  // ===== SOCKET =====
  useEffect(() => {
    const connectSocket = () => {
      const token = localStorage.getItem(tokenName) || "";
      const headers = { token, "ngrok-skip-browser-warning": "true" };

      socketRef.current = io(socketUrl, {
        auth: { token },
        extraHeaders: headers,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 5000,
        forceNew: true,
      });

      const socket = socketRef.current;

      const topicsHandler = (packet) => {
        setIsLoadingTopics(false);
        const list = extractListFromPacket(packet);
        const topics = list.map((topic, index) => ({
          id: topic.id ?? `temp_${index}`,
          problem_topic: topic.problem_topic || topic.title || "Без названия",
          requested_date: topic.requested_date || new Date().toISOString(),
        }));
        setProblemTopics(topics);
      };

      socket.onAny((event, ...args) => {
        if (DEBUG) console.log("[SOCKET EVENT]", event, args?.[0]);
        if (String(event).toLowerCase() === "get_problem_topics") {
          topicsHandler(args?.[0]);
        }
      });

      socket.on("connect", () => {
        const currentTab = currentTabRef.current;

        if (currentTab === "favorite") {
          const p1 = { favorite: "true", operatorId: decoded?.id };
          socket.emit(SOCKET_EVENTS.GET_CHAT_FAVORITE, p1);
          const p2 = { favorite: "true", operatorId: decoded?.id };
          socket.emit(SOCKET_EVENTS.GET_CHATS, p2);
        } else if (currentTab === "new") {
          socket.emit(SOCKET_EVENTS.GET_CHATS, { status: "new" });
        } else if (currentTab === "active") {
          socket.emit(SOCKET_EVENTS.GET_CHATS, { status: "active", operatorId: decoded?.id });
        } else if (currentTab === "completed") {
          socket.emit(SOCKET_EVENTS.GET_CHATS, { status: "completed", operatorId: decoded?.id });
        }

        setIsLoadingTopics(true);
        socket.emit(SOCKET_EVENTS.GET_PROBLEM_TOPIC, {});
      });

      // входящие сообщения (сырые)
      const onIncomingMessageRaw = (dataPacket) => {
        const payload = unwrap(dataPacket);
        const user_id =
          payload?.user_id ||
          payload?.userId ||
          payload?.chat?.user_id ||
          payload?.chat?.userId;
        if (!user_id) return;

        let incomingArray = [];
        if (Array.isArray(payload?.messages)) {
          incomingArray = payload.messages;
        } else if (payload?.message) {
          incomingArray = [payload.message];
        } else if (
          payload &&
          (payload.text || payload.caption || payload.download_url || payload.file_path || payload.url || payload.attachments || payload.type)
        ) {
          incomingArray = [payload];
        }
        if (!incomingArray.length) return;

        const normalized = incomingArray.map(normalizeIncomingMessage);

        setChats((prev) => {
          const updateList = (list) =>
            list.map((chat) => {
              if (chat.user_id === user_id) {
                const chatIsOpen =
                  selectedChat && selectedChat.user_id === user_id && isChatOpen;
                return {
                  ...chat,
                  messages: [...(chat.messages || []), ...normalized],
                  UnreadMessage: chatIsOpen
                    ? 0
                    : (chat.UnreadMessage || 0) + normalized.length,
                  isAcknowledged: chatIsOpen ? true : chat.isAcknowledged,
                };
              }
              return chat;
            });

          return {
            new: updateList(prev.new),
            active: updateList(prev.active),
            completed: updateList(prev.completed),
            favorite: updateList(prev.favorite),
          };
        });

        setSelectedChat((prev) => {
          if (prev && prev.user_id === user_id) {
            const next = {
              ...prev,
              messages: [...(prev.messages || []), ...normalized],
              UnreadMessage: 0,
              isAcknowledged: true,
            };
            requestAnimationFrame(scrollToBottom);
            return next;
          }
          return prev;
        });
      };

      socket.on(SOCKET_EVENTS.USER_CHAT, onIncomingMessageRaw);
      NEW_MESSAGE_ALIASES.forEach((evt) => socket.on(evt, onIncomingMessageRaw));

      // MERGE helper — сохраняем порядок
      const upsertList = (prevArr = [], incoming = []) => {
        const byIndex = new Map(prevArr.map((c, i) => [String(c.id), i]));
        const next = [...prevArr];
        for (const it of incoming) {
          const id = String(it.id);
          const idx = byIndex.get(id);
          if (typeof idx === "number") {
            const old = next[idx];
            next[idx] = {
              ...old,
              ...it,
              messages:
                (Array.isArray(it.messages) && it.messages.length ? it.messages : old.messages) || [],
              UnreadMessage:
                typeof it.UnreadMessage === "number" ? it.UnreadMessage : old.UnreadMessage || 0,
              isFavorite:
                typeof it.isFavorite !== "undefined" ? it.isFavorite : old.isFavorite,
            };
          } else {
            next.push(it);
          }
        }
        return next;
      };

      // первичные листинги
      socket.on(SOCKET_EVENTS.GET_CHATS, (packet) => {
        const list = unwrapList(packet);
        const mapped = list.map((chat, index) =>
          mapChatFromDoc({ ...chat, id: chat.id || `unknown_${index}` }, chat.status || "new")
        );

        const news = mapped.filter((c) => c.status === "new");
        const actives = mapped.filter((c) => c.status === "active");
        const completed = mapped.filter((c) => c.status === "completed");
        const favs = mapped.filter((c) => c.isFavorite);

        setChats((prev) => {
          const newNew = dedupeById(upsertList(prev.new, news));
          const mergedActive = dedupeById(upsertList(prev.active, actives));
          const activeOrdered = ensureStableOrder(mergedActive, prev.active);
          const newCompleted = dedupeById(upsertList(prev.completed, completed));
          const newFav = dedupeById(upsertList(prev.favorite, favs));
          return {
            new: newNew,
            active: activeOrdered,
            completed: newCompleted,
            favorite: newFav,
          };
        });
      });

      socket.on(SOCKET_EVENTS.GET_CHAT_FAVORITE, (packet) => {
        const list = unwrapList(packet);
        const mapped = list.map((chat, index) =>
          mapChatFromDoc({ ...chat, id: chat.id || `unknown_${index}` }, chat.status || "active")
        );
        setChats((prev) => ({
          ...prev,
          favorite: dedupeById(
            upsertList(prev.favorite, mapped.filter((c) => c.isFavorite))
          ),
        }));
      });

      socket.on(SOCKET_EVENTS.GET_PROBLEM_TOPIC, topicsHandler);

      // добавление темы
      socket.on(SOCKET_EVENTS.ADD_PROBLEM_TOPIC, (packet) => {
        const ok = packet?.ok === true;
        const eventName = String(packet?.event || packet?.action || "");
        const msg = String(packet?.data ?? packet?.result ?? packet?.message ?? "");

        if (DEBUG) console.log("[TOPIC_ADD_EVT_RAW]", packet);

        if (/exists/i.test(msg)) {
          setAddTopicLoading(false);
          toast.error("Такая тема уже существует");
          return;
        }

        if (ok && eventName === SOCKET_EVENTS.ADD_PROBLEM_TOPIC && /success/i.test(msg)) {
          toast.success("Тема успешно добавлена");
          setAddTopicLoading(false);
          setIsAddTopicModalOpen(false);
          setNewTopic("");

          setIsLoadingTopics(true);
          socket.emit(SOCKET_EVENTS.GET_PROBLEM_TOPIC, {});
          return;
        }

        if (ok) {
          toast.success("Тема успешно добавлена");
          setAddTopicLoading(false);
          setIsAddTopicModalOpen(false);
          setNewTopic("");
          setIsLoadingTopics(true);
          socket.emit(SOCKET_EVENTS.GET_PROBLEM_TOPIC, {});
        } else {
          setAddTopicLoading(false);
          toast.error("Не удалось добавить тему");
        }
      });

      // удаление темы
      socket.on(SOCKET_EVENTS.DELETE_PROBLEM_TOPIC, (packet) => {
        const ok = packet?.ok === true;
        const eventName = String(packet?.event || packet?.action || "");
        const deletedId = packet?.id ?? packet?.topic_id ?? packet?.topicId ?? lastDeleteIdRef.current;

        if (DEBUG) console.log("[TOPIC_DEL_EVT_RAW]", packet);

        if (eventName !== SOCKET_EVENTS.DELETE_PROBLEM_TOPIC) return;

        if (ok) {
          if (deletedId != null) {
            setProblemTopics((prev) => prev.filter((t) => String(t.id) !== String(deletedId)));
            if (String(closingTopic) === String(deletedId)) setClosingTopic("");
          }
          setDeletingTopicId(null);
          lastDeleteIdRef.current = null;

          toast.success("Тема удалена");

          setIsLoadingTopics(true);
          socket.emit(SOCKET_EVENTS.GET_PROBLEM_TOPIC, {});
        } else {
          setDeletingTopicId(null);
          lastDeleteIdRef.current = null;
          toast.error("Ошибка при удалении темы");
        }
      });

      socket.on(SOCKET_EVENTS.READ_MESSAGE, (packet) => {
        const data = unwrap(packet);
        if (data && (data.user_id || data.userId)) {
          const uid = data.user_id || data.userId;
          setChats((prevChats) => {
            const updatedChats = Object.keys(prevChats).reduce((acc, tab) => {
              acc[tab] = prevChats[tab].map((chat) =>
                chat.user_id === uid
                  ? { ...chat, UnreadMessage: 0, isAcknowledged: true }
                  : chat
              );
              return acc;
            }, {});
            return updatedChats;
          });
          if (selectedChat && selectedChat.user_id === uid) {
            setSelectedChat((prev) => ({
              ...prev,
              UnreadMessage: 0,
              isAcknowledged: true,
            }));
          }
        }
      });

      socket.on(SOCKET_EVENTS.CLOSE_TICKET, (packet) => {
        const data = unwrap(packet);
        if (
          data &&
          (data.action === "close_ticket" || data.event === "close_ticket") &&
          (data.result === "successfully" || data.ok === true)
        ) {
          toast.success("Тикет успешно закрыт (сервер)");
        }
      });

      // ======== BROADCAST ========
      const handleBroadcast = (packet) => {
        const raw = packet || {};

        let op =
          (raw.op && String(raw.op)) ||
          (raw.action && String(raw.action)) ||
          "";
        op = op.toLowerCase();

        if (!op && raw.type) op = String(raw.type).toLowerCase();
        if (op === "chat_updated") op = "update";
        if (op === "new_chat_inserted") op = "insert";

        const doc =
          raw.result ?? raw.doc ?? raw.data ?? raw.chat ??
          (raw.id || raw.user_id || raw.status ? raw : null);

        if (DEBUG) console.log("[BROADCAST]", raw);
        if (!op || !doc) return;

        if (op === "delete") {
          const deletedId = String(doc.id || doc._id || "");
          if (!deletedId) return;
          setChats((prev) => {
            const removeFrom = (arr) => arr.filter((c) => String(c.id) !== deletedId);
            const next = {
              new: removeFrom(prev.new),
              active: removeFrom(prev.active),
              completed: removeFrom(prev.completed),
              favorite: removeFrom(prev.favorite),
            };
            if (selectedChat && String(selectedChat.id) === deletedId) {
              setSelectedChat(null);
              setIsChatOpen(false);
            }
            return next;
          });
          return;
        }

        const mapped = mapChatFromDoc(doc, doc.status || "new");
        const targetStatus = mapped.status || "new";
        const uid = mapped.user_id || doc.user_id || doc.userId;

        setChats((prev) => {
          // merge на месте (индекс сохраняем)
          const replaceInPlace = (arr, item) => {
            const idx = arr.findIndex((c) => String(c.id) === String(item.id));
            if (idx === -1) return arr;
            const old = arr[idx];
            const merged = {
              ...old,
              ...item,
              messages:
                (Array.isArray(item.messages) && item.messages.length
                  ? item.messages
                  : old.messages) || [],
              UnreadMessage: typeof item.UnreadMessage === "number"
                ? item.UnreadMessage
                : (old.UnreadMessage || 0),
              isFavorite: typeof item.isFavorite !== "undefined" ? item.isFavorite : old.isFavorite,
            };
            const copy = [...arr];
            copy[idx] = merged;
            return copy;
          };

          // перенос между списками, если статус изменился
          const moveBetweenLists = (fromArr, toArr, item) => {
            const fromIdx = fromArr.findIndex((c) => String(c.id) === String(item.id));
            const cleaned = fromIdx === -1 ? fromArr : fromArr.filter((_, i) => i !== fromIdx);
            const toIdx = toArr.findIndex((c) => String(c.id) === String(item.id));
            if (toIdx !== -1) {
              return { from: cleaned, to: replaceInPlace(toArr, item) };
            }
            return { from: cleaned, to: [...toArr, item] };
          };

          let next = { ...prev };

          const inNew = prev.new.some((c) => String(c.id) === String(mapped.id));
          const inActive = prev.active.some((c) => String(c.id) === String(mapped.id));
          const inCompleted = prev.completed.some((c) => String(c.id) === String(mapped.id));
          const currentStatus = inNew ? "new" : inActive ? "active" : inCompleted ? "completed" : null;

          if (currentStatus && currentStatus === targetStatus) {
            if (targetStatus === "new") next.new = replaceInPlace(prev.new, mapped);
            else if (targetStatus === "active") next.active = replaceInPlace(prev.active, mapped);
            else if (targetStatus === "completed") next.completed = replaceInPlace(prev.completed, mapped);
          } else {
            if (targetStatus === "new") {
              const { from, to } = moveBetweenLists(inActive ? prev.active : prev.completed, prev.new, mapped);
              if (inActive) { next.active = from; next.new = to; }
              else if (inCompleted) { next.completed = from; next.new = to; }
              else { next.new = [...prev.new, mapped]; }
            } else if (targetStatus === "active") {
              const { from, to } = moveBetweenLists(inNew ? prev.new : prev.completed, prev.active, mapped);
              if (inNew) { next.new = from; next.active = to; }
              else if (inCompleted) { next.completed = from; next.active = to; }
              else { next.active = [...prev.active, mapped]; }
            } else if (targetStatus === "completed") {
              const { from, to } = moveBetweenLists(inActive ? prev.active : prev.new, prev.completed, mapped);
              if (inActive) { next.active = from; next.completed = to; }
              else if (inNew) { next.new = from; next.completed = to; }
              else { next.completed = [...prev.completed, mapped]; }
            }
          }

          // избранные без смены порядка
          if (mapped.isFavorite) {
            const favIdx = prev.favorite.findIndex((c) => String(c.id) === String(mapped.id));
            if (favIdx === -1) next.favorite = [...prev.favorite, mapped];
            else next.favorite = replaceInPlace(prev.favorite, mapped);
          } else {
            next.favorite = prev.favorite.filter((c) => String(c.id) !== String(mapped.id));
          }

          next.new = dedupeById(next.new);
          next.active = dedupeById(next.active);
          next.completed = dedupeById(next.completed);
          next.favorite = dedupeById(next.favorite);

          // стабилизация активных
          next.active = ensureStableOrder(next.active, prev.active);

          return next;
        });

        // догружаем тексты если надо
        if (uid && (targetStatus === "active" || (selectedChat && selectedChat.user_id === uid))) {
          requestLatestThread(uid);
        }

        // синхронизация открытого чата
        setSelectedChat((prev) => {
          if (!prev) return prev;
          const sameId = String(prev.id) === String(mapped.id);
          const sameUser = prev.user_id && mapped.user_id && String(prev.user_id) === String(mapped.user_id);
          if (!sameId && !sameUser) return prev;

          const mergedMessages =
            Array.isArray(mapped.messages) && mapped.messages.length
              ? mapped.messages
              : prev.messages || [];

          const next = {
            ...prev,
            ...mapped,
            messages: mergedMessages,
            UnreadMessage: 0,
            isAcknowledged: true,
          };
          requestAnimationFrame(scrollToBottom);
          return next;
        });
      };

      socket.on("broadcast", handleBroadcast);
      EXTRA_BROADCAST_ALIASES.forEach((evt) =>
        socket.on(evt, (payload) => {
          const op = evt === "new_chat_inserted" ? "insert" : "update";
          handleBroadcast({ op, result: payload });
        })
      );

      socket.on("connect_error", () => setIsLoadingTopics(false));
      socket.on("disconnect", () => setIsLoadingTopics(false));

      return () => {
        socket.off(SOCKET_EVENTS.GET_PROBLEM_TOPIC, topicsHandler);
        socket.off(SOCKET_EVENTS.DELETE_PROBLEM_TOPIC);
        socket.off(SOCKET_EVENTS.ADD_PROBLEM_TOPIC);
        socket.off(SOCKET_EVENTS.USER_CHAT);
        socket.off(SOCKET_EVENTS.GET_CHATS);
        socket.off(SOCKET_EVENTS.GET_CHAT_FAVORITE);
        socket.off("broadcast", handleBroadcast);
        NEW_MESSAGE_ALIASES.forEach((evt) => socket.off(evt));
        EXTRA_BROADCAST_ALIASES.forEach((evt) => socket.off(evt));
        socket.offAny();
        socket.disconnect();
      };
    };

    const cleanup = connectSocket();
    return () => {
      if (typeof cleanup === "function") cleanup();
      if (socketRef.current) socketRef.current.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [selectedChat?.messages?.length]);

  useEffect(() => {
    if (isClosingTicket && socketRef.current) {
      setIsLoadingTopics(true);
      socketRef.current.emit(SOCKET_EVENTS.GET_PROBLEM_TOPIC, {});
    }
  }, [isClosingTicket]);

  useEffect(() => {
    setIsChatOpen(false);
    setSelectedChat(null);

    if (activeTab === "new") setPageNew(1);
    if (activeTab === "active") setPageActive(1);
    if (activeTab === "completed") setPageCompleted(1);
    if (activeTab === "favorite") setPageFavorite(1);

    if (socketRef.current) {
      currentTabRef.current = activeTab;

      if (activeTab === "favorite") {
        const p1 = { favorite: "true", operatorId: decoded?.id };
        socketRef.current.emit(SOCKET_EVENTS.GET_CHAT_FAVORITE, p1);
        const p2 = { favorite: "true", operatorId: decoded?.id };
        socketRef.current.emit(SOCKET_EVENTS.GET_CHATS, p2);
      } else {
        const payload =
          activeTab === "new"
            ? { status: activeTab }
            : { status: activeTab, operatorId: decoded?.id };
        socketRef.current.emit(SOCKET_EVENTS.GET_CHATS, payload);
      }
    }
  }, [activeTab, decoded?.id]);

  const readFileAsDataURL = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });

  const sendTextMessage = (text) => {
    if (!socketRef.current || !selectedChat) return;
    const token = localStorage.getItem(tokenName) || "";

    const payload = { token, user_id: selectedChat.user_id, text };

    const optimistic = {
      id: (selectedChat?.messages?.length || 0) + 1,
      sender: "operator",
      text,
      time: new Date().toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      type: "text",
    };
    const updatedChat = { ...selectedChat, messages: [...(selectedChat?.messages || []), optimistic] };
    setSelectedChat(updatedChat);
    setChats((prev) => {
      const arr = [...prev[activeTab]];
      const idx = arr.findIndex((c) => c.id === selectedChat.id);
      if (idx !== -1) arr[idx] = updatedChat;
      return { ...prev, [activeTab]: dedupeById(arr) };
    });

    socketRef.current.emit("send_operator_message", payload);
  };

  const handleFilesChosen = async (fileList) => {
    if (!socketRef.current || !selectedChat) return;
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    try {
      const dataURLs = await Promise.all(files.map(readFileAsDataURL));
      const attachments = files.map((f, i) => {
        const mime = String(f.type || "").toLowerCase();
        if (mime.startsWith("image/")) {
          return { type: "image", name: f.name, url: dataURLs[i] };
        }
        if (mime.startsWith("video/")) {
          return { type: "video", name: f.name, url: dataURLs[i] };
        }
        if (mime.startsWith("audio/")) {
          return { type: "audio", name: f.name, url: dataURLs[i] };
        }
        return { type: "document", name: f.name, url: dataURLs[i] };
      });

      const token = localStorage.getItem(tokenName) || "";
      const caption = newMessage.trim();
      const payload = { token, user_id: selectedChat.user_id, attachments, text: caption };

      const optimistic = {
        id: (selectedChat?.messages?.length || 0) + 1,
        sender: "operator",
        text: caption,
        time: new Date().toLocaleString("ru-RU", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        type: "attachments",
        attachments,
      };
      const updatedChat = { ...selectedChat, messages: [...(selectedChat?.messages || []), optimistic] };
      setSelectedChat(updatedChat);
      setChats((prev) => {
        const arr = [...prev[activeTab]];
        const idx = arr.findIndex((c) => c.id === selectedChat.id);
        if (idx !== -1) arr[idx] = updatedChat;
        return { ...prev, [activeTab]: dedupeById(arr) };
      });

      socketRef.current.emit("send_operator_message", payload);

      setNewMessage("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      toast.error("Не удалось прочитать файл");
    }
  };

  const acknowledgeChat = (chatId) => {
    if (socketRef.current) {
      socketRef.current.emit("acknowledge_chat", { chatId });
    }
  };

  const handleDeleteTopic = (topicId) => {
    if (!problemTopics.length) {
      toast.error("Нет тем для удаления");
      return;
    }
    if (socketRef.current) {
      lastDeleteIdRef.current = topicId;
      setDeletingTopicId(topicId);

      setProblemTopics((prev) => prev.filter((t) => String(t.id) !== String(topicId)));
      if (String(closingTopic) === String(topicId)) setClosingTopic("");

      const payload = { id: Number(topicId) };
      socketRef.current.emit(SOCKET_EVENTS.DELETE_PROBLEM_TOPIC, payload);
    }
  };

  // фильтрация + финальный dedupe перед показом
  const filteredChatsByTab = useMemo(() => {
    const filterFn = (arr) =>
      dedupeById(arr || []).filter(
        (chat) =>
          (chat.clientName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (chat.clientPhone || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (chat.id || "").toLowerCase().includes(searchTerm.toLowerCase())
      );
    return {
      new: filterFn(chats.new),
      active: filterFn(chats.active),
      completed: filterFn(chats.completed),
      favorite: filterFn(chats.favorite),
    };
  }, [chats, searchTerm]);

  const pageState = {
    new: [pageNew, setPageNew],
    active: [pageActive, setPageActive],
    completed: [pageCompleted, setPageCompleted],
    favorite: [pageFavorite, setPageFavorite],
  };

  const [currentPage, setCurrentPage] = pageState[activeTab];

  const totalPages = Math.max(1, Math.ceil((filteredChatsByTab[activeTab]?.length || 0) / PAGE_SIZE));

  const pagedChats = useMemo(() => {
    const list = filteredChatsByTab[activeTab] || [];
    const start = (currentPage - 1) * PAGE_SIZE;
    return list.slice(start, start + PAGE_SIZE);
  }, [filteredChatsByTab, activeTab, currentPage]);

  const isSelected = (c, tab) =>
    tab !== "new" && selectedChat && activeTab === tab && String(selectedChat.id) === String(c.id);

  const rowClass = (c, tab) =>
    `cursor-pointer ${isSelected(c, tab)
      ? "bg-blue-50/70 outline outline-2 -outline-offset-1 outline-blue-500"
      : "hover:bg-gray-50"
    }`;

  const handleOpenChat = (chat) => {
    const prevScroll =
      activeTab === "active" && activeListRef.current
        ? activeListRef.current.scrollTop
        : null;

    if (selectedChat && selectedChat.id === chat.id && isChatOpen) {
      setIsChatOpen(false);
      setSelectedChat(null);
      if (socketRef.current) {
        socketRef.current.emit("exitchat", { chatId: chat.id });
      }
    } else {
      setSelectedChat(chat);
      setIsChatOpen(true);
      acknowledgeChat(chat.id);

      if (socketRef.current && (activeTab === "new" || activeTab === "active")) {
        const token = localStorage.getItem(tokenName) || "";
        const statusForRead = chat.status || (activeTab === "new" ? "new" : "active");
        const p = { user_id: chat.user_id, token, status: statusForRead };
        socketRef.current.emit(SOCKET_EVENTS.READ_MESSAGE, p);
      }

      if (chat.status === "new") {
        setChats((prevChats) => {
          const newChats = prevChats.new.filter((c) => c.id !== chat.id);
          const updatedChat = {
            ...chat,
            status: "active",
            UnreadMessage: 0,
            isAcknowledged: true,
            endDate: "",
          };
          return {
            ...prevChats,
            new: newChats,
            active: dedupeById([...prevChats.active, updatedChat]),
          };
        });
        setActiveTab("active");
        if (chat.user_id) requestLatestThread(chat.user_id);
      } else if (chat.status === "active") {
        setChats((prevChats) => {
          const updatedChats = prevChats[activeTab].map((c) =>
            c.id === chat.id ? { ...c, UnreadMessage: 0, isAcknowledged: true, endDate: "" } : c
          );
          return { ...prevChats, [activeTab]: dedupeById(updatedChats) };
        });
        if (chat.user_id) requestLatestThread(chat.user_id);
      }
    }

    if (prevScroll !== null) {
      requestAnimationFrame(() => {
        if (activeListRef.current) activeListRef.current.scrollTop = prevScroll;
      });
    }
  };

  const handleTransferTicket = () => {
    if (!selectedOperator) return;
    const updatedChat = { ...selectedChat, operatorName: "", operatorId: selectedOperator };
    setChats((prevChats) => {
      const chatIndex = prevChats[activeTab].findIndex((c) => c.id === selectedChat.id);
      if (chatIndex !== -1) {
        const updated = [...prevChats[activeTab]];
        updated[chatIndex] = updatedChat;
        return { ...prevChats, [activeTab]: dedupeById(updated) };
      }
      return prevChats;
    });
    setSelectedChat(updatedChat);
    if (socketRef.current) {
      const p = { chatId: selectedChat.id, operatorId: selectedOperator };
      socketRef.current.emit("transfer_ticket", p);
    }
    setIsTransferModalOpen(false);
    setSelectedOperator("");
  };

  const handleSendMessage = (e) => {
    if (e) e.preventDefault();
    const text = newMessage.trim();
    if (!text) return;
    sendTextMessage(text);
    setNewMessage("");
  };

  const handleCloseTicket = () => {
    if (!closingTopic || !closingDescription) {
      toast.error("Заполните тему и описание");
      return;
    }
    const updatedChat = { ...selectedChat };
    const topicObj = problemTopics.find((t) => String(t.id) === String(closingTopic));
    updatedChat.topic = (topicObj && topicObj.problem_topic) || "";
    updatedChat.description = closingDescription;
    updatedChat.endDate = new Date().toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    updatedChat.rating = Math.floor(Math.random() * 3) + 3;
    updatedChat.responseTime = `${Math.floor(Math.random() * 10) + 1} мин`;
    updatedChat.status = "completed";

    setChats((prevChats) => {
      const activeChats = prevChats.active.filter((c) => c.id !== selectedChat.id);
      const updatedFavorite = updatedChat.isFavorite
        ? prevChats.favorite.map((c) => (c.id === updatedChat.id ? updatedChat : c))
        : prevChats.favorite;
      return {
        ...prevChats,
        active: dedupeById(activeChats),
        completed: dedupeById([...prevChats.completed, updatedChat]),
        favorite: dedupeById(updatedFavorite),
      };
    });

    if (socketRef.current) {
      const p = {
        user_id: selectedChat.user_id,
        topic: parseInt(String(closingTopic), 10),
        description: closingDescription,
      };
      socketRef.current.emit(SOCKET_EVENTS.CLOSE_TICKET, p);
      socketRef.current.emit("exitchat", { chatId: selectedChat.id });
    }

    toast.success("Тикет успешно закрыт");

    setIsClosingTicket(false);
    setClosingTopic("");
    setClosingDescription("");
    setIsChatOpen(false);
    setSelectedChat(null);
    setActiveTab("completed");
  };

  const toggleFavorite = (chat) => {
    if (activeTab !== "favorite" && !chat.isFavorite) {
      const updatedChat = { ...chat, isFavorite: true };
      setChats((prevChats) => {
        let updatedChats = prevChats;
        if (activeTab === "active" || activeTab === "completed" || activeTab === "new") {
          const chatIndex = prevChats[activeTab].findIndex((c) => c.id === chat.id);
          if (chatIndex !== -1) {
            const updatedTabChats = [...prevChats[activeTab]];
            updatedTabChats[chatIndex] = updatedChat;
            updatedChats = { ...prevChats, [activeTab]: dedupeById(updatedTabChats) };
          }
        }
        const exists = prevChats.favorite.some((c) => c.id === chat.id);
        const updatedFavorite = exists
          ? prevChats.favorite.map((c) =>
              c.id === chat.id ? { ...c, ...updatedChat } : c
            )
          : [...prevChats.favorite, { ...updatedChat }];
        return { ...updatedChats, favorite: dedupeById(updatedFavorite) };
      });
      if (selectedChat && selectedChat.id === chat.id) {
        setSelectedChat({ ...updatedChat });
      }
      if (socketRef.current) {
        const p = { id: chat.id, isFavorite: true };
        socketRef.current.emit(SOCKET_EVENTS.TOGGLE_FAVORITE, p);
      }
    } else if (activeTab === "favorite" && chat.isFavorite) {
      const updatedChat = { ...chat, isFavorite: false };
      setChats((prevChats) => {
        const updatedFavorite = prevChats.favorite.filter((c) => c.id !== chat.id);
        const upd = {};
        ["new", "active", "completed"].forEach((tab) => {
          upd[tab] = dedupeById(prevChats[tab].map((c) => (c.id === chat.id ? updatedChat : c)));
        });
        return {
          ...prevChats,
          favorite: dedupeById(updatedFavorite),
          ...upd,
        };
      });
      setSelectedChat(null);
      setIsChatOpen(false);
      if (socketRef.current) {
        const p = { id: chat.id, isFavorite: false };
        socketRef.current.emit(SOCKET_EVENTS.TOGGLE_FAVORITE, p);
      }
    }
  };

  const handleAddTopic = () => {
    if (!newTopic.trim()) {
      toast.error("Введите название темы");
      return;
    }
    if (socketRef.current) {
      setAddTopicLoading(true);
      const p = { problem_topic: newTopic };
      socketRef.current.emit(SOCKET_EVENTS.ADD_PROBLEM_TOPIC, p);
    }
  };

  const compactCols = isChatOpen;

  return (
    <div className="h-full">
      <ToastContainer />
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Чаты</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Поиск по имени, телефону, ID..."
              className="pl-8 w-64"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPageNew(1);
                setPageActive(1);
                setPageCompleted(1);
                setPageFavorite(1);
              }}
            />
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 mb-6">
          <TabsTrigger value="new" className="relative">
            Новые
            {chats.new.length > 0 && (
              <Badge className="ml-2 bg-red-500">{dedupeById(chats.new).length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="active" className="relative">
            Активные
            {chats.active.length > 0 && (
              <Badge className="ml-2 bg-blue-500">{dedupeById(chats.active).length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">Завершенные</TabsTrigger>
          <TabsTrigger value="favorite" className="relative">
            Избранные
            {chats.favorite.length > 0 && (
              <Badge className="ml-2 bg-yellow-500">
                {dedupeById(chats.favorite).length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <div className="flex h-[calc(100vh-220px)] md:h-[calc(100vh-220px)]">
          <div
            className={`w-full ${isChatOpen ? "hidden md:block md:w-1/3" : ""} border rounded-lg overflow-hidden`}
          >
            {/* NEW */}
            <TabsContent value="new" className="m-0 h-full">
              <Card className="border-0 rounded-none h-full">
                <CardHeader className="p-4">
                  <CardTitle className="text-lg">Новые тикеты</CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-auto h-[calc(100%-60px)]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>ФИО</TableHead>
                        <TableHead>Номер телефона</TableHead>
                        {!compactCols && <TableHead>Дата</TableHead>}
                        {!compactCols && <TableHead>Сообщения</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedChats?.length > 0 ? (
                        pagedChats.map((chat) => (
                          <TableRow
                            key={String(chat.id)}
                            className={rowClass(chat, 'new')}
                            onClick={() => handleOpenChat(chat)}
                          >
                            <TableCell className="font-medium">{chat.id}</TableCell>
                            <TableCell>{chat.clientName}</TableCell>
                            <TableCell>{chat.clientPhone}</TableCell>
                            {!compactCols && <TableCell>{chat.date}</TableCell>}
                            {!compactCols && (
                              <TableCell>
                                <Badge className="bg-red-500">
                                  {chat.UnreadMessage > 0 ? chat.UnreadMessage : 0}
                                </Badge>
                              </TableCell>
                            )}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={compactCols ? 3 : 5} className="text-center py-4">
                            Нет новых тикетов
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  {activeTab === "new" && totalPages > 1 && (
                    <Pagination currentPage={pageNew} totalPages={totalPages} onPageChange={setPageNew} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ACTIVE */}
            <TabsContent value="active" className="m-0 h-full">
              <Card className="border-0 rounded-none h-full">
                <CardHeader className="p-4">
                  <CardTitle className="text-lg">Активные тикеты</CardTitle>
                </CardHeader>
                <CardContent
                  ref={activeListRef}
                  className="p-0 overflow-auto h-[calc(100%-60px)]"
                >
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>ФИО</TableHead>
                        <TableHead>Номер телефона</TableHead>
                        {!compactCols && <TableHead>Оператор</TableHead>}
                        {!compactCols && <TableHead>Дата</TableHead>}
                        {!compactCols && <TableHead>Сообщения</TableHead>}
                        {!compactCols && <TableHead></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedChats?.length > 0 ? (
                        pagedChats.map((chat) => (
                          <TableRow
                            key={String(chat.id)}
                            className={rowClass(chat, 'active')}
                            onClick={(e) => {
                              const target = e.target;
                              if (target && target.closest && target.closest(".favorite-button")) return;
                              handleOpenChat(chat);
                            }}
                          >
                            <TableCell className="font-medium">{chat.id}</TableCell>
                            <TableCell>{chat.clientName}</TableCell>
                            <TableCell>{chat.clientPhone}</TableCell>
                            {!compactCols && <TableCell>{chat.operatorName}</TableCell>}
                            {!compactCols && <TableCell>{chat.date}</TableCell>}
                            {!compactCols && (
                              <TableCell>
                                <Badge className="bg-red-500">
                                  {chat.UnreadMessage > 0 ? chat.UnreadMessage : 0}
                                </Badge>
                              </TableCell>
                            )}
                            {!compactCols && (
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="favorite-button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFavorite(chat);
                                  }}
                                >
                                  {chat.isFavorite ? (
                                    <Star className="h-4 w-4 text-yellow-500" />
                                  ) : (
                                    <Star className="h-4 w-4 text-gray-300" />
                                  )}
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={compactCols ? 3 : 7} className="text-center py-4">
                            Нет активных тикетов
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  {activeTab === "active" && totalPages > 1 && (
                    <Pagination currentPage={pageActive} totalPages={totalPages} onPageChange={setPageActive} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* COMPLETED */}
            <TabsContent value="completed" className="m-0 h-full">
              <Card className="border-0 rounded-none h-full">
                <CardHeader className="p-4">
                  <CardTitle className="text-lg">Завершенные тикеты</CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-auto h-[calc(100%-60px)]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>ФИО</TableHead>
                        <TableHead>Номер телефона</TableHead>
                        {!compactCols && <TableHead>Оператор</TableHead>}
                        {!compactCols && <TableHead>Рейтинг</TableHead>}
                        {!compactCols && <TableHead>Скорость ответа</TableHead>}
                        {!compactCols && <TableHead>Дата начала</TableHead>}
                        {!compactCols && <TableHead>Дата завершения</TableHead>}
                        {!compactCols && <TableHead></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedChats?.length > 0 ? (
                        pagedChats.map((chat) => (
                          <TableRow
                            key={String(chat.id)}
                            className={rowClass(chat, 'completed')}
                            onClick={(e) => {
                              const target = e.target;
                              if (target && target.closest && target.closest(".favorite-button")) return;
                              handleOpenChat(chat);
                            }}
                          >
                            <TableCell className="font-medium">{chat.id}</TableCell>
                            <TableCell>{chat.clientName}</TableCell>
                            <TableCell>{chat.clientPhone}</TableCell>
                            {!compactCols && <TableCell>{chat.operatorName}</TableCell>}
                            {!compactCols && <TableCell>{chat.rating}/5</TableCell>}
                            {!compactCols && <TableCell>{chat.responseTime}</TableCell>}
                            {!compactCols && <TableCell>{chat.date}</TableCell>}
                            {!compactCols && <TableCell>{chat.endDate}</TableCell>}
                            {!compactCols && (
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="favorite-button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFavorite(chat);
                                  }}
                                >
                                  {chat.isFavorite ? (
                                    <Star className="h-4 w-4 text-yellow-500" />
                                  ) : (
                                    <Star className="h-4 w-4 text-gray-300" />
                                  )}
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={compactCols ? 3 : 9} className="text-center py-4">
                            Нет завершенных тикетов
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  {activeTab === "completed" && totalPages > 1 && (
                    <Pagination currentPage={pageCompleted} totalPages={totalPages} onPageChange={setPageCompleted} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* FAVORITE */}
            <TabsContent value="favorite" className="m-0 h-full">
              <Card className="border-0 rounded-none h-full">
                <CardHeader className="p-4">
                  <CardTitle className="text-lg">Избранные тикеты</CardTitle>
                </CardHeader>
              <CardContent className="p-0 overflow-auto h-[calc(100%-60px)]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>ФИО</TableHead>
                        <TableHead>Номер телефона</TableHead>
                        {!compactCols && <TableHead>Оператор</TableHead>}
                        {!compactCols && <TableHead>Дата начала</TableHead>}
                        {!compactCols && <TableHead></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedChats?.length > 0 ? (
                        pagedChats.map((chat) => (
                          <TableRow
                            key={String(chat.id)}
                            className={rowClass(chat, 'favorite')}
                            onClick={(e) => {
                              const target = e.target;
                              if (target && target.closest && target.closest(".favorite-button")) return;
                              handleOpenChat(chat);
                            }}
                          >
                            <TableCell className="font-medium">{chat.id}</TableCell>
                            <TableCell>{chat.clientName}</TableCell>
                            <TableCell>{chat.clientPhone}</TableCell>
                            {!compactCols && <TableCell>{chat.operatorName}</TableCell>}
                            {!compactCols && <TableCell>{chat.date}</TableCell>}
                            {!compactCols && (
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="favorite-button"
                                  onClick={() => toggleFavorite(chat)}
                                >
                                  <StarOff className="h-4 w-4 text-yellow-500" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={compactCols ? 3 : 6} className="text-center py-4">
                            Нет избранных тикетов
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  {activeTab === "favorite" && totalPages > 1 && (
                    <Pagination currentPage={pageFavorite} totalPages={totalPages} onPageChange={setPageFavorite} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>

          {/* CHAT */}
          {isChatOpen && selectedChat && (
            <div className="w-full md:w-2/3 border rounded-lg ml-0 md:ml-4 flex flex-col">
              <div className="p-4 border-b flex justify-between items-center">
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="md:hidden mr-2"
                    onClick={() => { setIsChatOpen(false); setSelectedChat(null); }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <div>
                    <h3 className="font-medium">{selectedChat.clientName}</h3>
                    <p className="text-sm text-gray-500">{selectedChat.clientPhone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedChat.status !== "completed" && (
                    <>
                      {activeTab !== "new" && activeTab !== "completed" && (
                        <Button variant="outline" size="sm" onClick={() => setIsClosingTicket(true)}>
                          Завершить
                        </Button>
                      )}
                    </>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => toggleFavorite(selectedChat)}>
                    {selectedChat.isFavorite ? (
                      <Star className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <Star className="h-4 w-4 text-gray-300" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setIsChatOpen(false); setSelectedChat(null); }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div ref={messagesRef} className="flex-1 p-4 overflow-y-auto bg-gray-50">
                {selectedChat.messages?.map((message, idx) => {
                  const isClient = message.sender === "client";
                  const openLink = (url, name) => openLinkSmart(url, name);
                  return (
                    <div key={`${message.id}-${idx}`} className={`mb-4 flex ${isClient ? "justify-start" : "justify-end"}`}>
                      {isClient && (
                        <Avatar className="h-8 w-8 mr-2">
                          <AvatarFallback className="bg-blue-100 text-blue-600">
                            {(selectedChat.clientName || "").split(" ").map((n) => n?.[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                      )}

                      <div className={`max-w-[70%] rounded-lg p-3 ${isClient ? "bg-white text-gray-800 border" : "bg-blue-500 text-white"}`}>
                        {Array.isArray(message.attachments) && message.attachments.length > 0 ? (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              {message.attachments.map((a, aIdx) => {
                                const t = String(a.type || "").toLowerCase();
                                if (t === "image" || t === "photo") {
                                  return (
                                    <div key={`${message.id}-att-${aIdx}`} className="space-y-1">
                                      <img
                                        src={a.url}
                                        alt={a.name || "image"}
                                        className="rounded-md w-full h-auto max-h-[420px] object-contain cursor-pointer"
                                        onClick={() => openLink(a.url, a.name)}
                                      />
                                      <button
                                        type="button"
                                        className={`text-xs underline inline-flex items-center gap-1 ${isClient ? "text-blue-600" : "text-white"}`}
                                        onClick={() => openLink(a.url, a.name)}
                                      >
                                        Открыть <ExternalLink size={12} />
                                      </button>
                                    </div>
                                  );
                                }
                                if (t === "video") {
                                  return (
                                    <div key={`${message.id}-att-${aIdx}`} className="space-y-1">
                                      <video
                                        src={a.url}
                                        controls
                                        className="rounded-md w-full h-auto max-h-[420px] object-contain"
                                      />
                                      <button
                                        type="button"
                                        className={`text-xs underline inline-flex items-center gap-1 ${isClient ? "text-blue-600" : "text-white"}`}
                                        onClick={() => openLink(a.url, a.name)}
                                      >
                                        Открыть в новой вкладке <ExternalLink size={12} />
                                      </button>
                                    </div>
                                  );
                                }
                                if (t === "audio" || t === "voice") {
                                  return (
                                    <div key={`${message.id}-att-${aIdx}`} className="space-y-1">
                                      <audio src={a.url} controls className="w-full" />
                                      <button
                                        type="button"
                                        className={`text-xs underline inline-flex items-center gap-1 ${isClient ? "text-blue-600" : "text-white"}`}
                                        onClick={() => openLink(a.url, a.name)}
                                      >
                                        Открыть аудио <ExternalLink size={12} />
                                      </button>
                                    </div>
                                  );
                                }
                                return (
                                  <a
                                    key={`${message.id}-att-${aIdx}`}
                                    href={a.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    download
                                    className={`underline ${isClient ? "text-blue-600" : "text-white"} flex items-center gap-1`}
                                  >
                                    <FileIcon className={isClient ? "text-gray-600" : "text-white"} size={16} />
                                    {a.name || "Файл"}
                                  </a>
                                );
                              })}
                            </div>
                            {message.text ? <p>{message.text}</p> : null}
                          </div>
                        ) : message.type === "photo" && message.url ? (
                          <div className="space-y-2">
                            <img
                              src={message.url}
                              alt={message.name || "image"}
                              className="rounded-md max-w-[400px] h-auto max-h-[420px] object-contain cursor-pointer"
                              onClick={() => openLink(message.url, message.name)}
                            />
                            {(message.text || message.caption) && <p>{message.text || message.caption}</p>}
                            <button
                              type="button"
                              className={`text-xs underline inline-flex items-center gap-1 ${isClient ? "text-blue-600" : "text-white"}`}
                              onClick={() => openLink(message.url, message.name)}
                            >
                              Открыть <ExternalLink size={12} />
                            </button>
                          </div>
                        ) : message.type === "video" && message.url ? (
                          <div className="space-y-2">
                            <video
                              src={message.url}
                              controls
                              className="rounded-md  max-w-[400px] h-auto max-h-[420px] object-contain"
                            />
                            {(message.text || message.caption) && <p>{message.text || message.caption}</p>}
                            <button
                              type="button"
                              className={`text-xs underline inline-flex items-center gap-1 ${isClient ? "text-blue-600" : "text-white"}`}
                              onClick={() => openLink(message.url, message.name)}
                            >
                              Открыть в новой вкладке <ExternalLink size={12} />
                            </button>
                          </div>
                        ) : (message.type === "voice" || message.type === "audio") && message.url ? (
                          <div className="space-y-2">
                            <audio
                              src={message.url}
                              controls
                              className="w-full"
                            />
                            {(message.text || message.caption) && <p>{message.text || message.caption}</p>}
                            <button
                              type="button"
                              className={`text-xs underline inline-flex items-center gap-1 ${isClient ? "text-blue-600" : "text-white"}`}
                              onClick={() => openLink(message.url, message.name)}
                            >
                              Открыть аудио <ExternalLink size={12} />
                            </button>
                          </div>
                        ) : message.type === "document" && message.url ? (
                          <div className="flex items-center gap-2">
                            <FileIcon className={isClient ? "text-gray-600" : "text-white"} size={18} />
                            <a
                              href={message.url}
                              target="_blank"
                              rel="noreferrer"
                              download
                              className={`underline ${isClient ? "text-blue-600" : "text-white"}`}
                            >
                              {message.name || message.text || "Документ"}
                            </a>
                          </div>
                        ) : (
                          <p>{message.text}</p>
                        )}

                        <p className={`text-xs mt-1 text-right ${isClient ? "text-gray-500" : "text-blue-100"}`}>
                          {message.time}
                        </p>
                      </div>

                      {!isClient && (
                        <Avatar className="h-8 w-8 ml-2">
                          <AvatarFallback className="bg-green-100 text-green-600">
                            {(selectedChat.operatorName || "").split(" ").map((n) => n?.[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  );
                })}
              </div>

              {selectedChat.status !== "completed" && (
                <div className="p-4 border-t">
                  <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                    <div className="flex-1 relative">
                      <Textarea
                        placeholder="Введите сообщение..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="min-h-[80px] pr-10"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage(e);
                          }
                        }}
                      />
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={(e) => handleFilesChosen(e.target.files)}
                        className="hidden"
                        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
                        multiple
                      />
                      <div className="absolute bottom-2 right-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-full"
                          onClick={() => fileInputRef.current && fileInputRef.current.click()}
                        >
                          <Paperclip className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <Button type="submit" className="h-10 w-10 p-0 rounded-full">
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              )}

              {selectedChat.status === "completed" && (
                <div className="p-4 border-t bg-gray-50">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <p className="text-sm font-medium">Тема:</p>
                      <p className="text-sm">{selectedChat.topic}</p>
                    </div>
                    <div className="flex justify-between">
                      <p className="text-sm font-medium">Рейтинг:</p>
                      <p className="text-sm">{selectedChat.rating}/5</p>
                    </div>
                    <div className="flex justify-between">
                      <p className="text-sm font-medium">Скорость ответа:</p>
                      <p className="text-sm">{selectedChat.responseTime}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Описание:</p>
                      <div className="text-sm bg-white p-2 border rounded-sm mt-1">
                        {selectedChat.description}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Tabs>

      {/* Передача */}
      <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen} modal>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Передача заявки</DialogTitle>
            <DialogDescription>
              Выберите оператора для передачи тикета {selectedChat?.id}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="operator">Оператор</Label>
              <Select value={selectedOperator} onValueChange={setSelectedOperator}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите оператора" />
                </SelectTrigger>
                <SelectContent>{/* список операторов при необходимости */}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTransferModalOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleTransferTicket}>Передать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Завершение тикета */}
      <Dialog open={isClosingTicket} onOpenChange={setIsClosingTicket} modal>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Завершение тикета</DialogTitle>
            <DialogDescription>
              Заполните информацию для завершения тикета {selectedChat?.id}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="topic">Тема проблемы</Label>
                <Button variant="outline" size="sm" onClick={() => setIsAddTopicModalOpen(true)}>
                  Добавить тему
                </Button>
              </div>
              <Select value={closingTopic} onValueChange={setClosingTopic} disabled={isLoadingTopics}>
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingTopics ? "Загрузка тем..." : "Выберите тему"} />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingTopics ? (
                    <SelectItem value="loading" disabled>
                      Загрузка...
                    </SelectItem>
                  ) : problemTopics.length > 0 ? (
                    problemTopics.map((topic) => (
                      <div key={topic.id} className="flex items-center justify-between px-2 py-1">
                        <SelectItem value={String(topic.id)}>{topic.problem_topic}</SelectItem>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-2 h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTopic(topic.id);
                          }}
                          disabled={deletingTopicId === topic.id}
                          title="Удалить тему"
                        >
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <SelectItem value="no-topics" disabled>
                      Нет доступных тем
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Описание проблемы</Label>
              <Textarea
                id="description"
                placeholder="Опишите проблему и способ её решения..."
                value={closingDescription}
                onChange={(e) => setClosingDescription(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsClosingTicket(false)}>
              Отмена
            </Button>
            <Button onClick={handleCloseTicket} disabled={isLoadingTopics}>
              Завершить тикет
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Добавление темы */}
      <Dialog open={isAddTopicModalOpen} onOpenChange={setIsAddTopicModalOpen} modal>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Добавить новую тему</DialogTitle>
            <DialogDescription>Введите название новой темы проблемы</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newTopic">Название темы</Label>
              <Input
                id="newTopic"
                placeholder="Введите тему"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                disabled={addTopicLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddTopicModalOpen(false)} disabled={addTopicLoading}>
              Отмена
            </Button>
            <Button onClick={handleAddTopic} disabled={addTopicLoading}>
              {addTopicLoading ? "Добавление..." : "Добавить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
