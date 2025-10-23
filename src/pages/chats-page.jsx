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
  ImageIcon,
  ChevronRight,
  StarOff,
  X,
  Phone,
  ArrowRight,
  History,
  Download,
} from "lucide-react";
import { Avatar, AvatarFallback } from "../components/ui/avatar";

// Константы
import { tokenName, socketUrl } from "../config/api";

// Обновленные события Socket.IO
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

// Функция для форматирования времени ответа с детальным выводом
const formatResponseTime = (minutes) => {
  const mins = parseInt(minutes) || 0;
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

export default function ChatsPage() {
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("activeTab") || "new";
  });
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
  const decoded = jwtDecode(localStorage.getItem(tokenName));
  const fileInputRef = useRef(null); // Added fileInputRef initialization

  // Сохранение activeTab в localStorage
  useEffect(() => {
    localStorage.setItem("activeTab", activeTab);
  }, [activeTab]);

  // Инициализация Socket.IO и запрос тем проблем
  useEffect(() => {
    const connectSocket = () => {
      const token = localStorage.getItem(tokenName);
      const headers = {
        token: token || "",
        "ngrok-skip-browser-warning": "true",
      };
      socketRef.current = io(socketUrl, {
        extraHeaders: headers,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 5000,
        forceNew: true,
      });
      const socket = socketRef.current;
      socket.on("connect", () => {
        ["new", "active", "completed"].forEach((status) => {
          const payload =
            status === "new" ? { status } : { status, operatorId: decoded.id };
          socket.emit(SOCKET_EVENTS.GET_CHATS, payload);
        });
        socket.emit(SOCKET_EVENTS.GET_CHAT_FAVORITE, { favorite: "true" });
        setIsLoadingTopics(true);
        socket.emit(SOCKET_EVENTS.GET_PROBLEM_TOPIC, {});
      });

      socket.on(SOCKET_EVENTS.GET_CHATS, (data) => {
        let tab = currentTabRef.current;
        let result = data.result || [];
        if (tab === "favorite") {
          result = result.filter((chat) => chat.isFavorite);
        }
        if (result && result.length > 0) {
          const mappedChats = result.map((chat, index) => {
            return {
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
                ? chat.messages.map((msg, msgIndex) => ({
                    id: msg.id || `msg_${msgIndex}`,
                    sender: msg.sender || "unknown",
                    text: msg.text || "",
                    time: msg.time
                      ? new Date(msg.time).toLocaleString("ru-RU", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "unknown",
                    type: msg.type || "text",
                    caption: msg.caption || null,
                    media_group_id: msg.media_group_id || null,
                    entities: msg.entities || [],
                    caption_entities: msg.caption_entities || [],
                  }))
                : [],
              isFavorite: chat.isFavorite || false,
              isAcknowledged: chat.isAcknowledged || false,
              user_id: chat.user_id || null,
              operatorId: Array.isArray(chat.operatorId)
                ? chat.operatorId
                : chat.operatorId || null,
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
              responseTime: chat.responseTime
                ? formatResponseTime(chat.responseTime)
                : "",
              topic: chat.topic || "",
              description: chat.description || "",
            };
          });
          setChats((prevChats) => ({
            ...prevChats,
            [tab]: mappedChats,
          }));
        } else {
          setChats((prevChats) => ({
            ...prevChats,
            [tab]: [],
          }));
        }
        if (selectedChat && result) {
          const updatedChat = result.find(
            (chat) => chat.id === selectedChat.id
          );
          if (updatedChat) {
            setSelectedChat({
              id: updatedChat.id,
              clientName: updatedChat.clientName,
              clientPhone: updatedChat.clientPhone,
              operatorName: Array.isArray(updatedChat.operatorName)
                ? updatedChat.operatorName.join(", ")
                : updatedChat.operatorName,
              date: new Date(updatedChat.date).toLocaleString("ru-RU", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }),
              endDate: updatedChat.endDate
                ? new Date(updatedChat.endDate).toLocaleDateString("ru-RU", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })
                : undefined,
              rating: updatedChat.rating || 0,
              responseTime: updatedChat.responseTime
                ? formatResponseTime(updatedChat.responseTime)
                : "",
              isFavorite: updatedChat.isFavorite || false,
              isAcknowledged: updatedChat.isAcknowledged || false,
              topic: updatedChat.topic || "",
              description: updatedChat.description || "",
              messages: Array.isArray(updatedChat.messages)
                ? updatedChat.messages.map((msg) => ({
                    id: msg.id,
                    sender: msg.sender,
                    text: msg.text,
                    time: new Date(msg.time).toLocaleString("ru-RU", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }),
                    type: msg.type,
                    caption: msg.caption,
                    media_group_id: msg.media_group_id,
                    entities: msg.entities,
                    caption_entities: msg.caption_entities,
                  }))
                : [],
              user_id: updatedChat.user_id,
              operatorId: Array.isArray(updatedChat.operatorId)
                ? updatedChat.operatorId
                : updatedChat.operatorId,
              UnreadMessage: updatedChat.UnreadMessage,
              readAt: updatedChat.readAt,
              status: updatedChat.status,
            });
          }
        }
      });
      socket.on(SOCKET_EVENTS.GET_CHAT_FAVORITE, (data) => {
        let favoriteChats = [];
        if (data && data.action === "get_chats" && Array.isArray(data.result)) {
          favoriteChats = data.result
            .filter((chat) => chat.isFavorite)
            .map((chat, index) => {
              return {
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
                  ? chat.messages.map((msg, msgIndex) => ({
                      id: msg.id || `msg_${msgIndex}`,
                      sender: msg.sender || "unknown",
                      text: msg.text || "",
                      time: msg.time
                        ? new Date(msg.time).toLocaleString("ru-RU", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "unknown",
                      type: msg.type || "text",
                      caption: msg.caption || null,
                      media_group_id: msg.media_group_id || null,
                      entities: msg.entities || [],
                      caption_entities: msg.caption_entities || [],
                    }))
                  : [],
                isFavorite: true,
                isAcknowledged: chat.isAcknowledged || false,
                user_id: chat.user_id || null,
                operatorId: Array.isArray(chat.operatorId)
                  ? chat.operatorId
                  : chat.operatorId || null,
                UnreadMessage: chat.UnreadMessage || 0,
                readAt: chat.readAt || null,
                status: chat.status || "completed",
                endDate: chat.endDate
                  ? new Date(chat.endDate).toLocaleDateString("ru-RU", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })
                  : "",
                rating: chat.rating || 0,
                responseTime: chat.responseTime
                  ? formatResponseTime(chat.responseTime)
                  : "",
                topic: chat.topic || "",
                description: chat.description || "",
              };
            });
        }
        const uniqueFavorite = [
          ...new Map(favoriteChats.map((item) => [item.id, item])).values(),
        ];
        setChats((prevChats) => ({
          ...prevChats,
          favorite: uniqueFavorite,
        }));
      });
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
            if (closingTopic === data.id.toString()) {
              setClosingTopic("");
            }
          } else {
            toast.error("Ошибка при удалении темы");
          }
        } else {
          toast.error("Ошибка: Неверный ответ сервера");
        }
      });
      socket.on(SOCKET_EVENTS.USER_CHAT, (data) => {});
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
        if (
          data &&
          data.action === "close_ticket" &&
          data.result === "successfully"
        ) {
          toast.success("Тикет успешно закрыт");
        }
      });
      socket.on(SOCKET_EVENTS.TOGGLE_FAVORITE, (data) => {});
      socket.on("connect_error", (error) => {
        setIsLoadingTopics(false);
      });
      socket.on("disconnect", () => {
        setIsLoadingTopics(false);
      });
    };
    connectSocket();
    return () => {
      if (socketRef.current) {
        socketRef.current.off(SOCKET_EVENTS.GET_PROBLEM_TOPICS);
        socketRef.current.off(SOCKET_EVENTS.DELETE_PROBLEM_TOPIC);
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Запрос тем проблем при открытии модального окна завершения тикета
  useEffect(() => {
    if (isClosingTicket && socketRef.current) {
      setIsLoadingTopics(true);
      socketRef.current.emit(SOCKET_EVENTS.GET_PROBLEM_TOPIC, {});
    }
  }, [isClosingTicket]);

  // Запрос чатов при смене вкладки
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
            : { status: activeTab, operatorId: decoded.id };
        socketRef.current.emit(SOCKET_EVENTS.GET_CHATS, payload);
      }
      currentTabRef.current = activeTab;
    }
  }, [activeTab]);

  // Функция для отправки сообщения с поддержкой вложений
  const sendMessage = (chatId, message, files = []) => {
    if (socketRef.current) {
      const token = localStorage.getItem(tokenName);
      const attachments = files.map((file) => ({
        type: file.type.startsWith("image/") ? "image" : "file",
        name: file.name,
        url: URL.createObjectURL(file),
      }));
      socketRef.current.emit("send_operator_message", {
        token,
        user_id: selectedChat.user_id,
        text: message || "",
        attachments,
      });
    }
  };

  // Функция для подтверждения открытия чата
  const acknowledgeChat = (chatId) => {
    if (socketRef.current) {
      socketRef.current.emit("acknowledge_chat", { chatId });
    }
  };

  // Функция для удаления темы
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

  // Функция для фильтрации чатов (упрощена, т.к. фильтры удалены)
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
      // Immediately move chat from "new" to "active" upon reading
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
      setActiveTab("active"); // Switch to active tab immediately
    } else if (chat.status === "active" && socketRef.current) {
      const token = localStorage.getItem(tokenName);
      socketRef.current.emit(SOCKET_EVENTS.READ_MESSAGE, {
        user_id: chat.user_id,
        token: token,
        status: "active",
      });
      setChats((prevChats) => {
        const updatedChats = prevChats[activeTab].map((c) =>
          c.id === chat.id
            ? { ...c, UnreadMessage: 0, isAcknowledged: true }
            : c
        );
        return { ...prevChats, [activeTab]: updatedChats };
      });
    }
  };

  const handleTransferTicket = () => {
    if (!selectedOperator) {
      return;
    }
    const updatedChat = { ...selectedChat };
    updatedChat.operatorName = "";
    updatedChat.operatorId = selectedOperator;
    setChats((prevChats) => {
      const chatIndex = prevChats[activeTab].findIndex(
        (chat) => chat.id === selectedChat.id
      );
      if (chatIndex !== -1) {
        const updatedChats = [...prevChats[activeTab]];
        updatedChats[chatIndex] = updatedChat;
        return { ...prevChats, [activeTab]: updatedChats };
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
    if (!newMessage.trim() && !fileInputRef.current?.files?.length) {
      return;
    }
    const updatedChat = { ...selectedChat };
    const newMsg = {
      id: updatedChat.messages.length + 1,
      sender: "operator",
      text: newMessage,
      time: new Date().toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      type: "text",
      caption: null,
      media_group_id: null,
      entities: [],
      caption_entities: [],
    };
    updatedChat.messages = [...updatedChat.messages, newMsg];
    if (activeTab === "new") {
      setChats((prevChats) => {
        const newChats = prevChats.new.filter(
          (chat) => chat.id !== selectedChat.id
        );
        return {
          ...prevChats,
          new: newChats,
          active: [
            ...prevChats.active,
            {
              ...updatedChat,
              status: "active",
              isFavorite: updatedChat.isFavorite || false,
            },
          ],
        };
      });
      setActiveTab("active");
    } else {
      setChats((prevChats) => {
        const chatIndex = prevChats[activeTab].findIndex(
          (chat) => chat.id === selectedChat.id
        );
        if (chatIndex !== -1) {
          const updatedChats = [...prevChats[activeTab]];
          updatedChats[chatIndex] = updatedChat;
          return { ...prevChats, [activeTab]: updatedChats };
        }
        return prevChats;
      });
    }
    setSelectedChat(updatedChat);
    const files = fileInputRef.current?.files || [];
    sendMessage(selectedChat.id, newMessage, Array.from(files));
    setNewMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCloseTicket = () => {
    if (!closingTopic || !closingDescription) {
      toast.error("Заполните тему и описание");
      return;
    }
    const updatedChat = { ...selectedChat };
    updatedChat.topic =
      problemTopics.find((t) => t.id === parseInt(closingTopic))
        ?.problem_topic || "";
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
      const activeChats = prevChats.active.filter(
        (chat) => chat.id !== selectedChat.id
      );
      const updatedFavorite = updatedChat.isFavorite
        ? prevChats.favorite.map((chat) =>
            chat.id === updatedChat.id ? updatedChat : chat
          )
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
        topic: parseInt(closingTopic),
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
          const chatIndex = prevChats[activeTab].findIndex(
            (c) => c.id === chat.id
          );
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
        const updatedFavorite = prevChats.favorite.filter(
          (c) => c.id !== chat.id
        );
        const originalTab = chat.status;
        if (
          originalTab === "new" ||
          originalTab === "active" ||
          originalTab === "completed"
        ) {
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
              <Badge className="ml-2 bg-yellow-500">{chats.favorite.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>
        <div className="flex h-[calc(100vh-220px)]">
          <div
            className={`w-full ${
              isChatOpen ? "hidden md:block md:w-1/3" : ""
            } border rounded-lg overflow-hidden`}
          >
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
                      {filteredChats.length > 0 ? (
                        filteredChats.map((chat) => (
                          <TableRow
                            key={chat.id}
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => handleOpenChat(chat)}
                          >
                            <TableCell className="font-medium">{chat.id}</TableCell>
                            <TableCell>{chat.clientName}</TableCell>
                            <TableCell>{chat.clientPhone}</TableCell>
                            <TableCell>{chat.date}</TableCell>
                            <TableCell>
                              <Badge className="bg-red-500">
                                {chat.UnreadMessage > 0 ? chat.UnreadMessage : 0}
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
                      {filteredChats.length > 0 ? (
                        filteredChats.map((chat) => (
                          <TableRow
                            key={chat.id}
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={(e) => {
                              if (e.target.closest(".favorite-button")) return;
                              handleOpenChat(chat);
                            }}
                          >
                            <TableCell className="font-medium">{chat.id}</TableCell>
                            <TableCell>{chat.clientName}</TableCell>
                            <TableCell>{chat.clientPhone}</TableCell>
                            <TableCell>{chat.operatorName}</TableCell>
                            <TableCell>{chat.date}</TableCell>
                            <TableCell>
                              <Badge className="bg-red-500">
                                {chat.UnreadMessage > 0 ? chat.UnreadMessage : 0}
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
                      {filteredChats.length > 0 ? (
                        filteredChats.map((chat) => (
                          <TableRow
                            key={chat.id}
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={(e) => {
                              if (e.target.closest(".favorite-button")) return;
                              handleOpenChat(chat);
                            }}
                          >
                            <TableCell className="font-medium">{chat.id}</TableCell>
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
                      {filteredChats.length > 0 ? (
                        filteredChats.map((chat) => (
                          <TableRow
                            key={chat.id}
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={(e) => {
                              if (e.target.closest(".favorite-button")) return;
                              handleOpenChat(chat);
                            }}
                          >
                            <TableCell className="font-medium">{chat.id}</TableCell>
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
              <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
                {selectedChat.messages?.map((message) => (
                  <div
                    key={message.id}
                    className={`mb-4 flex ${
                      message.sender === "client"
                        ? "justify-start"
                        : "justify-end"
                    }`}
                  >
                    {message.sender === "client" && (
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
                        message.sender === "client"
                          ? "bg-white text-gray-800 border"
                          : "bg-blue-500 text-white"
                      }`}
                    >
                      <p>{message.text}</p>
                      <p
                        className={`text-xs mt-1 text-right ${
                          message.sender === "client"
                            ? "text-gray-500"
                            : "text-blue-100"
                        }`}
                      >
                        {message.time}
                      </p>
                    </div>
                    {message.sender === "operator" && (
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
                ))}
              </div>
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
                        onChange={(e) => handleSendMessage(e)}
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx"
                        multiple
                      />
                      <div className="absolute bottom-2 right-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-full"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Paperclip className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <Button
                      type="submit"
                      className="h-10 w-10 p-0 rounded-full"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              )}
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
              <Select
                value={selectedOperator}
                onValueChange={setSelectedOperator}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите оператора" />
                </SelectTrigger>
                <SelectContent>
                  {/* Операторы удалены по запросу */}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsTransferModalOpen(false)}
            >
              Отмена
            </Button>
            <Button onClick={handleTransferTicket}>Передать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
                    placeholder={
                      isLoadingTopics ? "Загрузка тем..." : "Выберите тему"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingTopics ? (
                    <SelectItem value="loading" disabled>
                      Загрузка...
                    </SelectItem>
                  ) : problemTopics.length > 0 ? (
                    problemTopics.map((topic) => (
                      <div
                        key={topic.id}
                        className="flex items-center justify-between px-2 py-1"
                      >
                        <SelectItem value={topic.id.toString()}>
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
            <Button
              variant="outline"
              onClick={() => setIsAddTopicModalOpen(false)}
            >
              Отмена
            </Button>
            <Button onClick={handleAddTopic}>Добавить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}