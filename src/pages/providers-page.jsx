"use client";

import React, { useState, useEffect } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Label } from "../components/ui/label";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  ImageIcon,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Checkbox } from "../components/ui/checkbox";
import { useCustomGet } from "../hooks/useCustomGet";
import { useCustomPost } from "../hooks/useCustomPost";
import { endpoints } from "../config/endpoints";
import { toast } from "react-toastify";

const colors = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#84cc16",
  "#6b7280",
];

const generateVendorId = () => {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
};

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

export default function ProvidersPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [isCreateProviderModalOpen, setIsCreateProviderModalOpen] =
    useState(false);
  const [isEditProviderModalOpen, setIsEditProviderModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [newProvider, setNewProvider] = useState({
    name: "",
    short_name: "",
    category_id: "",
    status: "ACTIVE",
    percent: 0,
    logo: "",
    api_key: "",
    bank_id: "",
  });
  const [newCategory, setNewCategory] = useState({
    title: "",
    key: "",
    logo: "",
  });
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data: providersResponse, isLoading: isProvidersLoading } =
    useCustomGet({
      key: ["vendors", currentPage, searchTerm, selectedCategories],
      endpoint: endpoints.vendor,
      params: {
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm || undefined,
        category_id:
          selectedCategories.length > 0
            ? selectedCategories.join(",")
            : undefined,
      },
      enabled: true,
    });

  const { data: categoriesResponse, isLoading: isCategoriesLoading } =
    useCustomGet({
      key: "categories",
      endpoint: endpoints.category,
      enabled: true,
    });

  const { data: banksResponse, isLoading: isBanksLoading } = useCustomGet({
    key: "banks",
    endpoint: endpoints.bank,
    enabled: true,
  });

  const { mutate: createProvider, isPending: isCreating } = useCustomPost({
    key: "vendors",
    endpoint: endpoints.vendor,
    onSuccess: () => {
      toast.success("Поставщик успешно создан");
      setIsCreateProviderModalOpen(false);
      setNewProvider({
        name: "",
        short_name: "",
        category_id: "",
        status: "ACTIVE",
        percent: 0,
        logo: "",
        api_key: "",
        bank_id: "",
      });
      queryClient.invalidateQueries(["vendors"]);
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message || "Ошибка при создании поставщика"
      );
    },
  });

  const { mutate: updateProvider, isPending: isUpdating } = useCustomPost({
    key: "vendors",
    endpoint: endpoints.vendor,
    onSuccess: () => {
      toast.success("Поставщик успешно обновлен");
      setIsEditProviderModalOpen(false);
      setSelectedProvider(null);
      queryClient.invalidateQueries(["vendors"]);
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message || "Ошибка при обновлении поставщика"
      );
    },
  });

  const { mutate: createCategory, isPending: isCreatingCategory } =
    useCustomPost({
      key: "categories",
      endpoint: endpoints.category,
      onSuccess: () => {
        toast.success("Категория успешно создана");
        setNewCategory({ title: "", key: "", logo: "" });
        queryClient.invalidateQueries(["categories"]);
        queryClient.invalidateQueries(["vendors"]);
        setIsLoadingCategories(false);
      },
      onError: (error) => {
        toast.error(
          error?.response?.data?.message || "Ошибка при создании категории"
        );
        setIsLoadingCategories(false);
      },
    });

  const { mutate: deleteCategory, isPending: isDeletingCategory } =
    useCustomPost({
      key: "categories",
      endpoint: endpoints.category,
      onSuccess: () => {
        toast.success("Категория успешно удалена");
        queryClient.invalidateQueries(["categories"]);
        queryClient.invalidateQueries(["vendors"]);
        setIsLoadingCategories(false);
      },
      onError: (error) => {
        toast.error(
          error?.response?.data?.message || "Ошибка при удалении категории"
        );
        setIsLoadingCategories(false);
      },
    });

  const providersData =
    providersResponse?.data?.map((vendor) => {
      const category = categoriesResponse?.data?.find(
        (cat) => cat.key === vendor.category_id
      );
      const bank = banksResponse?.data?.data?.find(
        (bank) => bank.id === vendor.bank_id
      );
      return {
        id: vendor.vendor_id.toString(),
        apiId: vendor.id,
        legalName: vendor.name,
        brandName: vendor.short_name,
        category: category ? category.title : "Неизвестно",
        status: "Активен",
        apiKey: vendor.api_key,
        logo: vendor.logo || "/placeholder.svg?height=40&width=40",
        percentage: vendor.percent,
        bankName: bank ? bank.title : "Неизвестно",
      };
    }) || [];

  const totalPages = providersResponse?.totalPage || 1;
  const paginatedProviders = providersData;

  const getStatusBadge = (status) => {
    return <Badge className="bg-green-500">{status}</Badge>;
  };

  const getCategoryBadge = (category, index) => {
    const color = colors[index % colors.length];
    return <Badge style={{ backgroundColor: color }}>{category}</Badge>;
  };

  const handleEditProvider = (provider) => {
    setSelectedProvider({
      apiId: provider.apiId,
      legalName: provider.legalName,
      brandName: provider.brandName,
      category_id:
        categoriesResponse?.data
          ?.find((cat) => cat.title === provider.category)
          ?.key?.toString() || "",
      status: "ACTIVE",
      percentage: provider.percentage,
      apiKey: provider.apiKey,
      logo: provider.logo,
      bank_id:
        banksResponse?.data?.data
          ?.find((bank) => bank.title === provider.bankName)
          ?.id?.toString() || "",
    });
    setIsEditProviderModalOpen(true);
  };

  const handleCreateProvider = () => {
    if (
      !newProvider.name ||
      !newProvider.short_name ||
      !newProvider.category_id ||
      !newProvider.percent ||
      !newProvider.api_key ||
      !newProvider.bank_id
    ) {
      toast.error("Заполните все обязательные поля");
      return;
    }

    const body = {
      vendor_id: generateVendorId(),
      name: newProvider.name,
      short_name: newProvider.short_name,
      category_id: Number(newProvider.category_id),
      status: newProvider.status,
      percent: Number(newProvider.percent),
      api_key: newProvider.api_key,
      logo: newProvider.logo || "/placeholder.svg?height=40&width=40",
      bank_id: Number(newProvider.bank_id),
    };

    createProvider({
      endpoint: endpoints.vendor,
      body,
    });
  };

  const handleSaveProvider = () => {
    if (
      !selectedProvider.legalName ||
      !selectedProvider.brandName ||
      !selectedProvider.category_id ||
      !selectedProvider.percentage ||
      !selectedProvider.apiKey ||
      !selectedProvider.bank_id
    ) {
      toast.error("Заполните все обязательные поля");
      return;
    }

    const body = {
      name: selectedProvider.legalName,
      short_name: selectedProvider.brandName,
      category_id: Number(selectedProvider.category_id),
      status: selectedProvider.status,
      percent: Number(selectedProvider.percentage),
      api_key: selectedProvider.apiKey,
      logo: selectedProvider.logo,
      bank_id: Number(selectedProvider.bank_id),
    };

    updateProvider({
      endpoint: `${endpoints.vendor}/${selectedProvider.apiId}`,
      body,
      method: "PUT",
    });
  };

  const handleAddCategory = () => {
    if (!newCategory.title || !newCategory.key || !newCategory.logo) {
      toast.error("Заполните все поля категории (название, ключ, логотип)");
      return;
    }

    setIsLoadingCategories(true);
    createCategory({
      endpoint: endpoints.category,
      body: {
        title: newCategory.title,
        key: Number(newCategory.key),
        logo: newCategory.logo,
        status: "ACTIVE",
      },
    });
  };

  const handleDeleteCategory = (categoryKey) => {
    setIsLoadingCategories(true);
    deleteCategory({
      endpoint: `${endpoints.category}/${categoryKey}`,
      body: {},
      method: "DELETE",
    });
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSearchTerm("");
    setCurrentPage(1);
  };

  const uniqueCategories = Array.from(
    new Set(providersData.map((p) => p.category))
  );

  if (isProvidersLoading || isCategoriesLoading || isBanksLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Поставщики</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Поиск по названию, категории..."
              className="pl-8 w-64"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? "bg-blue-50" : ""}
          >
            <Filter className="h-4 w-4 mr-2" />
            Фильтры
          </Button>
          <Button onClick={() => setIsCreateProviderModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Создать
          </Button>
        </div>
      </div>

      {showFilters && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Фильтры</CardTitle>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Очистить
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Категория</Label>
              <div className="border rounded-md p-2 max-h-32 overflow-y-auto">
                {uniqueCategories.map((category) => (
                  <div
                    key={category}
                    className="flex items-center space-x-2 py-1"
                  >
                    <Checkbox
                      id={`category-${category}`}
                      checked={selectedCategories.includes(category)}
                      onCheckedChange={(checked) => {
                        setCurrentPage(1);
                        if (checked) {
                          setSelectedCategories([
                            ...selectedCategories,
                            category,
                          ]);
                        } else {
                          setSelectedCategories(
                            selectedCategories.filter((c) => c !== category)
                          );
                        }
                      }}
                    />
                    <label
                      htmlFor={`category-${category}`}
                      className="text-sm cursor-pointer"
                    >
                      {category}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Список поставщиков</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Логотип</TableHead>
                <TableHead>Юр. название</TableHead>
                <TableHead>Бренд название</TableHead>
                <TableHead>Категория</TableHead>
                <TableHead>Процент</TableHead>
                <TableHead>API Ключ</TableHead>
                <TableHead>Банк</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProviders.map((provider, index) => (
                <TableRow key={provider.id}>
                  <TableCell>
                    <img
                      src={provider.logo}
                      alt={provider.brandName}
                      className="w-10 h-10 rounded-lg object-cover"
                      onError={(e) =>
                        (e.target.src = "/placeholder.svg?height=40&width=40")
                      }
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {provider.legalName}
                  </TableCell>
                  <TableCell>{provider.brandName}</TableCell>
                  <TableCell>
                    {getCategoryBadge(provider.category, index)}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-green-600">
                      {provider.percentage}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                      {provider.apiKey}
                    </code>
                  </TableCell>
                  <TableCell>{provider.bankName}</TableCell>
                  <TableCell>{getStatusBadge(provider.status)}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditProvider(provider)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Редактировать
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isCreateProviderModalOpen}
        onOpenChange={setIsCreateProviderModalOpen}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Создание нового поставщика</DialogTitle>
            <DialogDescription>
              Заполните информацию для добавления нового поставщика услуг
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="legalName">Юридическое название</Label>
                <Input
                  id="legalName"
                  placeholder="ООО 'Название компании'"
                  value={newProvider.name}
                  onChange={(e) =>
                    setNewProvider({ ...newProvider, name: e.target.value })
                  }
                  disabled={isCreating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brandName">Бренд название</Label>
                <Input
                  id="brandName"
                  placeholder="BrandName"
                  value={newProvider.short_name}
                  onChange={(e) =>
                    setNewProvider({
                      ...newProvider,
                      short_name: e.target.value,
                    })
                  }
                  disabled={isCreating}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Категория</Label>
                <div className="flex gap-2">
                  <Select
                    value={newProvider.category_id}
                    onValueChange={(value) =>
                      setNewProvider({ ...newProvider, category_id: value })
                    }
                    disabled={
                      isCreating || isCategoriesLoading || isLoadingCategories
                    }
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue
                        placeholder={
                          isCategoriesLoading || isLoadingCategories
                            ? "Загрузка..."
                            : "Выберите категорию"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {categoriesResponse?.data?.map((category) => (
                        <SelectItem
                          key={category.key}
                          value={category.key.toString()}
                        >
                          {category.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCategoryManager(true)}
                    disabled={
                      isCreating || isCategoriesLoading || isLoadingCategories
                    }
                  >
                    Управление
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank">Банк</Label>
                <Select
                  value={newProvider.bank_id}
                  onValueChange={(value) =>
                    setNewProvider({ ...newProvider, bank_id: value })
                  }
                  disabled={isCreating || isBanksLoading}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        isBanksLoading ? "Загрузка..." : "Выберите банк"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {banksResponse?.data?.data?.map((bank) => (
                      <SelectItem key={bank.id} value={bank.id.toString()}>
                        {bank.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Статус</Label>
                <Select
                  value={newProvider.status}
                  onValueChange={(value) =>
                    setNewProvider({ ...newProvider, status: value })
                  }
                  disabled={isCreating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите статус" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Активен</SelectItem>
                    <SelectItem value="INACTIVE">Неактивен</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="percentage">Процент комиссии (%)</Label>
                <Input
                  id="percentage"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="2.5"
                  value={newProvider.percent}
                  onChange={(e) =>
                    setNewProvider({
                      ...newProvider,
                      percent: Number.parseFloat(e.target.value) || 0,
                    })
                  }
                  disabled={isCreating}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Ключ</Label>
                <Input
                  id="apiKey"
                  placeholder="api_key_123456789"
                  value={newProvider.api_key}
                  onChange={(e) =>
                    setNewProvider({ ...newProvider, api_key: e.target.value })
                  }
                  disabled={isCreating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logo">Логотип</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="logo"
                    placeholder="URL логотипа"
                    value={newProvider.logo}
                    onChange={(e) =>
                      setNewProvider({ ...newProvider, logo: e.target.value })
                    }
                    disabled={isCreating}
                  />
                  <Button variant="outline" size="icon" disabled={isCreating}>
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  Рекомендуемый размер: 200x200px, формат: PNG, JPG
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateProviderModalOpen(false)}
              disabled={isCreating}
            >
              Отмена
            </Button>
            <Button onClick={handleCreateProvider} disabled={isCreating}>
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
        open={isEditProviderModalOpen}
        onOpenChange={setIsEditProviderModalOpen}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Редактирование поставщика</DialogTitle>
            <DialogDescription>
              Измените информацию о поставщике
            </DialogDescription>
          </DialogHeader>
          {selectedProvider && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Юридическое название</Label>
                  <Input
                    value={selectedProvider.legalName}
                    onChange={(e) =>
                      setSelectedProvider({
                        ...selectedProvider,
                        legalName: e.target.value,
                      })
                    }
                    disabled={isUpdating}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Бренд название</Label>
                  <Input
                    value={selectedProvider.brandName}
                    onChange={(e) =>
                      setSelectedProvider({
                        ...selectedProvider,
                        brandName: e.target.value,
                      })
                    }
                    disabled={isUpdating}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Категория</Label>
                  <div className="flex gap-2">
                    <Select
                      value={selectedProvider.category_id}
                      onValueChange={(value) =>
                        setSelectedProvider({
                          ...selectedProvider,
                          category_id: value,
                        })
                      }
                      disabled={
                        isUpdating || isCategoriesLoading || isLoadingCategories
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue
                          placeholder={
                            isCategoriesLoading || isLoadingCategories
                              ? "Загрузка..."
                              : "Выберите категорию"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {categoriesResponse?.data?.map((category) => (
                          <SelectItem
                            key={category.key}
                            value={category.key.toString()}
                          >
                            {category.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCategoryManager(true)}
                      disabled={
                        isUpdating || isCategoriesLoading || isLoadingCategories
                      }
                    >
                      Управление
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Банк</Label>
                  <Select
                    value={selectedProvider.bank_id}
                    onValueChange={(value) =>
                      setSelectedProvider({
                        ...selectedProvider,
                        bank_id: value,
                      })
                    }
                    disabled={isUpdating || isBanksLoading}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          isBanksLoading ? "Загрузка..." : "Выберите банк"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {banksResponse?.data?.data?.map((bank) => (
                        <SelectItem key={bank.id} value={bank.id.toString()}>
                          {bank.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Статус</Label>
                  <Select
                    value={selectedProvider.status}
                    onValueChange={(value) =>
                      setSelectedProvider({
                        ...selectedProvider,
                        status: value,
                      })
                    }
                    disabled={isUpdating}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите статус" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Активен</SelectItem>
                      <SelectItem value="INACTIVE">Неактивен</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Процент комиссии (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={selectedProvider.percentage}
                    onChange={(e) =>
                      setSelectedProvider({
                        ...selectedProvider,
                        percentage: Number.parseFloat(e.target.value) || 0,
                      })
                    }
                    disabled={isUpdating}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>API Ключ</Label>
                  <Input
                    value={selectedProvider.apiKey}
                    onChange={(e) =>
                      setSelectedProvider({
                        ...selectedProvider,
                        apiKey: e.target.value,
                      })
                    }
                    disabled={isUpdating}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Логотип</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="URL логотипа"
                      value={selectedProvider.logo}
                      onChange={(e) =>
                        setSelectedProvider({
                          ...selectedProvider,
                          logo: e.target.value,
                        })
                      }
                      disabled={isUpdating}
                    />
                    <Button variant="outline" size="icon" disabled={isUpdating}>
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditProviderModalOpen(false)}
              disabled={isUpdating}
            >
              Отмена
            </Button>
            <Button onClick={handleSaveProvider} disabled={isUpdating}>
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

      <Dialog open={showCategoryManager} onOpenChange={setShowCategoryManager}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Управление категориями</DialogTitle>
            <DialogDescription>
              Добавляйте или удаляйте категории поставщиков
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="categoryTitle">Название категории</Label>
              <Input
                id="categoryTitle"
                placeholder="Новая категория"
                value={newCategory.title}
                onChange={(e) =>
                  setNewCategory({ ...newCategory, title: e.target.value })
                }
                disabled={isCreatingCategory || isLoadingCategories}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoryKey">Ключ категории</Label>
              <Input
                id="categoryKey"
                type="number"
                placeholder="5344"
                value={newCategory.key}
                onChange={(e) =>
                  setNewCategory({ ...newCategory, key: e.target.value })
                }
                disabled={isCreatingCategory || isLoadingCategories}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoryLogo">Логотип категории</Label>
              <Input
                id="categoryLogo"
                placeholder="URL логотипа"
                value={newCategory.logo}
                onChange={(e) =>
                  setNewCategory({ ...newCategory, logo: e.target.value })
                }
                disabled={isCreatingCategory || isLoadingCategories}
              />
            </div>
            <Button
              onClick={handleAddCategory}
              disabled={isCreatingCategory || isLoadingCategories}
            >
              {isCreatingCategory || isLoadingCategories ? (
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
                <Plus className="h-4 w-4" />
              )}
            </Button>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {isLoadingCategories ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              ) : (
                categoriesResponse?.data?.map((category) => (
                  <div
                    key={category.key}
                    className="flex justify-between items-center p-2 bg-gray-50 rounded"
                  >
                    <span>{category.title}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCategory(category.key)}
                      className="text-red-500 hover:text-red-700"
                      disabled={isDeletingCategory || isLoadingCategories}
                    >
                      {isDeletingCategory && isLoadingCategories ? (
                        <svg
                          className="animate-spin h-4 w-4"
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
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowCategoryManager(false)}
              disabled={
                isCreatingCategory || isDeletingCategory || isLoadingCategories
              }
            >
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
