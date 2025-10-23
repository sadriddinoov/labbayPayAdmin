"use client"

import React from 'react';
import { useState } from "react"
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
import { Search, Plus, Edit, Trash2, Filter, X } from "lucide-react"
import { Checkbox } from "../components/ui/checkbox"

// Данные вендоров комиссии
const commissionVendorsData = [
  {
    id: "V001",
    name: "LabbayPay Commission",
    percentage: 1.5,
    status: "Активен",
    category: "Основная комиссия",
    description: "Основная комиссия платформы",
    createdDate: "01.01.2023",
  },
  {
    id: "V002",
    name: "Bank Transfer Fee",
    percentage: 0.5,
    status: "Активен",
    category: "Банковская комиссия",
    description: "Комиссия за банковские переводы",
    createdDate: "15.03.2023",
  },
  {
    id: "V003",
    name: "Processing Fee",
    percentage: 0.3,
    status: "Активен",
    category: "Обработка",
    description: "Комиссия за обработку платежей",
    createdDate: "20.05.2023",
  },
  {
    id: "V004",
    name: "Service Fee",
    percentage: 0.8,
    status: "Неактивен",
    category: "Сервисная комиссия",
    description: "Дополнительная сервисная комиссия",
    createdDate: "10.08.2023",
  },
]

// Категории комиссий
const commissionCategories = ["Основная комиссия", "Банковская комиссия", "Обработка", "Сервисная комиссия", "Прочее"]

export default function CommissionPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [showFilters, setShowFilters] = useState(false)
  const [isCreateVendorModalOpen, setIsCreateVendorModalOpen] = useState(false)
  const [isEditVendorModalOpen, setIsEditVendorModalOpen] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState<any>(null)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [newVendor, setNewVendor] = useState({
    name: "",
    percentage: 0,
    status: "Активен",
    category: "",
    description: "",
  })

  const filteredVendors = commissionVendorsData.filter((vendor) => {
    const matchesSearch =
      vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.description.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(vendor.status)
    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(vendor.category)

    return matchesSearch && matchesStatus && matchesCategory
  })

  const getStatusBadge = (status: string) => {
    return status === "Активен" ? (
      <Badge className="bg-green-500">Активен</Badge>
    ) : (
      <Badge className="bg-red-500">Неактивен</Badge>
    )
  }

  const getCategoryBadge = (category: string) => {
    const colors: { [key: string]: string } = {
      "Основная комиссия": "bg-blue-500",
      "Банковская комиссия": "bg-green-500",
      Обработка: "bg-orange-500",
      "Сервисная комиссия": "bg-purple-500",
      Прочее: "bg-gray-500",
    }

    return <Badge className={colors[category] || "bg-gray-500"}>{category}</Badge>
  }

  const handleEditVendor = (vendor: any) => {
    setSelectedVendor({ ...vendor })
    setIsEditVendorModalOpen(true)
  }

  const handleCreateVendor = () => {
    // Логика создания вендора
    const newId = `V${String(commissionVendorsData.length + 1).padStart(3, "0")}`
    const vendorToAdd = {
      ...newVendor,
      id: newId,
      createdDate: new Date().toLocaleDateString("ru-RU"),
    }

    commissionVendorsData.push(vendorToAdd)
    setIsCreateVendorModalOpen(false)
    setNewVendor({
      name: "",
      percentage: 0,
      status: "Активен",
      category: "",
      description: "",
    })
  }

  const handleSaveVendor = () => {
    // Логика сохранения изменений
    const vendorIndex = commissionVendorsData.findIndex((v) => v.id === selectedVendor.id)
    if (vendorIndex !== -1) {
      commissionVendorsData[vendorIndex] = { ...selectedVendor }
    }
    setIsEditVendorModalOpen(false)
    setSelectedVendor(null)
  }

  const handleDeleteVendor = (vendorId: string) => {
    const vendorIndex = commissionVendorsData.findIndex((v) => v.id === vendorId)
    if (vendorIndex !== -1) {
      commissionVendorsData.splice(vendorIndex, 1)
    }
  }

  const clearFilters = () => {
    setSelectedCategories([])
    setSelectedStatuses([])
  }

  const uniqueStatuses = Array.from(new Set(commissionVendorsData.map((v) => v.status)))

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Комиссия</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Поиск по названию, категории..."
              className="pl-8 w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
          <Button onClick={() => setIsCreateVendorModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Создать
          </Button>
        </div>
      </div>

      {/* Панель фильтров */}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Категория */}
              <div className="space-y-2">
                <Label>Категория</Label>
                <div className="border rounded-md p-2 max-h-32 overflow-y-auto">
                  {commissionCategories.map((category) => (
                    <div key={category} className="flex items-center space-x-2 py-1">
                      <Checkbox
                        id={`category-${category}`}
                        checked={selectedCategories.includes(category)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedCategories([...selectedCategories, category])
                          } else {
                            setSelectedCategories(selectedCategories.filter((c) => c !== category))
                          }
                        }}
                      />
                      <label htmlFor={`category-${category}`} className="text-sm cursor-pointer">
                        {category}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Статус */}
              <div className="space-y-2">
                <Label>Статус</Label>
                <div className="border rounded-md p-2 max-h-32 overflow-y-auto">
                  {uniqueStatuses.map((status) => (
                    <div key={status} className="flex items-center space-x-2 py-1">
                      <Checkbox
                        id={`status-${status}`}
                        checked={selectedStatuses.includes(status)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedStatuses([...selectedStatuses, status])
                          } else {
                            setSelectedStatuses(selectedStatuses.filter((s) => s !== status))
                          }
                        }}
                      />
                      <label htmlFor={`status-${status}`} className="text-sm cursor-pointer">
                        {status}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Список вендоров комиссии</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Название</TableHead>
                <TableHead>Категория</TableHead>
                <TableHead>Процент</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Описание</TableHead>
                <TableHead>Дата создания</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVendors.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell className="font-medium">{vendor.id}</TableCell>
                  <TableCell>{vendor.name}</TableCell>
                  <TableCell>{getCategoryBadge(vendor.category)}</TableCell>
                  <TableCell>
                    <span className="font-medium text-green-600">{vendor.percentage}%</span>
                  </TableCell>
                  <TableCell>{getStatusBadge(vendor.status)}</TableCell>
                  <TableCell className="max-w-xs truncate">{vendor.description}</TableCell>
                  <TableCell>{vendor.createdDate}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => handleEditVendor(vendor)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteVendor(vendor.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Модальное окно создания вендора */}
      <Dialog open={isCreateVendorModalOpen} onOpenChange={setIsCreateVendorModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Создание нового вендора комиссии</DialogTitle>
            <DialogDescription>Заполните информацию для добавления нового вендора комиссии</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Название</Label>
                <Input
                  id="name"
                  placeholder="Название вендора"
                  value={newVendor.name}
                  onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="percentage">Процент комиссии (%)</Label>
                <Input
                  id="percentage"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="1.5"
                  value={newVendor.percentage}
                  onChange={(e) => setNewVendor({ ...newVendor, percentage: Number.parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Категория</Label>
                <Select
                  value={newVendor.category}
                  onValueChange={(value) => setNewVendor({ ...newVendor, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите категорию" />
                  </SelectTrigger>
                  <SelectContent>
                    {commissionCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Статус</Label>
                <Select
                  value={newVendor.status}
                  onValueChange={(value) => setNewVendor({ ...newVendor, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите статус" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Активен">Активен</SelectItem>
                    <SelectItem value="Неактивен">Неактивен</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Описание</Label>
              <Input
                id="description"
                placeholder="Описание вендора комиссии"
                value={newVendor.description}
                onChange={(e) => setNewVendor({ ...newVendor, description: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateVendorModalOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleCreateVendor}>Создать вендора</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Модальное окно редактирования вендора */}
      <Dialog open={isEditVendorModalOpen} onOpenChange={setIsEditVendorModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Редактирование вендора комиссии</DialogTitle>
            <DialogDescription>Измените информацию о вендоре комиссии</DialogDescription>
          </DialogHeader>

          {selectedVendor && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Название</Label>
                  <Input
                    value={selectedVendor.name}
                    onChange={(e) => setSelectedVendor({ ...selectedVendor, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Процент комиссии (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={selectedVendor.percentage}
                    onChange={(e) =>
                      setSelectedVendor({ ...selectedVendor, percentage: Number.parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Категория</Label>
                  <Select
                    value={selectedVendor.category}
                    onValueChange={(value) => setSelectedVendor({ ...selectedVendor, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {commissionCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Статус</Label>
                  <Select
                    value={selectedVendor.status}
                    onValueChange={(value) => setSelectedVendor({ ...selectedVendor, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Активен">Активен</SelectItem>
                      <SelectItem value="Неактивен">Неактивен</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Описание</Label>
                <Input
                  value={selectedVendor.description}
                  onChange={(e) => setSelectedVendor({ ...selectedVendor, description: e.target.value })}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditVendorModalOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveVendor}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
