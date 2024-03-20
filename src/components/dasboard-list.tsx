import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { VideoInfo } from "@/lib/loader";
import { useStore } from "@/lib/store";
import { secondsToTimecode } from "@/lib/utils";
import { EnterIcon } from "@radix-ui/react-icons";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { FC } from "react";

const columnHelper = createColumnHelper<VideoInfo>();
const columns = [
  columnHelper.accessor("mid", {
    header: "ID",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("name", {
    header: "Name",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("chapter", {
    header: "Chapter",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("duration", {
    header: "Duration",
    cell: (info) => secondsToTimecode(info.getValue()),
  }),
  columnHelper.display({
    id: "progress",
    cell: ({ row }) => {
      const progress = row.original.keyMoments.reduce(
        (acc, cur) => acc + (cur.isReviewed ? 1 : 0),
        0,
      );
      const max = row.original.keyMoments.length;
      return (
        <div>
          {progress}/{max}
          <Progress value={(progress / max) * 100} />
        </div>
      );
    },
  }),
  columnHelper.display({
    id: "actions",
    cell: ({ row }) => {
      const { setEditMid } = useStore();
      return (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setEditMid(row.original.mid)}
          >
            <EnterIcon />
          </Button>
        </div>
      );
    },
  }),
];

export const DashboardList: FC = () => {
  const { state, save } = useStore();
  const data = Object.values(state);
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="p-4 space-y-2">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {!header.isPlaceholder &&
                      flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button onClick={save} size="sm">
          Save
        </Button>
      </div>
    </div>
  );
}
