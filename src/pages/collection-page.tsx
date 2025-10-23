import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { Search, Filter, X, Check, Eye } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';

const stageColors = {
  '1': '#eab308',
  '2': '#f97316',
  '3': '#3b82f6',
  '4': '#8b5cf6',
  '5': '#10b981',
};

interface ConfirmationDetails {
  changeAmount?: string;
  changeDate?: string;
  bankAmount?: string | null;
  bankDate?: string | null;
}

interface HistoryItem {
  time: string;
  stage: string;
  type: string;
}

interface Collection {
  id: string;
  kioskId: string;
  collector: string;
  collectionDate: string;
  collectionAmount: string;
  billCount: number;
  changeStatus: {
    hasLowBills: boolean;
    details: string;
  };
  type: 'collection' | 'change' | 'both';
  stage: number;
  bankConfirmed: boolean;
  changeConfirmed: boolean;
  confirmationDetails: ConfirmationDetails | null;
  history: HistoryItem[];
}

const collectionData: Collection[] = [
  {
    id: 'C001',
    kioskId: 'K001',
    collector: 'Петров Петр Петрович',
    collectionDate: '06.12.2023',
    collectionAmount: '125,000 сум',
    billCount: 850,
    changeStatus: {
      hasLowBills: true,
      details: '2000×35, 5000×42, 10000×15, 20000×52',
    },
    type: 'collection',
    stage: 1,
    bankConfirmed: false,
    changeConfirmed: false,
    confirmationDetails: null,
    history: [{ time: '06.12.2023 14:30', stage: '1-этап', type: 'Новая заявка' }],
  },
  {
    id: 'C002',
    kioskId: 'K003',
    collector: 'Дарвин Ликантроп Ликантропович',
    collectionDate: '06.12.2023',
    collectionAmount: '203,750 сум',
    billCount: 1200,
    changeStatus: {
      hasLowBills: false,
      details: '2000×45, 5000×42, 10000×55, 20000×43',
    },
    type: 'collection',
    stage: 2,
    bankConfirmed: false,
    changeConfirmed: false,
    confirmationDetails: null,
    history: [
      { time: '06.12.2023 13:15', stage: '2-этап', type: 'QR код' },
      { time: '06.12.2023 13:00', stage: '1-этап', type: 'Новая заявка' },
    ],
  },
  {
    id: 'C003',
    kioskId: 'K004',
    collector: 'Сидоров Сидор Сидорович',
    collectionDate: '06.12.2023',
    collectionAmount: '156,200 сум',
    billCount: 950,
    changeStatus: {
      hasLowBills: false,
      details: '2000×50, 5000×48, 10000×65, 20000×42',
    },
    type: 'collection',
    stage: 3,
    bankConfirmed: false,
    changeConfirmed: false,
    confirmationDetails: null,
    history: [
      { time: '06.12.2023 12:45', stage: '3-этап', type: 'Изъятие наличных' },
      { time: '06.12.2023 12:30', stage: '2-этап', type: 'QR код' },
      { time: '06.12.2023 12:15', stage: '1-этап', type: 'Новая заявка' },
    ],
  },
  {
    id: 'C004',
    kioskId: 'K002',
    collector: 'Дарвин Ликантроп Ликантропович',
    collectionDate: '05.12.2023',
    collectionAmount: '0 сум',
    billCount: 0,
    changeStatus: {
      hasLowBills: true,
      details: '2000×25, 5000×12, 10000×8, 20000×22',
    },
    type: 'change',
    stage: 1,
    bankConfirmed: false,
    changeConfirmed: false,
    confirmationDetails: null,
    history: [{ time: '05.12.2023 11:00', stage: '1-этап', type: 'Новая заявка' }],
  },
  {
    id: 'C005',
    kioskId: 'K005',
    collector: 'Алексеев Алексей Алексеевич',
    collectionDate: '05.12.2023',
    collectionAmount: '320,000 сум',
    billCount: 1800,
    changeStatus: {
      hasLowBills: false,
      details: '2000×45, 5000×52, 10000×75, 20000×43',
    },
    type: 'both',
    stage: 4,
    bankConfirmed: false,
    changeConfirmed: true,
    confirmationDetails: {
      changeAmount: '15,000 сум',
      changeDate: '05.12.2023 16:30',
      bankAmount: null,
      bankDate: null,
    },
    history: [
      { time: '05.12.2023 16:15', stage: '4-этап', type: 'Передача наличных в банк и Возмещение средств' },
      { time: '05.12.2023 16:00', stage: '3-этап', type: 'Изъятие и Внесение наличных' },
      { time: '05.12.2023 15:45', stage: '2-этап', type: 'QR код' },
      { time: '05.12.2023 15:30', stage: '1-этап', type: 'Новая заявка' },
    ],
  },
  {
    id: 'C006',
    kioskId: 'K001',
    collector: 'Петров Петр Петрович',
    collectionDate: '04.12.2023',
    collectionAmount: '0 сум',
    billCount: 0,
    changeStatus: {
      hasLowBills: true,
      details: '2000×15, 5000×8, 10000×5, 20000×12',
    },
    type: 'change',
    stage: 5,
    bankConfirmed: false,
    changeConfirmed: true,
    confirmationDetails: {
      changeAmount: '8,000 сум',
      changeDate: '04.12.2023 18:00',
      bankAmount: null,
      bankDate: null,
    },
    history: [
      { time: '04.12.2023 18:00', stage: '5-этап', type: 'Подтверждено' },
      { time: '04.12.2023 17:45', stage: '4-этап', type: 'Возмещение средств' },
      { time: '04.12.2023 17:30', stage: '3-этап', type: 'Внесение наличных' },
      { time: '04.12.2023 17:15', stage: '2-этап', type: 'QR код' },
      { time: '04.12.2023 17:00', stage: '1-этап', type: 'Новая заявка' },
    ],
  },
];

const getStatusByTypeAndStage = (type: string, stage: number) => {
  if (type === 'collection') {
    switch (stage) {
      case 1:
        return 'Новая заявка (1 этап)';
      case 2:
        return 'QR код (2 этап)';
      case 3:
        return 'Изъятие наличных (3 этап)';
      case 4:
        return 'Передача наличных в банк (4 этап)';
      case 5:
        return 'Подтверждено (5 этап)';
      default:
        return 'Неизвестный статус';
    }
  } else if (type === 'change') {
    switch (stage) {
      case 1:
        return 'Новая заявка (1 этап)';
      case 2:
        return 'QR код (2 этап)';
      case 3:
        return 'Внесение наличных (3 этап)';
      case 4:
        return 'Возмещение средств (4 этап)';
      case 5:
        return 'Подтверждено (5 этап)';
      default:
        return 'Неизвестный статус';
    }
  } else if (type === 'both') {
    switch (stage) {
      case 1:
        return 'Новая заявка (1 этап)';
      case 2:
        return 'QR код (2 этап)';
      case 3:
        return 'Изъятие и Внесение наличных (3 этап)';
      case 4:
        return 'Передача наличных в банк и Возмещение средств (4 этап)';
      case 5:
        return 'Подтверждено Сдача + Инкассация (5 этап)';
      default:
        return 'Неизвестный статус';
    }
  }
  return 'Неизвестный статус';
};

export default function CollectionPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [collectorFilter, setCollectorFilter] = useState('all');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedHistory, setSelectedHistory] = useState<HistoryItem[] | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState<Collection | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [collections, setCollections] = useState<Collection[]>(collectionData);
  const [showFilters, setShowFilters] = useState(false);

  const filteredCollections = collections.filter((collection) => {
    const matchesSearch =
      collection.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      collection.kioskId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      collection.collector.toLowerCase().includes(searchTerm.toLowerCase());

    const currentStatus = getStatusByTypeAndStage(collection.type, collection.stage);
    const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(currentStatus);
    const matchesCollector = collectorFilter === 'all' ? true : collection.collector === collectorFilter;
    const matchesType = selectedTypes.length === 0 || selectedTypes.includes(collection.type);

    const collectionDateObj = new Date(collection.collectionDate.split('.').reverse().join('-') + 'T00:00:00');
    const matchesStartDate = !startDate || collectionDateObj >= new Date(startDate + 'T00:00:00');
    const matchesEndDate = !endDate || collectionDateObj <= new Date(endDate + 'T00:00:00');

    return matchesSearch && matchesStatus && matchesCollector && matchesType && matchesStartDate && matchesEndDate;
  });

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'collection':
        return 'Инкассация';
      case 'change':
        return 'Сдача';
      case 'both':
        return 'Инкассация + Сдача';
      default:
        return type;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      collection: 'bg-blue-500',
      change: 'bg-orange-500',
      both: 'bg-purple-500',
    };

    return <Badge className={colors[type as keyof typeof colors] || 'bg-gray-500'}>{getTypeLabel(type)}</Badge>;
  };

  const getStatusDisplay = (collection: Collection) => {
    const { type, stage, bankConfirmed, changeConfirmed } = collection;

    if (type === 'both' && stage === 4) {
      const bankStatus = bankConfirmed ? 'Инкассация' : <span className="text-red-500">Инкассация</span>;
      const changeStatus = changeConfirmed ? 'Сдача' : <span className="text-red-500">Сдача</span>;

      return (
        <div className="space-y-1">
          <div>Передача наличных в банк и Возмещение средств (4 этап)</div>
          <div className="text-xs">
            {bankStatus} | {changeStatus}
          </div>
        </div>
      );
    }

    if (type === 'both' && stage === 5) {
      const bankStatus = bankConfirmed ? 'Инкассация' : <span className="text-red-500">Инкассация</span>;
      const changeStatus = changeConfirmed ? 'Сдача' : <span className="text-red-500">Сдача</span>;

      return (
        <div className="space-y-1">
          <div>Подтверждено Сдача + Инкассация (5 этап)</div>
          <div className="text-xs">
            {bankStatus} | {changeStatus}
          </div>
        </div>
      );
    }

    return getStatusByTypeAndStage(type, stage);
  };

  const getStatusBadge = (collection: Collection) => {
    const { stage, type, bankConfirmed, changeConfirmed } = collection;
    const color = stageColors[stage.toString() as keyof typeof stageColors] || '#6b7280';

    return (
      <div className="flex items-center gap-2">
        <Badge
          className="cursor-pointer hover:opacity-80"
          style={{ backgroundColor: color }}
          onClick={() => handleViewHistory(collection)}
        >
          {getStatusDisplay(collection)}
        </Badge>

        {stage === 4 && (
          <div className="flex gap-1">
            {type === 'both' ? (
              <>
                {!bankConfirmed && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConfirmBank(collection.id);
                    }}
                    className="h-6 px-2 text-xs"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Инкассация
                  </Button>
                )}
                {!changeConfirmed && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConfirmChange(collection.id);
                    }}
                    className="h-6 px-2 text-xs"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Сдача
                  </Button>
                )}
              </>
            ) : type === 'collection' && !bankConfirmed ? (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleConfirmBank(collection.id);
                }}
                className="h-6 px-2 text-xs"
              >
                <Check className="h-3 w-3 mr-1" />
                Подтвердить
              </Button>
            ) : type === 'change' && !changeConfirmed ? (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleConfirmChange(collection.id);
                }}
                className="h-6 px-2 text-xs"
              >
                <Check className="h-3 w-3 mr-1" />
                Подтвердить
              </Button>
            ) : null}
          </div>
        )}

        {stage === 5 && (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              handleViewDetails(collection);
            }}
            className="h-6 px-2 text-xs"
          >
            <Eye className="h-3 w-3 mr-1" />
            Детали
          </Button>
        )}
      </div>
    );
  };

  const handleViewHistory = (collection: Collection) => {
    setSelectedHistory(collection.history);
    setIsHistoryModalOpen(true);
  };

  const handleViewDetails = (collection: Collection) => {
    setSelectedDetails(collection);
    setIsDetailsModalOpen(true);
  };

  const handleConfirmBank = (collectionId: string) => {
    setCollections((prev) =>
      prev.map((collection) => {
        if (collection.id === collectionId) {
          const updatedCollection = {
            ...collection,
            bankConfirmed: true,
            confirmationDetails: {
              ...collection.confirmationDetails,
              bankAmount: collection.collectionAmount,
              bankDate: new Date().toLocaleString('ru-RU'),
            },
          };

          if (collection.type === 'collection' || (collection.type === 'both' && collection.changeConfirmed)) {
            updatedCollection.stage = 5;
            updatedCollection.history = [
              {
                time: new Date().toLocaleString('ru-RU'),
                stage: '5-этап',
                type: getStatusByTypeAndStage(collection.type, 5),
              },
              ...collection.history,
            ];
          }

          return updatedCollection;
        }
        return collection;
      })
    );
  };

  const handleConfirmChange = (collectionId: string) => {
    setCollections((prev) =>
      prev.map((collection) => {
        if (collection.id === collectionId) {
          const updatedCollection = {
            ...collection,
            changeConfirmed: true,
            confirmationDetails: {
              ...collection.confirmationDetails,
              changeAmount: '10,000 сум',
              changeDate: new Date().toLocaleString('ru-RU'),
            },
          };

          if (collection.type === 'change' || (collection.type === 'both' && collection.bankConfirmed)) {
            updatedCollection.stage = 5;
            updatedCollection.history = [
              {
                time: new Date().toLocaleString('ru-RU'),
                stage: '5-этап',
                type: getStatusByTypeAndStage(collection.type, 5),
              },
              ...collection.history,
            ];
          }

          return updatedCollection;
        }
        return collection;
      })
    );
  };

  const clearFilters = () => {
    setSelectedStatuses([]);
    setCollectorFilter('all');
    setSelectedTypes([]);
    setStartDate('');
    setEndDate('');
  };

  const uniqueStatuses = Array.from(new Set(collections.map((c) => getStatusByTypeAndStage(c.type, c.stage))));
  const uniqueCollectors = Array.from(new Set(collections.map((c) => c.collector)));

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Инкассация</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Поиск по ID, киоску, инкассатору..."
              className="pl-8 w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-blue-50' : ''}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Тип заявки</Label>
                <div className="border rounded-md p-2 max-h-32 overflow-y-auto">
                  {[
                    { value: 'collection', label: 'Инкассация' },
                    { value: 'change', label: 'Сдача' },
                    { value: 'both', label: 'Инкассация + Сдача' },
                  ].map((type) => (
                    <div key={type.value} className="flex items-center space-x-2 py-1">
                      <Checkbox
                        id={`type-${type.value}`}
                        checked={selectedTypes.includes(type.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedTypes([...selectedTypes, type.value]);
                          } else {
                            setSelectedTypes(selectedTypes.filter((t) => t !== type.value));
                          }
                        }}
                      />
                      <label htmlFor={`type-${type.value}`} className="text-sm cursor-pointer">
                        {type.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

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
                            setSelectedStatuses([...selectedStatuses, status]);
                          } else {
                            setSelectedStatuses(selectedStatuses.filter((s) => s !== status));
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

              <div className="space-y-2">
                <Label>Инкассатор</Label>
                <Select value={collectorFilter} onValueChange={setCollectorFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Инкассатор" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все инкассаторы</SelectItem>
                    {uniqueCollectors.map((collector) => (
                      <SelectItem key={collector} value={collector}>
                        {collector.split(' ')[0]} {collector.split(' ')[1]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Период</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    placeholder="От"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  <Input type="date" placeholder="До" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Журнал инкассации</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Заявки</TableHead>
                <TableHead>ID Киоска</TableHead>
                <TableHead>Инкассатор</TableHead>
                <TableHead>Дата инкассации</TableHead>
                <TableHead>Сумма инкассации</TableHead>
                <TableHead>Счет сдачи</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCollections.map((collection) => (
                <TableRow key={collection.id}>
                  <TableCell className="font-medium">{collection.id}</TableCell>
                  <TableCell>{collection.kioskId}</TableCell>
                  <TableCell>{collection.collector}</TableCell>
                  <TableCell>{collection.collectionDate}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{collection.collectionAmount}</p>
                      <p className={`text-xs ${collection.billCount < 700 ? 'text-red-500' : 'text-gray-500'}`}>
                        {collection.billCount} купюр
                        {collection.billCount < 700 && ' ⚠️'}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={`${collection.changeStatus.hasLowBills ? 'text-red-500' : 'text-gray-700'}`}>
                      <code className="bg-gray-100 px-2 py-1 rounded text-xs">{collection.changeStatus.details}</code>
                      {collection.changeStatus.hasLowBills && <p className="text-xs mt-1">⚠️ Требуется пополнение</p>}
                    </div>
                  </TableCell>
                  <TableCell>{getTypeBadge(collection.type)}</TableCell>
                  <TableCell>{getStatusBadge(collection)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>История этапов заявки</DialogTitle>
            <DialogDescription>Подробная информация о всех этапах обработки заявки</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {selectedHistory?.map((stage, idx) => (
              <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-blue-600">{stage.stage}</p>
                    <p className="text-sm text-gray-700 mt-1">{stage.type}</p>
                  </div>
                  <p className="text-sm text-gray-500">{stage.time}</p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Детали подтверждения</DialogTitle>
            <DialogDescription>Информация о подтверждении операций для заявки {selectedDetails?.id}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedDetails?.confirmationDetails?.changeAmount && (
              <div className="p-3 bg-orange-50 rounded-lg">
                <h4 className="font-medium text-orange-800">Возмещение средств</h4>
                <p className="text-sm text-orange-700">Сумма: {selectedDetails.confirmationDetails.changeAmount}</p>
                <p className="text-sm text-orange-700">Дата: {selectedDetails.confirmationDetails.changeDate}</p>
              </div>
            )}
            {selectedDetails?.confirmationDetails?.bankAmount && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800">Поступление в банк</h4>
                <p className="text-sm text-blue-700">Сумма: {selectedDetails.confirmationDetails.bankAmount}</p>
                <p className="text-sm text-blue-700">Дата: {selectedDetails.confirmationDetails.bankDate}</p>
              </div>
            )}
            {!selectedDetails?.confirmationDetails?.changeAmount &&
              !selectedDetails?.confirmationDetails?.bankAmount && (
                <p className="text-gray-500 text-center">Нет данных о подтверждении</p>
              )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}