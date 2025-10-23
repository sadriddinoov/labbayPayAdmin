"use client"

import { useState } from "react"
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Badge } from "../components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { Label } from "../components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs"
import { Search, Plus, User, Banknote, Edit, Calculator, ChevronLeft, ChevronRight } from "lucide-react"
import { useCustomGet } from '../hooks/useCustomGet';
import { useCustomPost } from '../hooks/useCustomPost';
import { endpoints } from '../config/endpoints';
import { toast } from 'react-toastify';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const maxPagesToShow = 5
  const pages = []
  const halfRange = Math.floor(maxPagesToShow / 2)

  let startPage = Math.max(1, currentPage - halfRange)
  let endPage = Math.min(totalPages, currentPage + halfRange)

  if (endPage - startPage + 1 < maxPagesToShow) {
    if (currentPage <= halfRange) {
      endPage = Math.min(totalPages, maxPagesToShow)
    } else if (currentPage + halfRange >= totalPages) {
      startPage = Math.max(1, totalPages - maxPagesToShow + 1)
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i)
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
          >
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
          {endPage < totalPages - 1 && <span className="text-gray-500">...</span>}
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
  )
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("")
  const [positionFilter, setPositionFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false)
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10 
  const [newUser, setNewUser] = useState({
    name: "",
    role: "ADMIN", // Default role set to ADMIN
    phone_number: "",
    login: "",
    password: "",
    status: "ACTIVE",
    device_id: "default_device",
    region_id: 1,
    branch_id: 1,
  })
  const [createUserTab, setCreateUserTab] = useState("admin") // Changed from "user" to "admin"

  const { data: usersResponse, isLoading: isUsersLoading } = useCustomGet({
    key: ['users', currentPage],
    endpoint: `${endpoints.kiosk}?page=${currentPage}&limit=${itemsPerPage}`, 
    enabled: true,
  });

  const { mutate: createUser, isPending: isCreating } = useCustomPost({
    key: 'users',
    endpoint: endpoints.kiosk,
    onSuccess: () => {
      toast.success("Администратор успешно создан");
      setIsCreateUserModalOpen(false);
      setNewUser({
        name: "",
        role: "ADMIN",
        phone_number: "",
        login: "",
        password: "",
        status: "ACTIVE",
        device_id: "default_device",
        region_id: 1,
        branch_id: 1,
      });
      queryClient.invalidateQueries(['users']);
    },
    onError: () => {
      toast.error("Ошибка при создании администратора");
    },
  });

  const { mutate: updateUser, isPending: isUpdating } = useCustomPost({
    key: 'users',
    endpoint: endpoints.kiosk,
    onSuccess: () => {
      toast.success("Администратор успешно обновлен");
      setIsEditUserModalOpen(false);
      setSelectedUser(null);
      queryClient.invalidateQueries(['users']);
    },
    onError: () => {
      toast.error("Ошибка при обновлении администратора");
    },
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const mapRoleToPosition = (role) => {
    switch (role) {
      case "ADMIN": return "Администратор";
      case "ACCAUNTANT": return "Бухгалтер";
      case "COLLECTOR": return "Инкассатор";
      default: return role;
    }
  };

  const mapStatus = (status) => {
    return status === "ACTIVE" ? "Активен" : "Неактивен";
  };

  const usersData = usersResponse?.data?.data?.filter(user => ["ADMIN", "ACCAUNTANT", "COLLECTOR"].includes(user.role)).map(user => ({
    id: user.code,
    createdAt: formatDate(user.createdAt),
    fullName: user.name || "Не указано",
    position: mapRoleToPosition(user.role),
    phoneNumber: user.phone_number || "—",
    login: user.login,
    password: "••••••••",
    status: mapStatus(user.status),
    apiId: user.id,
  })) || [];

  const filteredUsers = usersData.filter((user) => {
    const matchesSearch =
      user.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.login.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phoneNumber.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesPosition = positionFilter === "all" ? true : user.position === positionFilter
    const matchesStatus = statusFilter === "all" ? true : user.status === statusFilter

    return matchesSearch && matchesPosition && matchesStatus
  })

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1

  const getStatusBadge = (status) => {
    return status === "Активен" ? (
      <Badge className="bg-green-500">Активен</Badge>
    ) : (
      <Badge className="bg-red-500">Неактивен</Badge>
    )
  }

  const handleEditUser = (user) => {
    setSelectedUser({
      apiId: user.apiId,
      name: user.fullName,
      role: usersData.find(u => u.id === user.id)?.position === "Администратор" ? "ADMIN" :
            usersData.find(u => u.id === user.id)?.position === "Бухгалтер" ? "ACCAUNTANT" : "COLLECTOR",
      phone_number: user.phoneNumber === "—" ? "" : user.phoneNumber,
      login: user.login,
      status: user.status === "Активен" ? "ACTIVE" : "INACTIVE",
    })
    setIsEditUserModalOpen(true)
  }

  const handleCreateUser = () => {
    if (!newUser.name || !newUser.login || !newUser.password) {
      toast.error("Заполните все обязательные поля");
      return;
    }

    const body = {
      name: newUser.name,
      login: newUser.login,
      password: newUser.password,
      role: newUser.role, // Will always be "ADMIN" for the admin tab
      phone_number: newUser.phone_number || null,
      status: newUser.status,
      device_id: newUser.device_id,
      region_id: newUser.region_id,
      branch_id: newUser.branch_id,
    };

    createUser({
      endpoint: endpoints.kiosk,
      body,
    });
  }

  const handleSaveUser = () => {
    if (!selectedUser.name || !selectedUser.login) {
      toast.error("Заполните все обязательные поля");
      return;
    }

    const body = {
      name: selectedUser.name,
      login: selectedUser.login,
      role: selectedUser.role,
      phone_number: selectedUser.phone_number || null,
      status: selectedUser.status,
      device_id: "default_device",
      region_id: 1,
      branch_id: 1,
    };

    updateUser({
      endpoint: `${endpoints.kiosk}/${selectedUser.apiId}`,
      body,
      method: "put",
    });
  }

  const uniquePositions = Array.from(new Set(usersData.map((u) => u.position)))
  const uniqueStatuses = Array.from(new Set(usersData.map((u) => u.status)))

  if (isUsersLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Пользователи</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Поиск по имени, логину..."
              className="pl-8 w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={positionFilter} onValueChange={setPositionFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Должность" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все должности</SelectItem>
              {uniquePositions.map((position) => (
                <SelectItem key={position} value={position}>
                  {position}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              {uniqueStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setIsCreateUserModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Создать
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Список пользователей
          </CardTitle>
        </CardHeader>
        <CardContent>
          {paginatedUsers.length === 0 ? (
            <div className="text-center text-gray-500 py-4">
              Пользователи не найдены
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Дата создания</TableHead>
                  <TableHead>ФИО</TableHead>
                  <TableHead>Должность</TableHead>
                  <TableHead>Тел. номер</TableHead>
                  <TableHead>Логин</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.id}</TableCell>
                    <TableCell>{user.createdAt}</TableCell>
                    <TableCell>{user.fullName}</TableCell>
                    <TableCell>{user.position}</TableCell>
                    <TableCell>{user.phoneNumber}</TableCell>
                    <TableCell>{user.login}</TableCell>
                    <TableCell>{getStatusBadge(user.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditUser(user)}>
                          <Edit className="h-4 w-4 mr-1" />
                          Редактировать
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        {totalPages > 1 && (
          <CardContent>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </CardContent>
        )}
      </Card>

      <Dialog open={isCreateUserModalOpen} onOpenChange={setIsCreateUserModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Создание нового администратора</DialogTitle>
            <DialogDescription>Заполните информацию для создания нового администратора</DialogDescription>
          </DialogHeader>

          <Tabs value={createUserTab} onValueChange={setCreateUserTab}>
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="admin">
                <User className="h-4 w-4 mr-2" />
                Админ
              </TabsTrigger>
              <TabsTrigger value="collector">
                <Banknote className="h-4 w-4 mr-2" />
                Инкассатор
              </TabsTrigger>
              <TabsTrigger value="accountant">
                <Calculator className="h-4 w-4 mr-2" />
                Бухгалтер
              </TabsTrigger>
            </TabsList>

            <TabsContent value="admin" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">ФИО</Label>
                  <Input
                    id="fullName"
                    placeholder="Иванов Иван Иванович"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    disabled={isCreating}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Телефон</Label>
                  <Input
                    id="phone"
                    placeholder="+998 90 123 45 67"
                    value={newUser.phone_number}
                    onChange={(e) => setNewUser({ ...newUser, phone_number: e.target.value })}
                    disabled={isCreating}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login">Логин</Label>
                  <Input
                    id="login"
                    placeholder="username"
                    value={newUser.login}
                    onChange={(e) => setNewUser({ ...newUser, login: e.target.value })}
                    disabled={isCreating}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Пароль</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    disabled={isCreating}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Статус</Label>
                  <Select
                    value={newUser.status}
                    onValueChange={(value) => setNewUser({ ...newUser, status: value })}
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
              </div>
            </TabsContent>

            <TabsContent value="collector" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="collectorName">ФИО</Label>
                  <Input
                    id="collectorName"
                    placeholder="Петров Петр Петрович"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    disabled={isCreating}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="collectorPhone">Телефон</Label>
                  <Input
                    id="collectorPhone"
                    placeholder="+998 90 123 45 67"
                    value={newUser.phone_number}
                    onChange={(e) => setNewUser({ ...newUser, phone_number: e.target.value })}
                    disabled={isCreating}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="collectorLogin">Логин</Label>
                  <Input
                    id="collectorLogin"
                    placeholder="collector1"
                    value={newUser.login}
                    onChange={(e) => setNewUser({ ...newUser, login: e.target.value })}
                    disabled={isCreating}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="collectorPassword">Пароль</Label>
                  <Input
                    id="collectorPassword"
                    type="password"
                    placeholder="••••••••"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    disabled={isCreating}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="collectorStatus">Статус</Label>
                  <Select
                    value={newUser.status}
                    onValueChange={(value) => setNewUser({ ...newUser, status: value })}
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
              </div>
            </TabsContent>

            <TabsContent value="accountant" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="accountantName">ФИО</Label>
                  <Input
                    id="accountantName"
                    placeholder="Козлова Анна Петровна"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    disabled={isCreating}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountantPhone">Телефон</Label>
                  <Input
                    id="accountantPhone"
                    placeholder="+998 90 123 45 67"
                    value={newUser.phone_number}
                    onChange={(e) => setNewUser({ ...newUser, phone_number: e.target.value })}
                    disabled={isCreating}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountantLogin">Логин</Label>
                  <Input
                    id="accountantLogin"
                    placeholder="accountant1"
                    value={newUser.login}
                    onChange={(e) => setNewUser({ ...newUser, login: e.target.value })}
                    disabled={isCreating}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountantPassword">Пароль</Label>
                  <Input
                    id="accountantPassword"
                    type="password"
                    placeholder="••••••••"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    disabled={isCreating}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountantStatus">Статус</Label>
                  <Select
                    value={newUser.status}
                    onValueChange={(value) => setNewUser({ ...newUser, status: value })}
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
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-4">
            <Button
              variant="outline"
              onClick={() => setIsCreateUserModalOpen(false)}
              disabled={isCreating}
            >
              Отмена
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={isCreating}
            >
              {isCreating ? (
                <span className="flex items-center">
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Создание...
                </span>
              ) : (
                "Создать"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditUserModalOpen} onOpenChange={setIsEditUserModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Редактирование пользователя {selectedUser?.id}</DialogTitle>
            <DialogDescription>Измените информацию о пользователе</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ФИО</Label>
                  <Input
                    value={selectedUser.name}
                    onChange={(e) => setSelectedUser({ ...selectedUser, name: e.target.value })}
                    placeholder="Иванов Иван Иванович"
                    disabled={isUpdating}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Должность</Label>
                  <Select
                    value={selectedUser.role}
                    onValueChange={(value) => setSelectedUser({ ...selectedUser, role: value })}
                    disabled={isUpdating}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите должность" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Администратор</SelectItem>
                      <SelectItem value="ACCAUNTANT">Бухгалтер</SelectItem>
                      <SelectItem value="COLLECTOR">Инкассатор</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Телефон</Label>
                  <Input
                    value={selectedUser.phone_number}
                    onChange={(e) => setSelectedUser({ ...selectedUser, phone_number: e.target.value })}
                    placeholder="+998 90 123 45 67"
                    disabled={isUpdating}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Логин</Label>
                  <Input
                    value={selectedUser.login}
                    onChange={(e) => setSelectedUser({ ...selectedUser, login: e.target.value })}
                    placeholder="username"
                    disabled={isUpdating}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Статус</Label>
                  <Select
                    value={selectedUser.status}
                    onValueChange={(value) => setSelectedUser({ ...selectedUser, status: value })}
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
              </div>
            </div>
          )}
          <DialogFooter className="pt-4">
            <Button
              variant="outline"
              onClick={() => setIsEditUserModalOpen(false)}
              disabled={isUpdating}
            >
              Отмена
            </Button>
            <Button
              onClick={handleSaveUser}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <span className="flex items-center">
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Сохранение...
                </span>
              ) : (
                "Сохранить"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}