"use client";

import React, { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import { Avatar, AvatarFallback } from "../components/ui/avatar";

// Константы
import { tokenName, socketUrl } from "../config/api";

// События Socket.IO
const SOCKET_EVENTS = {
  GET_CHATS: "get_chats",
  GET_CHAT_FAVORITE: "get_chat_favorite",
  USER_CHAT: "user_chats",
  GET_PROBLEM_TOPIC: "get_problem_topic",
  GET_PROBLEM_TOPICS: "get_problem_topics",
  ADD_PROBLEM_TOPIC: "add_problem_topic",
  DELETE_PROBLEM_TOPIC: "delete_problem_topic",
  READ_MESSAGE: "read_messages",
  CLOSE_TICKET: "close_ticket",
  TOGGLE_FAVORITE: "toggle_favorite",
};

// Альтернативные имена события «новое сообщение» (если на бэке ивент называется иначе)
const NEW_MESSAGE_ALIASES = ["new_message", "operator_message", "chat_updated"];

// Форматирование времени ответа
const formatResponseTime = (minutes) => {
  const mins = parseInt(String(minutes), 10) || 0;
  const days = Math.floor(mins / 1440);
  const remainingMinutes = mins % 1440;
  const hours = Math.floor(remainingMinutes / 60);
  const remainingMins = remainingMinutes % 60;

  if (days > 0) {
    return `${days} ${days === 1 ? "день" : days < 5 ? "дня" : "дней"} ${hours} ${hours === 1 ? "час" : hours < 5 ? "часа" : "часов"} ${remainingMins} мин`;
  } else if (hours > 0) {
    return `${hours} ${hours === 1 ? "час" : hours < 5 ? "часа" : "часов"} ${remainingMins} мин`;
  }
  return `${mins} мин`;
};

// Нормализация входящего сообщения (поддержка attachments-группы)
const normalizeIncomingMessage = (msg = {}) => ({
  id: msg.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  sender:
    msg.sender ||
    (msg.isOperator || msg.from === "operator" || msg.sender === "operator"
      ? "operator"
      : "client"),
  text: msg.text || msg.caption || "",
  time: msg.time
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
      }),
  type:
    (Array.isArray(msg.attachments) && msg.attachments.length > 0)
      ? "attachments"
      : (msg.type ||
        (msg.photo || msg.image_url || msg.image || msg.file || msg.url
          ? (msg.mime && String(msg.mime).startsWith("image/") ? "image" : (msg.type || "file"))
          : "text")),
  caption: msg.caption || null,
  media_group_id: msg.media_group_id || null,
  entities: msg.entities || [],
  caption_entities: msg.caption_entities || [],
  url: msg.url || msg.file_url || msg.fileUrl || null,
  name: msg.name || msg.filename || null,
  attachments: Array.isArray(msg.attachments)
    ? msg.attachments
        .map((a) => ({
          type: a?.type?.startsWith?.("image") ? "image" : (a?.type || undefined),
          name: a?.name || a?.filename || "",
          url: a?.url || a?.file_url || a?.fileUrl || "",
        }))
        .filter((a) => a.url)
    : undefined,
});

export default function ChatsPage() {
  const [activeTab, setActiveTab] = useState(
    () => localStorage.getItem("activeTab") || "new"
  );
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
  const [problemTopics, setProblemTopics] = useState([]);
  const [isAddTopicModalOpen, setIsAddTopicModalOpen] = useState(false);
  const [newTopic, setNewTopic] = useState("");
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);

  const socketRef = useRef(null);
  const currentTabRef = useRef(localStorage.getItem("activeTab") || "new");
  const fileInputRef = useRef(null);
  const messagesRef = useRef(null);

  const tokenVal =
    typeof window !== "undefined" ? localStorage.getItem(tokenName) : null;
  const decoded = tokenVal ? jwtDecode(tokenVal) : {};

  const scrollToBottom = () => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  useEffect(() => {
    localStorage.setItem("activeTab", activeTab);
  }, [activeTab]);

  // Подключение сокета и подписки
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

      socket.on("connect", () => {
        const currentTab = currentTabRef.current;
        if (currentTab === "favorite") {
          socket.emit(SOCKET_EVENTS.GET_CHAT_FAVORITE, { favorite: "true" });
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

      // Realtime входящие сообщения
      const onIncomingMessage = (data) => {
        const payload = data && data.result != null ? data.result : data;
        const user_id =
          (payload && (payload.user_id || payload.userId)) ||
          (payload && payload.chat && payload.chat.user_id);

        if (!user_id) return;

        let incomingArray = [];
        if (payload && Array.isArray(payload.messages)) {
          incomingArray = payload.messages;
        } else if (payload && payload.message) {
          incomingArray = [payload.message];
        } else if (
          payload &&
          (payload.text || payload.caption || payload.url || payload.attachments)
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

      socket.on(SOCKET_EVENTS.USER_CHAT, onIncomingMessage);
      NEW_MESSAGE_ALIASES.forEach((evt) => socket.on(evt, onIncomingMessage));

      // -------- FIX 2: Защищаем favorite от перезаписи из GET_CHATS --------
      socket.on(SOCKET_EVENTS.GET_CHATS, (data) => {
        const tabNow = currentTabRef.current;
        if (tabNow === "favorite") return; // не трогаем вкладку избранного

        const result = Array.isArray(data?.result) ? data.result : [];
        const tab = tabNow; // не «угадываем» статус из данных

        const mappedChats = result.map((chat, index) => ({
          id: chat.id || `unknown_${index}`,
          clientName: chat.clientName || "Неизвестный клиент",
          clientPhone: chat.clientPhone || "Неизвестный номер",
          operatorName: Array.isArray(chat.operatorName)
            ? chat.operatorName.join(", ")
            : chat.operatorName || "Неизвестный оператор",
          date: chat.date
            ? new Date(chat.date).toLocaleString("ru-RU", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Неизвестная дата",
          messageCount: chat.messageCount || 0,
          messages: Array.isArray(chat.messages)
            ? chat.messages.map((msg, msgIndex) =>
                normalizeIncomingMessage({ ...msg, id: msg.id || `msg_${msgIndex}` })
              )
            : [],
          isFavorite: !!chat.isFavorite,
          isAcknowledged: chat.isAcknowledged || false,
          user_id: chat.user_id || null,
          operatorId: Array.isArray(chat.operatorId) ? chat.operatorId : chat.operatorId || null,
          UnreadMessage: chat.UnreadMessage || 0,
          readAt: chat.readAt || null,
          status: chat.status || tab,
          endDate: chat.endDate
            ? new Date(chat.endDate).toLocaleDateString("ru-RU", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })
            : "",
          rating: chat.rating || 0,
          responseTime: chat.responseTime ? formatResponseTime(chat.responseTime) : "",
          topic: chat.topic || "",
          description: chat.description || "",
        }));

        setChats((prev) => ({ ...prev, [tab]: mappedChats }));
      });

      // -------- FIX 1: Правильный парсинг GET_CHAT_FAVORITE --------
      socket.on(SOCKET_EVENTS.GET_CHAT_FAVORITE, (data) => {
        const list = Array.isArray(data?.result) ? data.result : [];

        const mapped = list
          .filter((chat) => chat?.isFavorite)
          .map((chat, index) => ({
            id: chat.id || `unknown_${index}`,
            clientName: chat.clientName || "Неизвестный клиент",
            clientPhone: chat.clientPhone || "Неизвестный номер",
            operatorName: Array.isArray(chat.operatorName)
              ? chat.operatorName.join(", ")
              : chat.operatorName || "Неизвестный оператор",
            date: chat.date
              ? new Date(chat.date).toLocaleString("ru-RU", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Неизвестная дата",
            messageCount: chat.messageCount || 0,
            messages: Array.isArray(chat.messages)
              ? chat.messages.map((msg, msgIndex) =>
                  normalizeIncomingMessage({ ...msg, id: msg.id || `msg_${msgIndex}` })
                )
              : [],
            isFavorite: true,
            isAcknowledged: chat.isAcknowledged || false,
            user_id: chat.user_id || null,
            operatorId: Array.isArray(chat.operatorId) ? chat.operatorId : chat.operatorId || null,
            UnreadMessage: chat.UnreadMessage || 0,
            readAt: chat.readAt || null,
            status: "favorite", // фикс: явно помечаем как favorite
            endDate: chat.endDate
              ? new Date(chat.endDate).toLocaleDateString("ru-RU", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })
              : "",
            rating: chat.rating || 0,
            responseTime: chat.responseTime ? formatResponseTime(chat.responseTime) : "",
            topic: chat.topic || "",
            description: chat.description || "",
          }));

        const unique = [...new Map(mapped.map((c) => [c.id, c])).values()];
        setChats((prev) => ({ ...prev, favorite: unique }));
      });

      // Темы проблем
      socket.on(SOCKET_EVENTS.GET_PROBLEM_TOPICS, (data) => {
        setIsLoadingTopics(false);
        if (data && Array.isArray(data.result)) {
          const topics = data.result.map((topic, index) => ({
            id: topic.id || `temp_${index}`,
            problem_topic: topic.problem_topic || "Без названия",
            requested_date: topic.requested_date || new Date().toISOString(),
          }));
          setProblemTopics(topics);
        } else {
          setProblemTopics([]);
          toast.error("Не удалось загрузить темы проблем");
        }
      });

      socket.on(SOCKET_EVENTS.ADD_PROBLEM_TOPIC, (data) => {
        if (data && data.action === "add_problem_topic") {
          if (data.result === "successfully") {
            toast.success("Тема успешно добавлена");
            setIsLoadingTopics(true);
            socket.emit(SOCKET_EVENTS.GET_PROBLEM_TOPIC, {});
            setIsAddTopicModalOpen(false);
            setNewTopic("");
          } else if (data.result === "this topic already exists") {
            toast.error("Такая тема уже существует");
          } else {
            toast.error("Ошибка при добавлении темы");
          }
        } else {
          toast.error("Ошибка: Неверный ответ сервера");
        }
      });

      socket.on(SOCKET_EVENTS.DELETE_PROBLEM_TOPIC, (data) => {
        if (data && data.action === "delete_problem_topic") {
          if (data.result === "deleted successfully") {
            toast.success("Тема успешно удалена");
            setIsLoadingTopics(true);
            socket.emit(SOCKET_EVENTS.GET_PROBLEM_TOPIC, {});
            if (String(closingTopic) === String(data.id)) {
              setClosingTopic("");
            }
          } else {
            toast.error("Ошибка при удалении темы");
          }
        } else {
          toast.error("Ошибка: Неверный ответ сервера");
        }
      });

      socket.on(SOCKET_EVENTS.READ_MESSAGE, (data) => {
        if (data && data.user_id) {
          setChats((prevChats) => {
            const updatedChats = Object.keys(prevChats).reduce((acc, tab) => {
              acc[tab] = prevChats[tab].map((chat) =>
                chat.user_id === data.user_id
                  ? { ...chat, UnreadMessage: 0, isAcknowledged: true }
                  : chat
              );
              return acc;
            }, {});
            return updatedChats;
          });
          if (selectedChat && selectedChat.user_id === data.user_id) {
            setSelectedChat((prev) => ({
              ...prev,
              UnreadMessage: 0,
              isAcknowledged: true,
            }));
          }
        }
      });

      socket.on(SOCKET_EVENTS.CLOSE_TICKET, (data) => {
        if (data && data.action === "close_ticket" && data.result === "successfully") {
          toast.success("Тикет успешно закрыт");
        }
      });

      socket.on("connect_error", () => setIsLoadingTopics(false));
      socket.on("disconnect", () => setIsLoadingTopics(false));
    };

    connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.off(SOCKET_EVENTS.GET_PROBLEM_TOPICS);
        socketRef.current.off(SOCKET_EVENTS.DELETE_PROBLEM_TOPIC);
        socketRef.current.off(SOCKET_EVENTS.USER_CHAT);
        NEW_MESSAGE_ALIASES.forEach((evt) =>
          socketRef.current.off(evt)
        );
        socketRef.current.disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Автоскролл при появлении новых сообщений
  useEffect(() => {
    scrollToBottom();
  }, [selectedChat?.messages?.length]);

  // При открытии модалки завершения — запрос тем
  useEffect(() => {
    if (isClosingTicket && socketRef.current) {
      setIsLoadingTopics(true);
      socketRef.current.emit(SOCKET_EVENTS.GET_PROBLEM_TOPIC, {});
    }
  }, [isClosingTicket]);

  // При смене вкладки — запрос чатов нужного статуса
  useEffect(() => {
    setIsChatOpen(false);
    setSelectedChat(null);
    if (socketRef.current) {
      if (activeTab === "favorite") {
        socketRef.current.emit(SOCKET_EVENTS.GET_CHAT_FAVORITE, {
          favorite: "true",
        });
      } else {
        const payload =
          activeTab === "new"
            ? { status: activeTab }
            : { status: activeTab, operatorId: decoded?.id };
        socketRef.current.emit(SOCKET_EVENTS.GET_CHATS, payload);
      }
      currentTabRef.current = activeTab;
    }
  }, [activeTab, decoded?.id]);

  // ===== УТИЛИТЫ: чтение файлов в dataURL и отправка =====

  const readFileAsDataURL = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });

  // Отправка ТОЛЬКО текста (кнопка/Enter)
  const sendTextMessage = (text) => {
    if (!socketRef.current || !selectedChat) return;
    const token = localStorage.getItem(tokenName) || "";

    const payload = {
      token,
      user_id: selectedChat.user_id,
      text, // только текст — по контракту
    };

    // оптимистично в UI
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
    const updatedChat = {
      ...selectedChat,
      messages: [...(selectedChat?.messages || []), optimistic],
    };
    setSelectedChat(updatedChat);
    setChats((prev) => {
      const idx = prev[activeTab].findIndex((c) => c.id === selectedChat.id);
      if (idx === -1) return prev;
      const arr = [...prev[activeTab]];
      arr[idx] = updatedChat;
      return { ...prev, [activeTab]: arr };
    });

    socketRef.current.emit("send_operator_message", payload);
  };

  // Авто-отправка файлов (как только выбрали)
  const handleFilesChosen = async (fileList) => {
    if (!socketRef.current || !selectedChat) return;
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    try {
      const dataURLs = await Promise.all(files.map(readFileAsDataURL));

      const attachments = files.map((f, i) => {
        const isImg = f.type && f.type.startsWith("image/");
        if (isImg) {
          return { type: "image", name: f.name, url: dataURLs[i] };
        }
        return { name: f.name, url: dataURLs[i] };
      });

      const token = localStorage.getItem(tokenName) || "";
      const caption = newMessage.trim();

      const payload = {
        token,
        user_id: selectedChat.user_id,
        attachments,
        text: caption,
      };

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
      const updatedChat = {
        ...selectedChat,
        messages: [...(selectedChat?.messages || []), optimistic],
      };
      setSelectedChat(updatedChat);
      setChats((prev) => {
        const idx = prev[activeTab].findIndex((c) => c.id === selectedChat.id);
        if (idx === -1) return prev;
        const arr = [...prev[activeTab]];
        arr[idx] = updatedChat;
        return { ...prev, [activeTab]: arr };
      });

      socketRef.current.emit("send_operator_message", payload);

      setNewMessage("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) {
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
      socketRef.current.emit(SOCKET_EVENTS.DELETE_PROBLEM_TOPIC, {
        id: topicId,
      });
    }
  };

  const filteredChats = (chats[activeTab] || []).filter((chat) => {
    return (
      (chat.clientName || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (chat.clientPhone || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (chat.id || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleOpenChat = (chat) => {
    if (selectedChat && selectedChat.id === chat.id && isChatOpen) {
      setIsChatOpen(false);
      setSelectedChat(null);
      if (socketRef.current) {
        socketRef.current.emit("exitchat", { chatId: chat.id });
      }
      return;
    }
    setSelectedChat(chat);
    setIsChatOpen(true);
    acknowledgeChat(chat.id);

    if (chat.status === "new" && socketRef.current) {
      const token = localStorage.getItem(tokenName);
      socketRef.current.emit(SOCKET_EVENTS.READ_MESSAGE, {
        user_id: chat.user_id,
        token: token,
        status: "new",
      });
      setChats((prevChats) => {
        const newChats = prevChats.new.filter((c) => c.id !== chat.id);
        const updatedChat = {
          ...chat,
          status: "active",
          UnreadMessage: 0,
          isAcknowledged: true,
        };
        return {
          ...prevChats,
          new: newChats,
          active: [...prevChats.active, updatedChat],
        };
      });
      setActiveTab("active");
    } else if (chat.status === "active" && socketRef.current) {
      const token = localStorage.getItem(tokenName);
      socketRef.current.emit(SOCKET_EVENTS.READ_MESSAGE, {
        user_id: chat.user_id,
        token: token,
        status: "active",
      });
      setChats((prevChats) => {
        const updatedChats = prevChats[activeTab].map((c) =>
          c.id === chat.id ? { ...c, UnreadMessage: 0, isAcknowledged: true } : c
        );
        return { ...prevChats, [activeTab]: updatedChats };
      });
    }
  };

  const handleTransferTicket = () => {
    if (!selectedOperator) return;
    const updatedChat = { ...selectedChat, operatorName: "", operatorId: selectedOperator };
    setChats((prevChats) => {
      const chatIndex = prevChats[activeTab].findIndex(
        (c) => c.id === selectedChat.id
      );
      if (chatIndex !== -1) {
        const updated = [...prevChats[activeTab]];
        updated[chatIndex] = updatedChat;
        return { ...prevChats, [activeTab]: updated };
      }
      return prevChats;
    });
    setSelectedChat(updatedChat);
    if (socketRef.current) {
      socketRef.current.emit("transfer_ticket", {
        chatId: selectedChat.id,
        operatorId: selectedOperator,
      });
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
        active: activeChats,
        completed: [...prevChats.completed, updatedChat],
        favorite: updatedFavorite,
      };
    });

    if (socketRef.current) {
      socketRef.current.emit(SOCKET_EVENTS.CLOSE_TICKET, {
        user_id: selectedChat.user_id,
        topic: parseInt(String(closingTopic), 10),
        description: closingDescription,
      });
      socketRef.current.emit("exitchat", { chatId: selectedChat.id });
    }

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
        if (activeTab === "active" || activeTab === "completed") {
          const chatIndex = prevChats[activeTab].findIndex((c) => c.id === chat.id);
          if (chatIndex !== -1) {
            const updatedTabChats = [...prevChats[activeTab]];
            updatedTabChats[chatIndex] = updatedChat;
            updatedChats = { ...prevChats, [activeTab]: updatedTabChats };
          }
        }
        if (prevChats.favorite.some((c) => c.id === chat.id)) {
          return updatedChats;
        }
        const updatedFavorite = [...prevChats.favorite, updatedChat];
        return { ...updatedChats, favorite: updatedFavorite };
      });
      if (selectedChat && selectedChat.id === chat.id) {
        setSelectedChat(updatedChat);
      }
      if (socketRef.current) {
        socketRef.current.emit(SOCKET_EVENTS.TOGGLE_FAVORITE, {
          user_id: chat.user_id,
          isFavorite: true,
        });
      }
    } else if (activeTab === "favorite" && chat.isFavorite) {
      const updatedChat = { ...chat, isFavorite: false };
      setChats((prevChats) => {
        const updatedFavorite = prevChats.favorite.filter((c) => c.id !== chat.id);
        const originalTab = chat.status;
        if (originalTab === "new" || originalTab === "active" || originalTab === "completed") {
          const updatedTabChats = prevChats[originalTab].map((c) =>
            c.id === chat.id ? updatedChat : c
          );
          return {
            ...prevChats,
            favorite: updatedFavorite,
            [originalTab]: updatedTabChats,
          };
        }
        return { ...prevChats, favorite: updatedFavorite };
      });
      setSelectedChat(null);
      setIsChatOpen(false);
      if (socketRef.current) {
        socketRef.current.emit(SOCKET_EVENTS.TOGGLE_FAVORITE, {
          user_id: chat.user_id,
          isFavorite: false,
        });
      }
    }
  };

  const handleAddTopic = () => {
    if (!newTopic.trim()) {
      toast.error("Введите название темы");
      return;
    }
    if (socketRef.current) {
      socketRef.current.emit(SOCKET_EVENTS.ADD_PROBLEM_TOPIC, {
        problem_topic: newTopic,
      });
    }
  };

  return (
    <div className="h-full">
      <ToastContainer />
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Чаты - Звонки</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Поиск по имени, телефону, ID..."
              className="pl-8 w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 mb-6">
          <TabsTrigger value="new" className="relative">
            Новые
            {chats.new.length > 0 && (
              <Badge className="ml-2 bg-red-500">{chats.new.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="active" className="relative">
            Активные
            {chats.active.length > 0 && (
              <Badge className="ml-2 bg-blue-500">{chats.active.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">Завершенные</TabsTrigger>
          <TabsTrigger value="favorite" className="relative">
            Избранные
            {chats.favorite.length > 0 && (
              <Badge className="ml-2 bg-yellow-500">
                {chats.favorite.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <div className="flex h-[calc(100vh-220px)]">
          <div
            className={`w-full ${
              isChatOpen ? "hidden md:block md:w-1/3" : ""
            } border rounded-lg overflow-hidden`}
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
                        <TableHead>Дата</TableHead>
                        <TableHead>Сообщения</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredChats?.length > 0 ? (
                        filteredChats.map((chat) => (
                          <TableRow
                            key={chat.id}
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => handleOpenChat(chat)}
                          >
                            <TableCell className="font-medium">
                              {chat.id}
                            </TableCell>
                            <TableCell>{chat.clientName}</TableCell>
                            <TableCell>{chat.clientPhone}</TableCell>
                            <TableCell>{chat.date}</TableCell>
                            <TableCell>
                              <Badge className="bg-red-500">
                                {chat.UnreadMessage > 0
                                  ? chat.UnreadMessage
                                  : 0}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4">
                            Нет новых тикетов
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ACTIVE */}
            <TabsContent value="active" className="m-0 h-full">
              <Card className="border-0 rounded-none h-full">
                <CardHeader className="p-4">
                  <CardTitle className="text-lg">Активные тикеты</CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-auto h-[calc(100%-60px)]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>ФИО</TableHead>
                        <TableHead>Номер телефона</TableHead>
                        <TableHead>Оператор</TableHead>
                        <TableHead>Дата</TableHead>
                        <TableHead>Сообщения</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredChats?.length > 0 ? (
                        filteredChats.map((chat) => (
                          <TableRow
                            key={chat.id}
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={(e) => {
                              const target = e.target;
                              if (target && target.closest && target.closest(".favorite-button")) return;
                              handleOpenChat(chat);
                            }}
                          >
                            <TableCell className="font-medium">
                              {chat.id}
                            </TableCell>
                            <TableCell>{chat.clientName}</TableCell>
                            <TableCell>{chat.clientPhone}</TableCell>
                            <TableCell>{chat.operatorName}</TableCell>
                            <TableCell>{chat.date}</TableCell>
                            <TableCell>
                              <Badge className="bg-red-500">
                                {chat.UnreadMessage > 0
                                  ? chat.UnreadMessage
                                  : 0}
                              </Badge>
                            </TableCell>
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
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-4">
                            Нет активных тикетов
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
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
                        <TableHead>Оператор</TableHead>
                        <TableHead>Рейтинг</TableHead>
                        <TableHead>Скорость ответа</TableHead>
                        <TableHead>Дата начала</TableHead>
                        <TableHead>Дата завершения</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredChats?.length > 0 ? (
                        filteredChats.map((chat) => (
                          <TableRow
                            key={chat.id}
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={(e) => {
                              const target = e.target;
                              if (target && target.closest && target.closest(".favorite-button")) return;
                              handleOpenChat(chat);
                            }}
                          >
                            <TableCell className="font-medium">
                              {chat.id}
                            </TableCell>
                            <TableCell>{chat.clientName}</TableCell>
                            <TableCell>{chat.clientPhone}</TableCell>
                            <TableCell>{chat.operatorName}</TableCell>
                            <TableCell>{chat.rating}/5</TableCell>
                            <TableCell>{chat.responseTime}</TableCell>
                            <TableCell>{chat.date}</TableCell>
                            <TableCell>{chat.endDate}</TableCell>
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
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-4">
                            Нет завершенных тикетов
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
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
                        <TableHead>Оператор</TableHead>
                        <TableHead>Дата начала</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredChats?.length > 0 ? (
                        filteredChats.map((chat) => (
                          <TableRow
                            key={chat.id}
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={(e) => {
                              const target = e.target;
                              if (target && target.closest && target.closest(".favorite-button")) return;
                              handleOpenChat(chat);
                            }}
                          >
                            <TableCell className="font-medium">
                              {chat.id}
                            </TableCell>
                            <TableCell>{chat.clientName}</TableCell>
                            <TableCell>{chat.clientPhone}</TableCell>
                            <TableCell>{chat.operatorName}</TableCell>
                            <TableCell>{chat.date}</TableCell>
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
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-4">
                            Нет избранных тикетов
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </div>

          {/* Правая панель — чат */}
          {isChatOpen && selectedChat && (
            <div className="w-full md:w-2/3 border rounded-lg ml-0 md:ml-4 flex flex-col">
              <div className="p-4 border-b flex justify-between items-center">
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="md:hidden mr-2"
                    onClick={() => setIsChatOpen(false)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <div>
                    <h3 className="font-medium">{selectedChat.clientName}</h3>
                    <p className="text-sm text-gray-500">
                      {selectedChat.clientPhone}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!selectedChat.endDate && (
                    <>
                      {activeTab !== "new" && activeTab !== "completed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsClosingTicket(true)}
                        >
                          Завершить
                        </Button>
                      )}
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleFavorite(selectedChat)}
                  >
                    {selectedChat.isFavorite ? (
                      <Star className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <Star className="h-4 w-4 text-gray-300" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsChatOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Сообщения */}
              <div ref={messagesRef} className="flex-1 p-4 overflow-y-auto bg-gray-50">
                {selectedChat.messages?.map((message) => {
                  const isClient = message.sender === "client";
                  return (
                    <div
                      key={message.id}
                      className={`mb-4 flex ${isClient ? "justify-start" : "justify-end"}`}
                    >
                      {isClient && (
                        <Avatar className="h-8 w-8 mr-2">
                          <AvatarFallback className="bg-blue-100 text-blue-600">
                            {(selectedChat.clientName || "")
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                      )}

                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          isClient ? "bg-white text-gray-800 border" : "bg-blue-500 text-white"
                        }`}
                      >
                        {Array.isArray(message.attachments) && message.attachments.length > 0 ? (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              {message.attachments.map((a, idx) =>
                                a.type === "image" ? (
                                  <img
                                    key={idx}
                                    src={a.url}
                                    alt={a.name || "image"}
                                    className="rounded-md w-full h-auto"
                                  />
                                ) : (
                                  <a
                                    key={idx}
                                    href={a.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`underline ${isClient ? "text-blue-600" : "text-white"} flex items-center gap-1`}
                                  >
                                    <FileIcon className={isClient ? "text-gray-600" : "text-white"} size={16} />
                                    {a.name || "Файл"}
                                  </a>
                                )
                              )}
                            </div>
                            {message.text ? <p>{message.text}</p> : null}
                          </div>
                        ) : message.type === "image" && message.url ? (
                          <div className="space-y-2">
                            <img
                              src={message.url}
                              alt={message.name || "image"}
                              className="rounded-md max-w-full"
                            />
                            {(message.text || message.caption) && (
                              <p>{message.text || message.caption}</p>
                            )}
                          </div>
                        ) : message.type === "file" && message.url ? (
                          <div className="flex items-center gap-2">
                            <FileIcon className={isClient ? "text-gray-600" : "text-white"} size={18} />
                            <a
                              href={message.url}
                              target="_blank"
                              rel="noreferrer"
                              className={`underline ${isClient ? "text-blue-600" : "text-white"}`}
                            >
                              {message.name || message.text || "Файл"}
                            </a>
                          </div>
                        ) : (
                          <p>{message.text}</p>
                        )}

                        <p
                          className={`text-xs mt-1 text-right ${
                            isClient ? "text-gray-500" : "text-blue-100"
                          }`}
                        >
                          {message.time}
                        </p>
                      </div>

                      {!isClient && (
                        <Avatar className="h-8 w-8 ml-2">
                          <AvatarFallback className="bg-green-100 text-green-600">
                            {(selectedChat.operatorName || "")
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Ввод */}
              {!selectedChat.endDate && (
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
                        accept="image/*,.pdf,.doc,.docx"
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

              {/* Информация по закрытому тикету */}
              {selectedChat.endDate && (
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

      {/* Модалка передачи */}
      <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
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
                <SelectContent>
                  {/* Заполните при необходимости */}
                </SelectContent>
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

      {/* Модалка завершения */}
      <Dialog open={isClosingTicket} onOpenChange={setIsClosingTicket}>
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddTopicModalOpen(true)}
                >
                  Добавить тему
                </Button>
              </div>
              <Select
                value={closingTopic}
                onValueChange={setClosingTopic}
                disabled={isLoadingTopics}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={isLoadingTopics ? "Загрузка тем..." : "Выберите тему"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingTopics ? (
                    <SelectItem value="loading" disabled>
                      Загрузка...
                    </SelectItem>
                  ) : problemTopics.length > 0 ? (
                    problemTopics.map((topic) => (
                      <div key={topic.id} className="flex items-center justify-between px-2 py-1">
                        <SelectItem value={String(topic.id)}>
                          {topic.problem_topic}
                        </SelectItem>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-2 h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTopic(topic.id);
                          }}
                          disabled={!problemTopics.length}
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
                placeholder="Опишите проблему и способ ее решения..."
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

      {/* Модалка добавления темы */}
      <Dialog open={isAddTopicModalOpen} onOpenChange={setIsAddTopicModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Добавить новую тему</DialogTitle>
            <DialogDescription>
              Введите название новой темы проблемы
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newTopic">Название темы</Label>
              <Input
                id="newTopic"
                placeholder="Введите тему"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddTopicModalOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleAddTopic}>Добавить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
