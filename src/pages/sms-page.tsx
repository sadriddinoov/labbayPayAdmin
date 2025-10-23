"use client"

import React from 'react';
import { useState } from "react"
import { Card, CardContent } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Badge } from "../components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table"
import { Download, Calendar } from "lucide-react"

// Данные СМС
const smsData = [
  {
    id: "00000001",
    partner: "AUTOBOC",
    partnerId: "235124",
    sender: "SafeRoad",
    recipient: "99899596913",
    sendDate: "25.10.2024 - 22:12",
    status: "Доставлено",
    deliveryDate: "25.10.2024 - 22:12",
  },
  {
    id: "00000002",
    partner: "AUTOBOC",
    partnerId: "235124",
    sender: "SafeRoad",
    recipient: "99899596913",
    sendDate: "25.10.2024 - 22:12",
    status: "Доставлено",
    deliveryDate: "25.10.2024 - 22:12",
  },
  {
    id: "00000003",
    partner: "AUTOBOC",
    partnerId: "235124",
    sender: "SafeRoad",
    recipient: "99899596913",
    sendDate: "25.10.2024 - 22:12",
    status: "Доставлено",
    deliveryDate: "25.10.2024 - 22:12",
  },
  {
    id: "00000004",
    partner: "AUTOBOC",
    partnerId: "235124",
    sender: "SafeRoad",
    recipient: "99899596913",
    sendDate: "25.10.2024 - 22:12",
    status: "Доставлено",
    deliveryDate: "25.10.2024 - 22:12",
  },
  {
    id: "00000005",
    partner: "AUTOBOC",
    partnerId: "235124",
    sender: "SafeRoad",
    recipient: "99899596913",
    sendDate: "25.10.2024 - 22:12",
    status: "Доставлено",
    deliveryDate: "25.10.2024 - 22:12",
  },
  {
    id: "00000006",
    partner: "AUTOBOC",
    partnerId: "235124",
    sender: "SafeRoad",
    recipient: "99899596913",
    sendDate: "25.10.2024 - 22:12",
    status: "Доставлено",
    deliveryDate: "25.10.2024 - 22:12",
  },
  {
    id: "00000007",
    partner: "AUTOBOC",
    partnerId: "235124",
    sender: "SafeRoad",
    recipient: "99899596913",
    sendDate: "25.10.2024 - 22:12",
    status: "Доставлено",
    deliveryDate: "25.10.2024 - 22:12",
  },
  {
    id: "00000008",
    partner: "AUTOBOC",
    partnerId: "235124",
    sender: "SafeRoad",
    recipient: "99899596913",
    sendDate: "25.10.2024 - 22:12",
    status: "Доставлено",
    deliveryDate: "25.10.2024 - 22:12",
  },
  {
    id: "00000009",
    partner: "AUTOBOC",
    partnerId: "235124",
    sender: "SafeRoad",
    recipient: "99899596913",
    sendDate: "25.10.2024 - 22:12",
    status: "Доставлено",
    deliveryDate: "25.10.2024 - 22:12",
  },
  {
    id: "00000010",
    partner: "AUTOBOC",
    partnerId: "235124",
    sender: "SafeRoad",
    recipient: "99899596913",
    sendDate: "25.10.2024 - 22:12",
    status: "Доставлено",
    deliveryDate: "25.10.2024 - 22:12",
  },
]

export default function SmsPage() {
  const [startDate, setStartDate] = useState("2024-10-25")
  const [endDate, setEndDate] = useState("2024-10-25")
  const [phoneFilter, setPhoneFilter] = useState("998")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const filteredSms = smsData.filter((sms) => {
    const smsDate = new Date(sms.sendDate.split(" - ")[0].split(".").reverse().join("-"))
    const filterStartDate = new Date(startDate)
    const filterEndDate = new Date(endDate)

    const matchesDate = smsDate >= filterStartDate && smsDate <= filterEndDate
    const matchesPhone = sms.recipient.includes(phoneFilter)

    return matchesDate && matchesPhone
  })

  const totalPages = Math.ceil(filteredSms.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedSms = filteredSms.slice(startIndex, startIndex + itemsPerPage)

  const handleDownload = () => {
    alert("Скачивание отчета...")
  }

  const getStatusBadge = (status: string) => {
    return <Badge className="bg-green-500">{status}</Badge>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900">СМС</h2>
        <Button onClick={handleDownload} className="bg-blue-500 hover:bg-blue-600">
          <Download className="h-4 w-4 mr-2" />
          Скачать
        </Button>
      </div>

      {/* Фильтры */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <label className="text-sm font-medium text-gray-700">Дата от</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-auto" />
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <label className="text-sm font-medium text-gray-700">Дата до</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-auto" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Номер телефона</label>
              <Input
                type="text"
                value={phoneFilter}
                onChange={(e) => setPhoneFilter(e.target.value)}
                placeholder="998"
                className="w-32"
              />
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-red-500 bg-red-100 px-2 py-1 rounded">Новые</span>
              <Badge className="bg-red-500">1</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead className="font-semibold">ID</TableHead>
                <TableHead className="font-semibold">Партнер</TableHead>
                <TableHead className="font-semibold">ID партнера</TableHead>
                <TableHead className="font-semibold">Отправитель</TableHead>
                <TableHead className="font-semibold">Получатель</TableHead>
                <TableHead className="font-semibold">Дата отправления</TableHead>
                <TableHead className="font-semibold">Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedSms.map((sms) => (
                <TableRow key={sms.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{sms.id}</TableCell>
                  <TableCell>{sms.partner}</TableCell>
                  <TableCell>{sms.partnerId}</TableCell>
                  <TableCell>{sms.sender}</TableCell>
                  <TableCell>{sms.recipient}</TableCell>
                  <TableCell>{sms.sendDate}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {getStatusBadge(sms.status)}
                      <div className="text-xs text-gray-500">{sms.deliveryDate}</div>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Пагинация */}
      <div className="flex justify-center items-center gap-2 mt-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          Назад
        </Button>

        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((page) => (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentPage(page)}
              className={currentPage === page ? "bg-blue-500" : ""}
            >
              {page}
            </Button>
          ))}
          <span className="px-2 py-1 text-sm">...</span>
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(31)}>
            31
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          Далее
        </Button>
      </div>
    </div>
  )
}
