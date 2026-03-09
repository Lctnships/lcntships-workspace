'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Eye, Edit, Ban } from 'lucide-react'
import { formatCurrency, formatTime, getInitials } from '@/lib/utils'
import type { BookingWithRelations } from '@/types'

interface BookingTableProps {
  bookings: BookingWithRelations[]
}

const statusColors = {
  pending: 'warning',
  confirmed: 'success',
  completed: 'secondary',
  cancelled: 'destructive',
} as const

export function BookingTable({ bookings }: BookingTableProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50/50">
            <TableHead>Customer</TableHead>
            <TableHead>Studio</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((booking) => (
            <TableRow key={booking.id} className="hover:bg-gray-50/50">
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gray-200 text-gray-900 text-xs">
                      {getInitials(booking.customer?.full_name || 'Unknown')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-gray-900">{booking.customer?.full_name}</p>
                    <p className="text-sm text-gray-500">{booking.customer?.email}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <p className="font-medium text-gray-900">{booking.studio?.name}</p>
                <p className="text-sm text-gray-500">{booking.studio?.city}</p>
              </TableCell>
              <TableCell>
                <span className="text-gray-900">{booking.date}</span>
              </TableCell>
              <TableCell>
                <span className="text-gray-600">
                  {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                </span>
              </TableCell>
              <TableCell>
                <span className="font-medium text-gray-900">
                  {formatCurrency(booking.subtotal || 0)}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant={statusColors[booking.status as keyof typeof statusColors]}>
                  {booking.status}
                </Badge>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Booking
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600">
                      <Ban className="h-4 w-4 mr-2" />
                      Cancel Booking
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
