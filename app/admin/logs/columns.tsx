"use client"

import { ColumnDef } from "@tanstack/react-table"
import Link from "next/link"
import { format, formatDistanceToNow } from "date-fns"
import { fr } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"
import {
  Shield,
  Ban,
  Trash2,
  Image,
  Flag,
  CheckCircle,
} from "lucide-react"

export interface AdminLog {
  id: string
  actionType: string
  details: {
    reason?: string
    oldRole?: string
    newRole?: string
    [key: string]: unknown
  } | null
  ipAddress: string | null
  createdAt: string
  admin: {
    id: string
    name: string | null
    email: string
    role: string
  }
  targetUser: {
    id: string
    name: string | null
    email: string
  } | null
}

const actionIcons: Record<string, React.ReactNode> = {
  USER_SUSPENDED: <Ban className="h-4 w-4 text-yellow-600" />,
  USER_BANNED: <Ban className="h-4 w-4 text-red-600" />,
  USER_UNBANNED: <CheckCircle className="h-4 w-4 text-green-600" />,
  USER_DELETED: <Trash2 className="h-4 w-4 text-red-600" />,
  PHOTO_APPROVED: <Image className="h-4 w-4 text-green-600" />,
  PHOTO_REJECTED: <Image className="h-4 w-4 text-red-600" />,
  REPORT_RESOLVED: <Flag className="h-4 w-4 text-green-600" />,
  REPORT_DISMISSED: <Flag className="h-4 w-4 text-gray-600" />,
  ROLE_CHANGED: <Shield className="h-4 w-4 text-purple-600" />,
  SETTINGS_UPDATED: <Shield className="h-4 w-4 text-blue-600" />,
}

const actionLabels: Record<string, string> = {
  USER_SUSPENDED: "Utilisateur suspendu",
  USER_BANNED: "Utilisateur banni",
  USER_UNBANNED: "Utilisateur reactive",
  USER_DELETED: "Utilisateur supprime",
  PHOTO_APPROVED: "Photo approuvee",
  PHOTO_REJECTED: "Photo rejetee",
  REPORT_RESOLVED: "Signalement resolu",
  REPORT_DISMISSED: "Signalement rejete",
  ROLE_CHANGED: "Role modifie",
  SETTINGS_UPDATED: "Parametres modifies",
}

export { actionLabels }

export const columns: ColumnDef<AdminLog>[] = [
  {
    accessorKey: "actionType",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Action" />
    ),
    cell: ({ row }) => {
      const actionType = row.getValue("actionType") as string
      return (
        <div className="flex items-center gap-2">
          {actionIcons[actionType] || <Shield className="h-4 w-4" />}
          <span className="text-sm font-medium">
            {actionLabels[actionType] || actionType}
          </span>
        </div>
      )
    },
    filterFn: (row, id, value) => {
      return value === "all" || row.getValue(id) === value
    },
  },
  {
    accessorKey: "admin",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Admin" />
    ),
    cell: ({ row }) => {
      const admin = row.original.admin
      return (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {admin.role}
          </Badge>
          <Link
            href={`/admin/users/${admin.id}`}
            className="text-sm hover:underline"
          >
            {admin.name || admin.email}
          </Link>
        </div>
      )
    },
    enableSorting: false,
  },
  {
    accessorKey: "targetUser",
    header: "Cible",
    cell: ({ row }) => {
      const targetUser = row.original.targetUser
      if (!targetUser) {
        return <span className="text-muted-foreground">-</span>
      }
      return (
        <Link
          href={`/admin/users/${targetUser.id}`}
          className="text-sm hover:underline"
        >
          {targetUser.name || targetUser.email}
        </Link>
      )
    },
    enableSorting: false,
  },
  {
    accessorKey: "details",
    header: "Details",
    cell: ({ row }) => {
      const details = row.original.details
      if (!details) return null

      if (details.reason) {
        return (
          <span className="text-sm text-muted-foreground">
            {details.reason}
          </span>
        )
      }

      if (details.oldRole && details.newRole) {
        return (
          <span className="text-sm text-muted-foreground">
            {details.oldRole} → {details.newRole}
          </span>
        )
      }

      return null
    },
    enableSorting: false,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date" />
    ),
    cell: ({ row }) => {
      const date = row.getValue("createdAt") as string
      return (
        <div>
          <div className="text-sm">
            {format(new Date(date), "dd/MM/yyyy HH:mm", { locale: fr })}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr })}
          </div>
        </div>
      )
    },
  },
]
