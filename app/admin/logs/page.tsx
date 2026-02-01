'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DataTable } from '@/components/ui/data-table'
import { columns, AdminLog, actionLabels } from './columns'
import { RefreshCw } from 'lucide-react'

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AdminLog[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [actionTypes, setActionTypes] = useState<string[]>([])

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', pageSize.toString())
      if (actionFilter !== 'all') params.set('actionType', actionFilter)

      const res = await fetch(`/api/admin/logs?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setLogs(data.logs || [])
      setPagination(data.pagination)
      if (data.actionTypes) setActionTypes(data.actionTypes)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, actionFilter])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Logs d'activite</h1>
          <p className="text-muted-foreground">
            Historique des actions administratives
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1) }}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Type d'action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les actions</SelectItem>
              {actionTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {actionLabels[type] || type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <DataTable
            columns={columns}
            data={logs}
            loading={loading}
            loadingRows={10}
            showColumnToggle
            showPagination
            emptyMessage="Aucun log trouve"
            serverPagination={pagination ? {
              page: pagination.page,
              pageSize: pagination.limit,
              total: pagination.total,
              totalPages: pagination.totalPages,
              onPageChange: setPage,
              onPageSizeChange: (size) => {
                setPageSize(size)
                setPage(1)
              },
            } : undefined}
          />
        </CardContent>
      </Card>
    </div>
  )
}
