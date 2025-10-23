"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Badge } from "../components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { Label } from "../components/ui/label"
import { Search, Filter, X, Download, ChevronLeft, ChevronRight } from "lucide-react"
import { useCustomGet } from "../hooks/useCustomGet"
import { endpoints } from "../config/endpoints"
import { toast } from "react-toastify"
import * as XLSX from "xlsx"

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

export default function TransactionsPage() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [selectedServiceType, setSelectedServiceType] = useState("Все типы")
  const [selectedStatus, setSelectedStatus] = useState("Все статусы")
  const [selectedProvider, setSelectedProvider] = useState("Все поставщики")
  const [paymentTypeFilter, setPaymentTypeFilter] = useState("Все типы")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const { data: transactionsResponse, isLoading } = useCustomGet({
    key: ["transactions", currentPage, searchTerm, selectedServiceType, selectedStatus, selectedProvider, paymentTypeFilter],
    endpoint: `${endpoints.transaction}?page=${currentPage}&limit=${itemsPerPage}&search=${encodeURIComponent(searchTerm)}&status=${encodeURIComponent(selectedStatus)}&serviceType=${encodeURIComponent(selectedServiceType)}&provider=${encodeURIComponent(selectedProvider)}&paymentType=${encodeURIComponent(paymentTypeFilter)}`,
    enabled: true,
    cacheTime: 0,
  })

  console.log("API Response:", transactionsResponse)

  const transactionsData = transactionsResponse?.data?.data?.map((transaction) => {
    console.log("Transaction:", transaction)
    const paymentAmount = transaction.amount || 0
    const childAmount = transaction.child_transaction?.amount || 0
    const changeAmount = transaction.child_transaction?.amount ? paymentAmount - childAmount : 0
    const commissionAmount = Math.round(paymentAmount * 0.033)

    const status =
      transaction.status === "CONFIRM" ? "Успешно" :
      transaction.status === "ERROR" ? "Ошибка" :
      transaction.status === "CREATE" ? "Создана" :
      transaction.status === "PROCESS" ? "В обработке" : "Неизвестно"
    const paymentType = transaction.payment_type === 1 ? "Наличными" : "Картой"
    const phoneNumber = transaction.payer_phone ? `+${transaction.payer_phone}` : "—"

    return {
      id: transaction.id,
      kioskId: transaction.user?.code || "—",
      serviceType: transaction.vendor?.category?.title || "—",
      provider: transaction.vendor?.name || "—",
      invoice: "—",
      paymentAmount,
      changeAmount,
      commission: {
        amount: commissionAmount,
        percentage: 3.3,
      },
      status,
      paymentType,
      phoneNumber,
    }
  }) || []

  const filteredTransactions = transactionsData

  console.log("Filtered Transactions:", filteredTransactions)
  console.log("Filters:", { searchTerm, selectedServiceType, selectedStatus, selectedProvider, paymentTypeFilter })

  const totalPages = transactionsResponse?.data?.totalPage || 1
  const totalItems = transactionsResponse?.data?.totalItems || 0
  const paginatedTransactions = filteredTransactions // Убираем slice, так как данные уже пагинированы сервером

  console.log("Paginated Transactions:", paginatedTransactions)

  const getStatusBadge = (status) => {
    switch (status) {
      case "Успешно":
        return <Badge className="bg-green-500">Успешно</Badge>
      case "Ошибка":
        return <Badge className="bg-red-500">Ошибка</Badge>
      case "Создана":
        return <Badge className="bg-yellow-500">Создана</Badge>
      case "В обработке":
        return <Badge className="bg-blue-500">В обработке</Badge>
      default:
        return <Badge className="bg-gray-500">Неизвестно</Badge>
    }
  }

  const clearFilters = () => {
    setSelectedServiceType("Все типы")
    setSelectedStatus("Все статусы")
    setSelectedProvider("Все поставщики")
    setPaymentTypeFilter("Все типы")
    setSearchTerm("")
    setCurrentPage(1)
  }

  const formatAmount = (amount) => {
    return `${amount.toLocaleString("ru-RU")} сум`
  }

  const handleDownloadExcel = () => {
    if (paginatedTransactions.length === 0) {
      toast.error("Нет транзакций для скачивания")
      return
    }

    const worksheetData = [
      [
        "ID транзакции",
        "ID киоска",
        "Тип услуги",
        "Поставщик",
        "Инвойс",
        "Сумма оплаты",
        "Сумма сдачи",
        "Комиссия",
        "Статус",
        "Тип оплаты",
        "Номер телефона",
      ],
      ...paginatedTransactions.map((t) => [
        t.id,
        t.kioskId,
        t.serviceType,
        t.provider,
        t.invoice,
        formatAmount(t.paymentAmount),
        formatAmount(t.changeAmount),
        `${formatAmount(t.commission.amount)} (3.3%)`,
        t.status,
        t.paymentType,
        t.phoneNumber,
      ]),
    ]

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Транзакции")

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    })
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.setAttribute("download", `transactions_page_${currentPage}.xlsx`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success("Excel-файл успешно скачан")
  }

  const uniqueServiceTypes = Array.from(new Set(transactionsData.map((t) => t.serviceType)))
  const uniqueProviders = Array.from(new Set(transactionsData.map((t) => t.provider)))
  const statusTypes = ["Успешно", "Ошибка", "Создана", "В обработке"]

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Транзакции</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Поиск по ID киоска или телефону..."
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Тип услуги</Label>
                <Select
                  value={selectedServiceType}
                  onValueChange={setSelectedServiceType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Тип услуги" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Все типы">Все типы</SelectItem>
                    {uniqueServiceTypes.map((service) => (
                      <SelectItem key={service} value={service}>
                        {service}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Поставщики</Label>
                <Select
                  value={selectedProvider}
                  onValueChange={setSelectedProvider}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Поставщик" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Все поставщики">Все поставщики</SelectItem>
                    {uniqueProviders.map((provider) => (
                      <SelectItem key={provider} value={provider}>
                        {provider}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Статус</Label>
                <Select
                  value={selectedStatus}
                  onValueChange={setSelectedStatus}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Статус" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Все статусы">Все статусы</SelectItem>
                    {statusTypes.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Тип оплаты</Label>
                <Select
                  value={paymentTypeFilter}
                  onValueChange={setPaymentTypeFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Тип оплаты" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Все типы">Все типы</SelectItem>
                    <SelectItem value="Наличными">Наличными</SelectItem>
                    <SelectItem value="Картой">Картой</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            Список транзакций
            {filteredTransactions.length !== totalItems && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                (показано {filteredTransactions.length} из {totalItems})
              </span>
            )}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handleDownloadExcel}>
            <Download className="h-4 w-4 mr-2" />
            Скачать Excel
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID транзакции</TableHead>
                <TableHead>ID киоска</TableHead>
                <TableHead>Тип услуги</TableHead>
                <TableHead>Поставщик</TableHead>
                <TableHead>Инвойс</TableHead>
                <TableHead>Сумма оплаты</TableHead>
                <TableHead>Сумма сдачи</TableHead>
                <TableHead>Комиссия</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Тип оплаты</TableHead>
                <TableHead>Номер телефона</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-medium">{transaction.id}</TableCell>
                  <TableCell>{transaction.kioskId}</TableCell>
                  <TableCell>{transaction.serviceType}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      {transaction.provider}
                    </Badge>
                  </TableCell>
                  <TableCell>{transaction.invoice}</TableCell>
                  <TableCell className="font-medium">
                    {formatAmount(transaction.paymentAmount)}
                  </TableCell>
                  <TableCell>{formatAmount(transaction.changeAmount)}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{formatAmount(transaction.commission.amount)}</p>
                      <p className="text-xs text-gray-500">3.3%</p>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                  <TableCell>{transaction.paymentType}</TableCell>
                  <TableCell>{transaction.phoneNumber}</TableCell>
                </TableRow>
              ))}
              {paginatedTransactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-gray-500">
                    {transactionsResponse ? "Транзакции не найдены" : "Загрузка данных..."}
                  </TableCell>
                </TableRow>
              )}
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
    </div>
  )
}