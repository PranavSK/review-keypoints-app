import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KeyMoment, VideoInfo } from "@/lib/loader";
import { useStore } from "@/lib/store";
import { EnterIcon } from "@radix-ui/react-icons";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardList,
});

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
  columnHelper.display({
    id: "actions",
    cell: ({ row }) => (
      <div className="flex gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/dashboard/$mid" params={{ mid: row.original.mid }}>
            <EnterIcon />
          </Link>
        </Button>
      </div>
    ),
  }),
];

function DashboardList() {
  const { state, unparse } = useStore();
  const data = Object.values(state);
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const jsonl = unparse(
    data.reduce(
      (acc, info) => {
        acc[info.mid] = info.keyMoments;
        return acc;
      },
      {} as Record<string, KeyMoment[]>,
    ),
  );

  return (
    <div className="p-4 space-y-2">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
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
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <div className="flex justify-end">
        <Button asChild>
          <a
            href={`data:text/plain;charset=utf-8,${encodeURIComponent(jsonl)}`}
            download="tasks.jsonl"
          >
            Save
          </a>
        </Button>
      </div>
    </div>
  );
}
