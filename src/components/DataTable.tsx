// src/components/DataTable.tsx
import * as React from 'react'
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'

type Props<T> = {
  data: T[]
  columns: ColumnDef<T, any>[]
  height?: number
}

export default function DataTable<T>({ data, columns, height = 520 }: Props<T>) {
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() })
  return (
    <div className="border rounded-lg bg-white">
      <div className="overflow-auto" style={{ maxHeight: height }}>
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 sticky top-0">
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(h => (
                  <th key={h.id} className="text-left font-medium p-2 border-b">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(r => (
              <tr key={r.id} className="odd:bg-slate-50">
                {r.getVisibleCells().map(c => (
                  <td key={c.id} className="p-2 border-b">
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
