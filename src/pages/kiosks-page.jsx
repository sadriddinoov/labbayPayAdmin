"use client";

import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "../components/ui/tooltip";
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
  Eye,
  CheckCircle,
  XCircle,
  Plus,
  Edit,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useCustomGet } from "../hooks/useCustomGet";
import { useCustomPost } from "../hooks/useCustomPost";
import { endpoints } from "../config/endpoints";
import { toast } from "react-toastify";

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

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      {startPage > 1 && (
        <>
          <Button variant="outline" size="sm" onClick={() => onPageChange(1)}>
            1
          </Button>
          {startPage > 2 && <span className="text-gray-500">...</span>}
        </>
      )}
      {pages.map((page) => (
        <Button
          key={page}
          variant={currentPage === page ? "default" : "outline"}
          size="sm"
          onClick={() => onPageChange(page)}
        >
          {page}
        </Button>
      ))}
      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && (
            <span className="text-gray-500">...</span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
          >
            {totalPages}
          </Button>
        </>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default function KiosksPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLogs, setSelectedLogs] = useState(null);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [isCreateKioskModalOpen, setIsCreateKioskModalOpen] = useState(false);
  const [isEditKioskModalOpen, setIsEditKioskModalOpen] = useState(false);
  const [selectedKiosk, setSelectedKiosk] = useState(null);
  const [newKiosk, setNewKiosk] = useState({
    device_id: "",
    any_desk: "",
    region_id: "",
    branch_id: "",
    collector_id: "none",
    status: "ACTIVE",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [logsPage, setLogsPage] = useState(1);
  const itemsPerPage = 10;
  const logsPerPage = 7;

  const { data: kiosksResponse, isLoading: isKiosksLoading } = useCustomGet({
    key: "kiosks",
    endpoint: endpoints.kiosks,
    enabled: true,
  });

  const { data: regionsResponse } = useCustomGet({
    key: "regions",
    endpoint: endpoints.region,
    enabled: true,
  });

  const { data: branchesResponse } = useCustomGet({
    key: "branches",
    endpoint: endpoints.branch,
    enabled: true,
  });

  const { data: collectorsResponse } = useCustomGet({
    key: "collectors",
    endpoint: endpoints.kiosk,
    enabled: true,
  });

  const { mutate: createKiosk, isPending: isCreating } = useCustomPost({
    key: "kiosks",
    endpoint: endpoints.kiosk,
    onSuccess: () => {
      toast.success("Киоск успешно создан");
      setIsCreateKioskModalOpen(false);
      setNewKiosk({
        device_id: "",
        any_desk: "",
        region_id: "",
        branch_id: "",
        collector_id: "none",
        status: "ACTIVE",
      });
      queryClient.invalidateQueries(["kiosks"]);
    },
    onError: () => {
      toast.error("Ошибка при создании киоска");
    },
  });

  const { mutate: updateKiosk, isPending: isUpdating } = useCustomPost({
    key: "kiosks",
    endpoint: endpoints.kiosk,
    onSuccess: () => {
      toast.success("Киоск успешно обновлен");
      setIsEditKioskModalOpen(false);
      setSelectedKiosk(null);
      queryClient.invalidateQueries(["kiosks"]);
    },
    onError: (error) => {
      console.error("Update kiosk error:", error);
      toast.error("Ошибка при обновлении киоска");
    },
  });

  const collectors =
    collectorsResponse?.data?.data?.filter(
      (user) => user.role === "COLLECTOR" && user.name
    ) || [];

  const kiosksData =
    kiosksResponse?.data?.data?.map((kiosk) => {
      const totalChange = kiosk.kupyuraCount.reduce(
        (sum, denom) => sum + (denom.box || 0),
        0
      );
      const denominations = kiosk.kupyuraCount.map((denom) => ({
        value: `${denom.value.toLocaleString("ru-RU")} сум`,
        count: Math.floor(denom.box / denom.value),
      }));

      let collectorId = "none";
      if (kiosk.collector) {
        if (kiosk.collector.id) {
          collectorId = kiosk.collector.id.toString();
        } else if (kiosk.collector.name) {
          const matchingCollector = collectors.find(
            (c) => c.name === kiosk.collector.name
          );
          if (matchingCollector) {
            collectorId = matchingCollector.id.toString();
          }
        }
      }

      return {
        id: kiosk.code,
        apiId: kiosk.id,
        location: {
          region: kiosk.region.name,
          city: kiosk.region.name,
          district: "",
          address: "",
          full: kiosk.region.name,
        },
        status: kiosk.status === "ACTIVE" ? "Работает" : "Не работает",
        collector: kiosk.collector ? kiosk.collector.name : "Не задан",
        collector_id: collectorId,
        anydesk: kiosk.any_desk,
        collectionAccount: {
          cash: kiosk.userBalance?.balance
            ? `${Number(kiosk.userBalance.balance).toLocaleString("ru-RU")} сум`
            : "0 сум",
        },
        changeAccount: {
          cash: totalChange
            ? `${totalChange.toLocaleString("ru-RU")} сум`
            : "0 сум",
          denominations,
        },
        logs:
          kiosk.transaction.length > 0
            ? kiosk.transaction.map((tx) => ({
                time: new Date(tx.createdAt).toLocaleTimeString("ru-RU"),
                message:
                  tx.status === "CREATE"
                    ? `Успешная транзакция #${tx.id}`
                    : `Ошибка транзакции #${tx.id}`,
                type: tx.status === "CREATE" ? "success" : "error",
              }))
            : [],
      };
    }) || [];

  const filteredKiosks = kiosksData.filter(
    (kiosk) =>
      kiosk?.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      kiosk.location.full.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (kiosk.collector || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalKiosks = filteredKiosks.length;
  const totalKioskPages = Math.ceil(totalKiosks / itemsPerPage);
  const paginatedKiosks = filteredKiosks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalLogs = selectedLogs?.length || 0;
  const totalLogsPages = Math.ceil(totalLogs / logsPerPage);
  const paginatedLogs =
    selectedLogs?.slice((logsPage - 1) * logsPerPage, logsPage * logsPerPage) ||
    [];

  const getStatusBadge = (status) => {
    switch (status) {
      case "Работает":
        return <Badge className="bg-green-500">Работает</Badge>;
      case "Не работает":
        return <Badge className="bg-red-500">Не работает</Badge>;
      default:
        return <Badge className="bg-gray-500">Неизвестно</Badge>;
    }
  };

  const getLogIcon = (type) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Eye className="h-4 w-4 text-blue-500" />;
    }
  };

  const handleViewLogs = (kiosk) => {
    setSelectedLogs(kiosk.logs);
    setIsLogsModalOpen(true);
    setLogsPage(1);
  };

  const handleEditKiosk = (kiosk) => {
    console.log("handleEditKiosk called with kiosk:", kiosk);
    console.log("kiosksResponse:", kiosksResponse?.data?.data);

    const selectedKioskData = kiosksResponse?.data?.data?.find(
      (k) => k.code === kiosk.id
    );

    if (!selectedKioskData) {
      console.error("Kiosk not found in kiosksResponse:", kiosk.id);
      toast.error("Ошибка: Киоск не найден");
      return;
    }

    let collectorId = "none";
    if (selectedKioskData.collector) {
      if (selectedKioskData.collector.id) {
        collectorId = selectedKioskData.collector.id.toString();
      } else if (selectedKioskData.collector.name) {
        const matchingCollector = collectors.find(
          (c) => c.name === selectedKioskData.collector.name
        );
        if (matchingCollector) {
          collectorId = matchingCollector.id.toString();
        }
      }
    }

    const validCollectorId = collectors.some(
      (collector) => collector.id.toString() === collectorId
    )
      ? collectorId
      : "none";

    const kioskToEdit = {
      id: kiosk.id,
      apiId: selectedKioskData.id,
      region_id: selectedKioskData.region?.id?.toString() || "",
      branch_id: selectedKioskData.branch?.id?.toString() || "",
      collector_id: validCollectorId,
      any_desk: kiosk.anydesk || "",
      status: kiosk.status === "Работает" ? "ACTIVE" : "INACTIVE",
    };

    console.log(
      "Setting selectedKiosk:",
      kioskToEdit,
      "collectors:",
      collectors
    );
    setSelectedKiosk(kioskToEdit);
    setIsEditKioskModalOpen(true);
  };

  const handleCreateKiosk = () => {
    if (
      !newKiosk.device_id ||
      !newKiosk.any_desk ||
      !newKiosk.region_id ||
      !newKiosk.branch_id
    ) {
      toast.error("Заполните все обязательные поля");
      return;
    }

    const body = {
      login: "default_login",
      password: "default_password",
      role: "KIOSK",
      device_id: newKiosk.device_id,
      any_desk: newKiosk.any_desk,
      region_id: Number(newKiosk.region_id),
      branch_id: Number(newKiosk.branch_id),
      status: newKiosk.status,
      ...(newKiosk.collector_id &&
        newKiosk.collector_id !== "none" && {
          collector_id: Number(newKiosk.collector_id),
        }),
    };

    createKiosk({
      endpoint: endpoints.kiosk,
      body,
    });
  };

  const handleSaveKiosk = () => {
    if (
      !selectedKiosk.region_id ||
      !selectedKiosk.branch_id ||
      !selectedKiosk.any_desk
    ) {
      toast.error("Заполните все обязательные поля");
      return;
    }

    const body = {
      region_id: Number(selectedKiosk.region_id),
      branch_id: Number(selectedKiosk.branch_id),
      any_desk: selectedKiosk.any_desk,
      status: selectedKiosk.status,
      ...(selectedKiosk.collector_id &&
        selectedKiosk.collector_id !== "none" && {
          collector_id: Number(selectedKiosk.collector_id),
        }),
    };

    updateKiosk({
      endpoint: `${endpoints.kiosk}/${selectedKiosk.apiId}`,
      body,
      method: "put",
    });
  };

  if (isKiosksLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Киоски</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Поиск..."
              className="pl-8 w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={() => setIsCreateKioskModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Создать киоск
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Список киосков</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Локация</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Инкассатор</TableHead>
                <TableHead>AnyDesk</TableHead>
                <TableHead>Счет инкассации</TableHead>
                <TableHead>Счет сдачи</TableHead>
                <TableHead>Логи</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedKiosks.map((kiosk) => (
                <TableRow key={kiosk.id}>
                  <TableCell className="font-medium">{kiosk.id}</TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">
                            {kiosk.location.city}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{kiosk.location.full}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell>{getStatusBadge(kiosk.status)}</TableCell>
                  <TableCell>{kiosk.collector}</TableCell>
                  <TableCell>{kiosk.anydesk || "—"}</TableCell>
                  <TableCell>
                    <p className="font-medium">
                      {kiosk.collectionAccount.cash}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium">{kiosk.changeAccount.cash}</p>
                      {kiosk.changeAccount.denominations.length > 0 && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p
                                className={`text-sm cursor-help ${
                                  kiosk.changeAccount.denominations.some(
                                    (d) => d.count < 10
                                  )
                                    ? "text-red-500 font-semibold"
                                    : "text-gray-500"
                                }`}
                              >
                                {kiosk.changeAccount.denominations.length} типов
                                купюр
                                {kiosk.changeAccount.denominations.some(
                                  (d) => d.count < 10
                                ) && " ⚠️"}
                              </p>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="space-y-1">
                                <p className="font-medium">Типы купюр:</p>
                                {kiosk.changeAccount.denominations.map(
                                  (denom, idx) => (
                                    <p
                                      key={idx}
                                      className={
                                        denom.count < 10
                                          ? "text-red-500 font-semibold"
                                          : ""
                                      }
                                    >
                                      {denom.value}
                                    </p>
                                  )
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewLogs(kiosk)}
                    >
                      Посмотреть
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditKiosk(kiosk)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Редактировать
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {totalKiosks > itemsPerPage && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalKioskPages}
              onPageChange={setCurrentPage}
            />
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isCreateKioskModalOpen}
        onOpenChange={setIsCreateKioskModalOpen}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Создание нового киоска</DialogTitle>
            <DialogDescription>
              Заполните информацию для создания нового киоска
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Device ID</Label>
                <Input
                  value={newKiosk.device_id}
                  onChange={(e) =>
                    setNewKiosk({ ...newKiosk, device_id: e.target.value })
                  }
                  placeholder="Введите Device ID"
                  disabled={isCreating}
                />
              </div>
              <div className="space-y-2">
                <Label>AnyDesk</Label>
                <Input
                  value={newKiosk.any_desk}
                  onChange={(e) =>
                    setNewKiosk({ ...newKiosk, any_desk: e.target.value })
                  }
                  placeholder="123 456 789"
                  disabled={isCreating}
                />
              </div>
              <div className="space-y-2">
                <Label>Регион</Label>
                <Select
                  value={newKiosk.region_id}
                  onValueChange={(value) =>
                    setNewKiosk({ ...newKiosk, region_id: value })
                  }
                  disabled={isCreating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите регион" />
                  </SelectTrigger>
                  <SelectContent>
                    {regionsResponse?.data?.map((region) => (
                      <SelectItem key={region.id} value={region.id.toString()}>
                        {region.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Филиал</Label>
                <Select
                  value={newKiosk.branch_id}
                  onValueChange={(value) =>
                    setNewKiosk({ ...newKiosk, branch_id: value })
                  }
                  disabled={isCreating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите филиал" />
                  </SelectTrigger>
                  <SelectContent>
                    {branchesResponse?.data?.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id.toString()}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Статус</Label>
                <Select
                  value={newKiosk.status}
                  onValueChange={(value) =>
                    setNewKiosk({ ...newKiosk, status: value })
                  }
                  disabled={isCreating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите статус" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Работает</SelectItem>
                    <SelectItem value="INACTIVE">Не работает</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Коллектор</Label>
                <Select
                  value={newKiosk.collector_id}
                  onValueChange={(value) =>
                    setNewKiosk({ ...newKiosk, collector_id: value })
                  }
                  disabled={isCreating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите коллектора" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Не задан</SelectItem>
                    {collectors
                      .filter(
                        (collector) =>
                          collector.name && collector.status == "ACTIVE"
                      )
                      .map((collector) => (
                        <SelectItem
                          key={collector.id}
                          value={collector.id.toString()}
                        >
                          {collector.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="pt-8">
            <Button
              variant="outline"
              onClick={() => setIsCreateKioskModalOpen(false)}
              disabled={isCreating}
            >
              Отмена
            </Button>
            <Button onClick={handleCreateKiosk} disabled={isCreating}>
              {isCreating ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin h-5 w-5 mr-2"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                </span>
              ) : (
                "Создать"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isEditKioskModalOpen}
        onOpenChange={setIsEditKioskModalOpen}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Редактирование киоска {selectedKiosk?.id}</DialogTitle>
            <DialogDescription>Измените информацию о киоске</DialogDescription>
          </DialogHeader>
          {selectedKiosk && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Регион</Label>
                  <Select
                    value={selectedKiosk.region_id}
                    onValueChange={(value) =>
                      setSelectedKiosk({ ...selectedKiosk, region_id: value })
                    }
                    disabled={isUpdating}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите регион" />
                    </SelectTrigger>
                    <SelectContent>
                      {regionsResponse?.data?.map((region) => (
                        <SelectItem
                          key={region.id}
                          value={region.id.toString()}
                        >
                          {region.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Филиал</Label>
                  <Select
                    value={selectedKiosk.branch_id}
                    onValueChange={(value) =>
                      setSelectedKiosk({ ...selectedKiosk, branch_id: value })
                    }
                    disabled={isUpdating}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите филиал" />
                    </SelectTrigger>
                    <SelectContent>
                      {branchesResponse?.data?.map((branch) => (
                        <SelectItem
                          key={branch.id}
                          value={branch.id.toString()}
                        >
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Код AnyDesk</Label>
                  <Input
                    value={selectedKiosk.any_desk}
                    onChange={(e) =>
                      setSelectedKiosk({
                        ...selectedKiosk,
                        any_desk: e.target.value,
                      })
                    }
                    placeholder="123 456 789"
                    disabled={isUpdating}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Статус</Label>
                  <Select
                    value={selectedKiosk.status}
                    onValueChange={(value) =>
                      setSelectedKiosk({ ...selectedKiosk, status: value })
                    }
                    disabled={isUpdating}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите статус" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Работает</SelectItem>
                      <SelectItem value="INACTIVE">Не работает</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Инкассатор</Label>
                  <Select
                    value={selectedKiosk.collector_id}
                    onValueChange={(value) =>
                      setSelectedKiosk({
                        ...selectedKiosk,
                        collector_id: value,
                      })
                    }
                    disabled={isUpdating}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите коллектора" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Не задан</SelectItem>
                      {collectors
                        .filter(
                          (collector) =>
                            collector.name && collector.status == "ACTIVE"
                        )
                        .map((collector) => (
                          <SelectItem
                            key={collector.id}
                            value={collector.id.toString()}
                          >
                            {collector.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="pt-4">
            <Button
              variant="outline"
              onClick={() => setIsEditKioskModalOpen(false)}
              disabled={isUpdating}
            >
              Отмена
            </Button>
            <Button onClick={handleSaveKiosk} disabled={isUpdating}>
              {isUpdating ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin h-5 w-5 mr-2"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                </span>
              ) : (
                "Сохранить"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isLogsModalOpen} onOpenChange={setIsLogsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Логи</DialogTitle>
            <DialogDescription>
              Последние события и операции киоска
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {paginatedLogs.length > 0 ? (
              paginatedLogs.map((log, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg"
                >
                  {getLogIcon(log.type)}
                  <div className="flex-1">
                    <p className="font-medium">{log.message}</p>
                    <p className="text-sm text-gray-500">{log.time}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500">Логов нет</p>
            )}
          </div>
          {totalLogs > logsPerPage && (
            <Pagination
              currentPage={logsPage}
              totalPages={totalLogsPages}
              onPageChange={setLogsPage}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
